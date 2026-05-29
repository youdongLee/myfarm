/**
 * 진화석 인앱결제 상품.
 * sku는 앱인토스 콘솔에 등록한 상품 ID로 교체해야 함 (TEST_ = 미등록 플레이스홀더).
 * stones = 결제 성공 시 지급할 진화석 개수. sku와 반드시 매칭 유지.
 */
export interface StoneProduct {
  sku: string;
  stones: number;
  label: string;
}

export const STONE_PRODUCTS: StoneProduct[] = [
  { sku: 'TEST_STONE_1', stones: 1, label: '진화석 1개' },
  { sku: 'TEST_STONE_5', stones: 5, label: '진화석 5개' },
  { sku: 'TEST_STONE_12', stones: 12, label: '진화석 12개' },
];

export const STONE_BY_SKU: Record<string, number> = STONE_PRODUCTS.reduce(
  (m, p) => {
    m[p.sku] = p.stones;
    return m;
  },
  {} as Record<string, number>,
);
