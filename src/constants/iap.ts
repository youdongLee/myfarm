/**
 * 진화석 인앱결제 상품.
 * sku = 앱인토스 콘솔에 등록한 실제 상품 ID (콘솔 발급 `ait.xxxx` 형식).
 * stones = 결제 성공 시 지급할 진화석 개수. sku와 반드시 매칭 유지.
 */
export interface StoneProduct {
  sku: string;
  stones: number;
  label: string;
}

export const STONE_PRODUCTS: StoneProduct[] = [
  { sku: 'ait.0000036186.a30169d0.7639cdcfb6.0064568220', stones: 1, label: '진화석 1개' },
  { sku: 'ait.0000036186.216496f1.af3d6ca785.0064602568', stones: 5, label: '진화석 5개' },
  { sku: 'ait.0000036186.2aaa439e.03937ba063.0064641790', stones: 12, label: '진화석 12개' },
];

export const STONE_BY_SKU: Record<string, number> = STONE_PRODUCTS.reduce(
  (m, p) => {
    m[p.sku] = p.stones;
    return m;
  },
  {} as Record<string, number>,
);
