"""
PNG 자산을 display 크기로 리사이즈 + 압축 후 base64 인라인.
출력: src/constants/imageData.ts
"""
import base64
import io
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')
OUT = os.path.join(ROOT, 'src', 'constants', 'imageData.ts')

# (relative_path, key, max_dim_px, fmt)
ASSETS_TABLE = [
    # pets — 농장/도감에서 80~90px 표시 → 220px (PNG로 투명 유지)
    ('pets/pet_dog.png',        'pet_dog',        220, 'PNG'),
    ('pets/pet_cat.png',        'pet_cat',        220, 'PNG'),
    ('pets/pet_chick.png',      'pet_chick',      220, 'PNG'),
    ('pets/pet_parrot.png',     'pet_parrot',     220, 'PNG'),
    ('pets/pet_chinchilla.png', 'pet_chinchilla', 220, 'PNG'),
    ('pets/pet_gecko.png',      'pet_gecko',      220, 'PNG'),
    ('pets/pet_ferret.png',     'pet_ferret',     220, 'PNG'),
    ('pets/pet_pig.png',        'pet_pig',        220, 'PNG'),
    # items — 30~50px 표시 → 100px
    ('items/coin.png',              'coin',              100, 'PNG'),
    ('items/egg_common.png',        'egg_common',        100, 'PNG'),
    ('items/food_carrot.png',       'food_carrot',       100, 'PNG'),
    ('items/food_seed.png',         'food_seed',         100, 'PNG'),
    ('items/food_bone.png',         'food_bone',         100, 'PNG'),
    ('items/food_golden_apple.png', 'food_golden_apple', 100, 'PNG'),
    ('items/food_bomb.png',         'food_bomb',         100, 'PNG'),
    # ui — farm 배경 JPEG (투명도 불필요), 정사각형 표시이므로 해상도 좀 키움
    ('ui/farm_bg.png',    'farm_bg',    720, 'JPEG'),
    ('ui/nest_empty.png', 'nest_empty', 120, 'PNG'),
    # hats — 진화 단계 모자 오버레이. 이미 투명(rembg) → strip_bg=False
    ('hats/hat_child.png', 'hat_child', 220, 'PNG', False),
    ('hats/hat_teen.png',  'hat_teen',  220, 'PNG', False),
    ('hats/hat_adult.png', 'hat_adult', 220, 'PNG', False),
]


def remove_white_bg(img, threshold=18, soften_radius=0.8):
    """4 코너에서 플러드필로 외곽 흰배경만 제거.

    - threshold 낮춤(18): 크림색 본체(예: 알, 둥지 내부)는 보존
    - soften_radius: 알파 채널 블러로 흰 fringe 완화
    """
    img = img.convert('RGBA')
    rgb = img.convert('RGB').copy()
    w, h = rgb.size
    MARKER = (1, 2, 3)
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        cr, cg, cb = rgb.getpixel(corner)
        if cr >= 230 and cg >= 230 and cb >= 230:
            ImageDraw.floodfill(rgb, corner, MARKER, thresh=threshold)
    arr_rgb = np.array(rgb)
    src = np.array(img)
    mask = (arr_rgb[:, :, 0] == MARKER[0]) & (arr_rgb[:, :, 1] == MARKER[1]) & (arr_rgb[:, :, 2] == MARKER[2])
    src[mask, 3] = 0

    # 가장자리 흰 fringe 완화: 알파만 살짝 블러
    if soften_radius > 0:
        alpha = Image.fromarray(src[:, :, 3], 'L').filter(ImageFilter.GaussianBlur(radius=soften_radius))
        src[:, :, 3] = np.array(alpha)
    return Image.fromarray(src, 'RGBA')


def encode(path, max_dim, fmt='PNG', jpeg_quality=90, strip_bg=True):
    """fmt='PNG' (투명도 유지) 또는 'JPEG' (작지만 투명도 X). strip_bg=True면 흰배경 제거."""
    img = Image.open(path).convert('RGBA')
    if strip_bg and fmt == 'PNG':
        img = remove_white_bg(img)
    w, h = img.size
    if max(w, h) > max_dim:
        ratio = max_dim / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    if fmt == 'JPEG':
        img = img.convert('RGB')
        img.save(buf, format='JPEG', optimize=True, quality=jpeg_quality)
        mime = 'image/jpeg'
    else:
        img.save(buf, format='PNG', optimize=True)
        mime = 'image/png'
    data = buf.getvalue()
    b64 = base64.b64encode(data).decode('ascii')
    return b64, len(data), img.size, mime


def main():
    lines = [
        '/**',
        ' * 자산 base64 인라인 (granite Image가 require() 미지원이라 data URI로 우회).',
        ' * 재생성: python scripts/inline_assets.py',
        ' */',
        'export const IMG: Record<string, { uri: string }> = {',
    ]
    total_raw = 0
    total_b64 = 0
    print(f'{"key":<20} {"size":<12} {"fmt":<5} {"raw KB":>8} {"b64 KB":>8}')
    for entry in ASSETS_TABLE:
        rel, key, max_dim, fmt = entry[:4]
        strip = entry[4] if len(entry) > 4 else True
        full = os.path.join(ASSETS, rel)
        b64, raw_bytes, (w, h), mime = encode(full, max_dim, fmt=fmt, strip_bg=strip)
        b64_bytes = len(b64)
        total_raw += raw_bytes
        total_b64 += b64_bytes
        print(f'{key:<20} {w}x{h:<6} {fmt:<5} {raw_bytes / 1024:>8.1f} {b64_bytes / 1024:>8.1f}')
        lines.append(f"  {key}: {{ uri: 'data:{mime};base64,{b64}' }},")
    lines.append('};')
    lines.append('')
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines))
    print()
    print(f'Total raw: {total_raw / 1024:.1f} KB')
    print(f'Total b64: {total_b64 / 1024:.1f} KB')
    print(f'Wrote: {OUT}')


if __name__ == '__main__':
    main()
