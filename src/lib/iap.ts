import { IAP } from '@apps-in-toss/framework';

export interface RemoteProduct {
  sku: string;
  displayName: string;
  displayAmount: string;
}

/** 콘솔 등록 상품 중 지정된 SKU 집합만 추려 반환 (미지원/미등록이면 빈 배열) */
export async function fetchProducts(allowedSkus: Set<string>): Promise<RemoteProduct[]> {
  try {
    const res = await IAP.getProductItemList();
    const products = (res?.products ?? []) as any[];
    return products
      .filter((p) => allowedSkus.has(p.sku))
      .map((p) => ({ sku: p.sku, displayName: p.displayName, displayAmount: p.displayAmount }));
  } catch {
    return [];
  }
}

/**
 * 단일 인앱결제 상품 구매.
 * processProductGrant 콜백에서 onGrant 호출 → true 반환으로 결제 완료.
 */
export function purchaseProduct(
  sku: string,
  onGrant: (orderId: string) => Promise<void>,
  onDone: () => void,
  onError: (e: unknown) => void,
): void {
  let cleanup: (() => void) | undefined;
  cleanup = IAP.createOneTimePurchaseOrder({
    options: {
      sku,
      processProductGrant: async ({ orderId }: { orderId: string }) => {
        await onGrant(orderId);
        return true;
      },
    },
    onEvent: () => {
      cleanup?.();
      onDone();
    },
    onError: (e: unknown) => {
      cleanup?.();
      onError(e);
    },
  });
}

/** 결제됐으나 지급 안 된 미결 주문 전체 조회 */
export async function getPendingOrders(): Promise<{ orderId: string; sku: string }[]> {
  try {
    const res = await IAP.getPendingOrders();
    return (res?.orders ?? []) as { orderId: string; sku: string }[];
  } catch {
    return [];
  }
}

/** 미결 주문 지급 완료 처리 */
export async function completeOrder(orderId: string): Promise<void> {
  try {
    await IAP.completeProductGrant({ params: { orderId } });
  } catch {
    // 무시 (다음 앱 시작 시 재시도됨)
  }
}
