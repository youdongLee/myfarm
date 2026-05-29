"""
myfarm 마켓 자산 생성 스크립트.
- icon (600x600)
- thumbnail (1932x828)
- screenshot (1504x741)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')
OUT = ROOT

PRIMARY = (255, 184, 77)
PRIMARY_LIGHT = (255, 199, 107)
PRIMARY_DARK = (245, 158, 11)
CREAM = (255, 251, 235)
TEXT_PRIMARY = (25, 31, 40)
TEXT_SECONDARY = (78, 89, 104)
WHITE = (255, 255, 255)
GRASS = (197, 232, 155)
CARD_BORDER = (253, 230, 138)

FONT_REG = 'C:/Windows/Fonts/malgun.ttf'
FONT_BOLD = 'C:/Windows/Fonts/malgunbd.ttf'


# ---------- helpers ----------

def font(path, size):
    return ImageFont.truetype(path, size)


def vertical_gradient(size, top, bottom):
    w, h = size
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(h):
        t = y / max(h - 1, 1)
        arr[y, :] = [
            int(top[0] * (1 - t) + bottom[0] * t),
            int(top[1] * (1 - t) + bottom[1] * t),
            int(top[2] * (1 - t) + bottom[2] * t),
        ]
    return Image.fromarray(arr, 'RGB')


def horizontal_gradient(size, left, right):
    w, h = size
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for x in range(w):
        t = x / max(w - 1, 1)
        arr[:, x] = [
            int(left[0] * (1 - t) + right[0] * t),
            int(left[1] * (1 - t) + right[1] * t),
            int(left[2] * (1 - t) + right[2] * t),
        ]
    return Image.fromarray(arr, 'RGB')


def remove_white_bg(img, threshold=40):
    """4 코너에서 플러드필로 외곽 흰배경만 제거. 내부 흰색(코인 반짝임, 흰담비)은 보존."""
    img = img.convert('RGBA')
    rgb = img.convert('RGB').copy()
    w, h = rgb.size
    MARKER = (1, 2, 3)
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        cr, cg, cb = rgb.getpixel(corner)
        # 코너가 흰색일 때만 플러드필 (그렇지 않으면 의미 없음)
        if cr >= 230 and cg >= 230 and cb >= 230:
            ImageDraw.floodfill(rgb, corner, MARKER, thresh=threshold)
    arr_rgb = np.array(rgb)
    src = np.array(img)
    mask = (arr_rgb[:, :, 0] == MARKER[0]) & (arr_rgb[:, :, 1] == MARKER[1]) & (arr_rgb[:, :, 2] == MARKER[2])
    src[mask, 3] = 0
    return Image.fromarray(src, 'RGBA')


_cache_asset = {}

def load_asset(rel_path, target_h=None, target_w=None, transparent=True):
    key = (rel_path, target_h, target_w, transparent)
    if key in _cache_asset:
        return _cache_asset[key].copy()
    p = Image.open(os.path.join(ASSETS, rel_path)).convert('RGBA')
    if transparent:
        p = remove_white_bg(p)
    if target_h and not target_w:
        ratio = target_h / p.height
        p = p.resize((int(p.width * ratio), target_h), Image.LANCZOS)
    elif target_w and not target_h:
        ratio = target_w / p.width
        p = p.resize((target_w, int(p.height * ratio)), Image.LANCZOS)
    elif target_w and target_h:
        p = p.resize((target_w, target_h), Image.LANCZOS)
    _cache_asset[key] = p.copy()
    return p


def paste_centered(base, fg, cx, cy):
    fw, fh = fg.size
    base.alpha_composite(fg, (cx - fw // 2, cy - fh // 2))


def draw_paw(draw, cx, cy, scale=1.0, color=WHITE):
    s = scale
    main_w = int(220 * s)
    main_h = int(180 * s)
    by = cy + int(35 * s)
    draw.ellipse(
        [cx - main_w // 2, by - main_h // 2, cx + main_w // 2, by + main_h // 2],
        fill=color,
    )
    bulge = int(60 * s)
    draw.ellipse(
        [cx - main_w // 2 - bulge // 3, by - bulge // 2 + int(30 * s),
         cx - main_w // 2 + bulge, by + bulge // 2 + int(30 * s)],
        fill=color,
    )
    draw.ellipse(
        [cx + main_w // 2 - bulge, by - bulge // 2 + int(30 * s),
         cx + main_w // 2 + bulge // 3, by + bulge // 2 + int(30 * s)],
        fill=color,
    )
    toe_w = int(72 * s)
    toe_h = int(95 * s)
    toes = [(-110, -50), (-40, -115), (40, -115), (110, -50)]
    for dx, dy in toes:
        tx = cx + int(dx * s)
        ty = cy + int(dy * s)
        draw.ellipse(
            [tx - toe_w // 2, ty - toe_h // 2, tx + toe_w // 2, ty + toe_h // 2],
            fill=color,
        )


def draw_sparkle(draw, cx, cy, size, color=WHITE):
    s = size
    draw.polygon([(cx, cy - s), (cx + s // 3, cy), (cx, cy + s), (cx - s // 3, cy)], fill=color)
    draw.polygon([(cx - s, cy), (cx, cy - s // 3), (cx + s, cy), (cx, cy + s // 3)], fill=color)


def draw_bolt(draw, cx, cy, w=28, h=40, color=(255, 184, 77)):
    """번개 모양 (시간당 생산 아이콘)."""
    pts = [
        (cx + w // 6, cy - h // 2),
        (cx - w // 2, cy + 2),
        (cx - w // 8, cy + 2),
        (cx - w // 6, cy + h // 2),
        (cx + w // 2, cy - 4),
        (cx + w // 8, cy - 4),
    ]
    draw.polygon(pts, fill=color)


def draw_book(draw, cx, cy, w=36, h=30, color=(245, 158, 11)):
    """책 모양 (도감 아이콘)."""
    # 펼친 책 좌우
    draw.polygon([(cx - w // 2, cy - h // 2 + 3), (cx, cy - h // 2 + 1),
                  (cx, cy + h // 2), (cx - w // 2, cy + h // 2 - 2)], fill=color)
    draw.polygon([(cx + w // 2, cy - h // 2 + 3), (cx, cy - h // 2 + 1),
                  (cx, cy + h // 2), (cx + w // 2, cy + h // 2 - 2)], fill=color)
    # 가운데 세로선
    draw.line([(cx, cy - h // 2 + 1), (cx, cy + h // 2 - 1)], fill=WHITE, width=2)


def draw_controller(draw, cx, cy, w=42, h=26, color=(245, 158, 11)):
    """게임패드 단순 모양."""
    draw.rounded_rectangle([cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2],
                           radius=10, fill=color)
    # 십자 + 버튼
    draw.rectangle([cx - w // 2 + 7, cy - 2, cx - w // 2 + 14, cy + 2], fill=WHITE)
    draw.rectangle([cx - w // 2 + 10, cy - 5, cx - w // 2 + 13, cy + 5], fill=WHITE)
    draw.ellipse([cx + w // 2 - 12, cy - 4, cx + w // 2 - 6, cy + 2], fill=WHITE)
    draw.ellipse([cx + w // 2 - 8, cy + 1, cx + w // 2 - 2, cy + 7], fill=WHITE)


# ---------- 1. icon ----------

# 아이콘 메인 펫 — 다른 펫으로 바꾸려면 이 줄만 교체:
# pet_dog / pet_cat / pet_chick / pet_parrot / pet_chinchilla / pet_gecko / pet_ferret / pet_pig
ICON_PET = 'pet_dog.png'

def build_icon():
    SIZE = 600
    base = vertical_gradient((SIZE, SIZE), PRIMARY_LIGHT, PRIMARY).convert('RGBA')
    draw = ImageDraw.Draw(base)

    # 펫 (배경 제거 + 약 440px 높이로 중앙 배치, 원형 그리드 380~450 권장 영역 내)
    cx, cy = SIZE // 2, SIZE // 2 + 10
    pet = load_asset(os.path.join('pets', ICON_PET), target_h=440)
    paste_centered(base, pet, cx, cy + 20)

    # 우상단 작은 흰 스파클 (장식)
    draw_sparkle(draw, 470, 130, 22, color=WHITE)
    draw_sparkle(draw, 510, 175, 14, color=WHITE)

    # 좌하단 작은 하트 (반려동물 정서)
    heart_cx, heart_cy = 120, 510
    heart_size = 22
    # 두 원 + 삼각형으로 하트
    draw.ellipse([heart_cx - heart_size, heart_cy - heart_size // 2,
                  heart_cx, heart_cy + heart_size // 2], fill=WHITE)
    draw.ellipse([heart_cx, heart_cy - heart_size // 2,
                  heart_cx + heart_size, heart_cy + heart_size // 2], fill=WHITE)
    draw.polygon([(heart_cx - heart_size + 1, heart_cy + 3),
                  (heart_cx + heart_size - 1, heart_cy + 3),
                  (heart_cx, heart_cy + heart_size + 6)], fill=WHITE)

    out = os.path.join(OUT, 'myfarm_icon_600x600.png')
    base.convert('RGB').save(out, 'PNG', optimize=True)
    print(f'[icon] saved {out}')


# ---------- 2. thumbnail ----------

def build_thumbnail():
    W, H = 1932, 828
    base = horizontal_gradient((W, H), (255, 233, 176), (255, 213, 128)).convert('RGBA')
    draw = ImageDraw.Draw(base)

    # 상단 구름
    for cx, cy, r in [(280, 110, 50), (340, 80, 60), (760, 140, 45), (820, 110, 55), (1300, 90, 40)]:
        draw.ellipse([cx - r, cy - r, cx + r * 2, cy + r], fill=(255, 255, 255, 230))

    # 태양
    sun_cx, sun_cy, sun_r = 1760, 130, 65
    draw.ellipse([sun_cx - sun_r, sun_cy - sun_r, sun_cx + sun_r, sun_cy + sun_r],
                 fill=(255, 217, 61, 255))
    for ang in range(0, 360, 30):
        import math
        a = math.radians(ang)
        x1 = sun_cx + int((sun_r + 8) * math.cos(a))
        y1 = sun_cy + int((sun_r + 8) * math.sin(a))
        x2 = sun_cx + int((sun_r + 22) * math.cos(a))
        y2 = sun_cy + int((sun_r + 22) * math.sin(a))
        draw.line([(x1, y1), (x2, y2)], fill=(255, 217, 61, 255), width=8)

    # 잔디 라인
    grass_top = int(H * 0.78)
    draw.rectangle([0, grass_top, W, H], fill=(197, 232, 155, 255))
    import math
    for i in range(25):
        x0 = i * 80 + 10
        draw.polygon([(x0, grass_top + 8), (x0 + 5, grass_top - 12), (x0 + 10, grass_top + 8)],
                     fill=(170, 210, 130, 255))

    # 좌측 텍스트
    f_head = font(FONT_BOLD, 112)
    f_sub = font(FONT_REG, 44)
    f_tag = font(FONT_BOLD, 34)

    pad_x = 110
    y = 170
    draw.text((pad_x, y), '귀여운 펫을 모으고', font=f_head, fill=TEXT_PRIMARY)
    draw.text((pad_x, y + 132), '코인을 받아요', font=f_head, fill=PRIMARY_DARK)
    draw.text((pad_x, y + 284), '8종의 펫과 함께하는 미니 농장', font=f_sub, fill=TEXT_SECONDARY)

    # 좌측 하단 발바닥 배지 + 앱명
    badge_cx, badge_cy = pad_x + 38, y + 430
    draw.ellipse([badge_cx - 42, badge_cy - 42, badge_cx + 42, badge_cy + 42],
                 fill=PRIMARY)
    draw_paw(draw, badge_cx, badge_cy + 4, scale=0.2, color=WHITE)
    draw.text((badge_cx + 60, badge_cy - 20), '반려동물 모으기', font=f_tag, fill=TEXT_PRIMARY)

    # 우측: 펫 8마리 두 줄 배치
    pet_files = ['pet_dog.png', 'pet_cat.png', 'pet_chick.png', 'pet_parrot.png',
                 'pet_chinchilla.png', 'pet_gecko.png', 'pet_ferret.png', 'pet_pig.png']
    base_pet_h = 230
    back_row = pet_files[:5]
    front_row = pet_files[5:]
    right_x0 = 980
    right_w = W - right_x0 - 60

    bw = right_w // len(back_row)
    for i, name in enumerate(back_row):
        pet = load_asset(os.path.join('pets', name), target_h=int(base_pet_h * 0.85))
        cx = right_x0 + bw // 2 + i * bw
        cy = grass_top - 30
        paste_centered(base, pet, cx, cy)

    fw = right_w // (len(front_row) + 1)
    for i, name in enumerate(front_row):
        pet = load_asset(os.path.join('pets', name), target_h=base_pet_h)
        cx = right_x0 + fw + i * fw
        cy = grass_top + 70
        paste_centered(base, pet, cx, cy)

    # 코인 (그림자 + 크게)
    def paste_with_shadow(img, cx, cy, blur=8, offset=4, alpha=80):
        sh = Image.new('RGBA', (img.size[0] + 20, img.size[1] + 20), (0, 0, 0, 0))
        ShadowDraw = ImageDraw.Draw(sh)
        ShadowDraw.ellipse([10, 10, img.size[0] + 10, img.size[1] + 10], fill=(0, 0, 0, alpha))
        sh = sh.filter(ImageFilter.GaussianBlur(radius=blur))
        base.alpha_composite(sh, (cx - img.size[0] // 2 - 10, cy - img.size[1] // 2 - 10 + offset))
        paste_centered(base, img, cx, cy)

    coin_big = load_asset(os.path.join('items', 'coin.png'), target_h=130)
    coin_mid = load_asset(os.path.join('items', 'coin.png'), target_h=95)
    coin_sm = load_asset(os.path.join('items', 'coin.png'), target_h=80)
    paste_with_shadow(coin_big, 1180, 260)
    paste_with_shadow(coin_mid, 1440, 180)
    paste_with_shadow(coin_sm, 1620, 360)

    # 큰 알 (태양 옆쪽으로 이동)
    egg = load_asset(os.path.join('items', 'egg_common.png'), target_h=220)
    paste_with_shadow(egg, 1330, 410, blur=10, offset=6, alpha=60)

    out = os.path.join(OUT, 'myfarm_thumb_wide_1932x828.png')
    base.convert('RGB').save(out, 'PNG', optimize=True)
    print(f'[thumbnail] saved {out}')


# ---------- 3. screenshot ----------

def build_screenshot():
    W, H = 1504, 741
    base = Image.new('RGBA', (W, H), CREAM)
    draw = ImageDraw.Draw(base)

    # ===== 좌측 폰 목업 =====
    phone_w, phone_h = 380, 660
    phone_x = 100
    phone_y = (H - phone_h) // 2

    # 그림자
    shadow = Image.new('RGBA', (phone_w + 40, phone_h + 40), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle([0, 0, phone_w + 40, phone_h + 40], radius=60,
                             fill=(0, 0, 0, 50))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=15))
    base.alpha_composite(shadow, (phone_x - 20, phone_y - 10))

    # 폰 프레임
    draw.rounded_rectangle([phone_x, phone_y, phone_x + phone_w, phone_y + phone_h],
                           radius=46, fill=WHITE, outline=(229, 231, 235, 255), width=2)

    sx = phone_x + 14
    sy = phone_y + 18
    sw = phone_w - 28
    sh = phone_h - 36
    # 화면 배경
    draw.rounded_rectangle([sx, sy, sx + sw, sy + sh], radius=34, fill=CREAM)

    # 상단 헤더
    header_h = 60
    f_app = font(FONT_BOLD, 22)
    draw.text((sx + 22, sy + 22), '반려동물 모으기', font=f_app, fill=TEXT_PRIMARY)

    # 통계 카드 3개 (코인/알/번개)
    stat_y = sy + header_h + 12
    stat_h = 80
    gap = 6
    card_w = (sw - 2 * gap - 24) // 3
    f_stat_v = font(FONT_BOLD, 17)
    f_stat_l = font(FONT_REG, 11)
    for i, label in enumerate(['코인', '알', '시간당']):
        cx0 = sx + 12 + i * (card_w + gap)
        draw.rounded_rectangle([cx0, stat_y, cx0 + card_w, stat_y + stat_h],
                                radius=12, fill=WHITE, outline=CARD_BORDER, width=1)
        # 아이콘
        icon_cx = cx0 + card_w // 2
        if label == '코인':
            ic = load_asset(os.path.join('items', 'coin.png'), target_h=28)
            paste_centered(base, ic, icon_cx, stat_y + 22)
            val = '1,240'
        elif label == '알':
            ic = load_asset(os.path.join('items', 'egg_common.png'), target_h=28)
            paste_centered(base, ic, icon_cx, stat_y + 22)
            val = '3'
        else:
            draw_bolt(draw, icon_cx, stat_y + 22, w=24, h=30, color=PRIMARY_DARK)
            val = '8.5'
        # 값 + 레이블 (가운데 정렬)
        vbox = draw.textbbox((0, 0), val, font=f_stat_v)
        draw.text((icon_cx - (vbox[2] - vbox[0]) // 2, stat_y + 44), val,
                  font=f_stat_v, fill=TEXT_PRIMARY)
        lbox = draw.textbbox((0, 0), label, font=f_stat_l)
        draw.text((icon_cx - (lbox[2] - lbox[0]) // 2, stat_y + 64), label,
                  font=f_stat_l, fill=TEXT_SECONDARY)

    # 농장 영역
    farm_y = stat_y + stat_h + 12
    farm_h = 200
    farm_bg = Image.open(os.path.join(ASSETS, 'ui', 'farm_bg.png')).convert('RGBA')
    farm_bg = farm_bg.resize((sw - 24, farm_h), Image.LANCZOS)
    mask = Image.new('L', farm_bg.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, farm_bg.size[0], farm_bg.size[1]],
                                            radius=14, fill=255)
    farm_canvas = Image.new('RGBA', farm_bg.size, (0, 0, 0, 0))
    farm_canvas.paste(farm_bg, (0, 0), mask)
    base.alpha_composite(farm_canvas, (sx + 12, farm_y))

    # 펫 5마리
    pet_imgs = ['pet_dog.png', 'pet_cat.png', 'pet_chick.png', 'pet_parrot.png', 'pet_pig.png']
    pet_h = 78
    pet_y_base = farm_y + farm_h - 28
    pet_count = len(pet_imgs)
    spacing = (sw - 60) // pet_count
    for i, pn in enumerate(pet_imgs):
        p = load_asset(os.path.join('pets', pn), target_h=pet_h)
        px_ = sx + 30 + i * spacing + spacing // 2
        paste_centered(base, p, px_, pet_y_base)

    # 수확 버튼
    btn_y = farm_y + farm_h + 12
    btn_h = 64
    draw.rounded_rectangle([sx + 12, btn_y, sx + sw - 12, btn_y + btn_h],
                           radius=16, fill=PRIMARY)
    # 좌측 작은 코인 아이콘
    ic = load_asset(os.path.join('items', 'coin.png'), target_h=32)
    paste_centered(base, ic, sx + 36, btn_y + btn_h // 2)
    f_btn = font(FONT_BOLD, 16)
    f_btn_sub = font(FONT_REG, 11)
    draw.text((sx + 62, btn_y + 14), '코인 수확하기', font=f_btn, fill=WHITE)
    draw.text((sx + 62, btn_y + 38), '+120 코인 대기 중', font=f_btn_sub, fill=(255, 255, 255, 230))

    # 액션 타일 4개
    tile_y = btn_y + btn_h + 12
    tile_h = 70
    tw = (sw - 24 - 8) // 2
    f_tile = font(FONT_BOLD, 13)
    tiles_def = [
        ('egg', '알 받기'),
        ('game', '먹이잡기'),
        ('book', '도감'),
        ('coin', '교환'),
    ]
    for i, (kind, lbl) in enumerate(tiles_def):
        row = i // 2
        col = i % 2
        tx0 = sx + 12 + col * (tw + 8)
        ty0 = tile_y + row * (tile_h + 6)
        draw.rounded_rectangle([tx0, ty0, tx0 + tw, ty0 + tile_h],
                                radius=12, fill=WHITE, outline=CARD_BORDER, width=1)
        icon_cx, icon_cy = tx0 + 28, ty0 + tile_h // 2
        if kind == 'egg':
            paste_centered(base, load_asset(os.path.join('items', 'egg_common.png'), target_h=36), icon_cx, icon_cy)
        elif kind == 'coin':
            paste_centered(base, load_asset(os.path.join('items', 'coin.png'), target_h=36), icon_cx, icon_cy)
        elif kind == 'game':
            paste_centered(base, load_asset(os.path.join('items', 'food_carrot.png'), target_h=36), icon_cx, icon_cy)
        elif kind == 'book':
            draw_book(draw, icon_cx, icon_cy, w=34, h=28, color=PRIMARY_DARK)
        draw.text((tx0 + 58, ty0 + 26), lbl, font=f_tile, fill=TEXT_PRIMARY)

    # ===== 우측 텍스트 =====
    rx = 620
    f_head = font(FONT_BOLD, 64)
    f_feat_t = font(FONT_BOLD, 28)

    head_y = 110
    draw.text((rx, head_y), '키우면 키울수록', font=f_head, fill=TEXT_PRIMARY)
    draw.text((rx, head_y + 80), '코인이 쌓여요', font=f_head, fill=PRIMARY_DARK)

    feat_y = head_y + 220
    features = [
        ('egg', '8종의 귀여운 펫을 모아보세요'),
        ('bolt', '농장에 두면 시간당 코인 자동 생산'),
        ('coin', '100코인을 토스포인트로 교환'),
    ]
    for i, (kind, txt) in enumerate(features):
        y = feat_y + i * 95
        draw.ellipse([rx, y, rx + 64, y + 64], fill=PRIMARY)
        icx, icy = rx + 32, y + 32
        if kind == 'egg':
            paste_centered(base, load_asset(os.path.join('items', 'egg_common.png'), target_h=40), icx, icy)
        elif kind == 'coin':
            paste_centered(base, load_asset(os.path.join('items', 'coin.png'), target_h=40), icx, icy)
        elif kind == 'bolt':
            draw_bolt(draw, icx, icy, w=28, h=40, color=WHITE)
        draw.text((rx + 88, y + 16), txt, font=f_feat_t, fill=TEXT_PRIMARY)

    out = os.path.join(OUT, 'myfarm_screenshot_1504x741.png')
    base.convert('RGB').save(out, 'PNG', optimize=True)
    print(f'[screenshot] saved {out}')


if __name__ == '__main__':
    build_icon()
    build_thumbnail()
    build_screenshot()
    print('All assets generated.')
