import { IAP } from '@apps-in-toss/framework';
import { STONE_BY_SKU } from '../constants/iap';

export interface RemoteStoneProduct {
  sku: string;
  displayName: string;
  displayAmount: string;
}

/** 콘솔 등록된 상품 중 진화석 SKU만 조회 (미지원/미등록이면 빈 배열) */
export async function fetchStoneProducts(): Promise<RemoteStoneProduct[]> {
  try {
    const res = await IAP.getProductItemList();
    const products = (res?.products ?? []) as any[];
    return products
      .filter((p) => p.sku in STONE_BY_SKU)
      .map((p) => ({ sku: p.sku, displayName: p.displayName, displayAmount: p.displayAmount }));
  } catch {
    return [];
  }
}

/**
 * 진화석 구매. 결제 성공 시 processProductGrant에서 grant(개수) 호출 후 true 반환.
 * onDone: 결제+지급 완료(success), onError: 실패/취소.
 */
export function purchaseStone(
  sku: string,
  grant: (n: number) => Promise<void>,
  onDone: () => void,
  onError: (e: unknown) => void,
): void {
  let cleanup: (() => void) | undefined;
  cleanup = IAP.createOneTimePurchaseOrder({
    options: {
      sku,
      processProductGrant: async ({ orderId }: { orderId: string }) => {
        const n = STONE_BY_SKU[sku] ?? 0;
        if (n > 0) await grant(n);
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

/**
 * 결제됐으나 지급 안 된 미결 주문 조회 (앱 시작 시). sku→지급 개수로 환산해 반환.
 * 호출측은 (1) 개수를 상태에 더해 저장 후 (2) completeStoneOrder로 완료 처리해야 함
 * (순서 중요: 지급 저장 → 완료 처리, 그래야 중간 실패 시 결제분이 유실되지 않음).
 */
export async function getPendingStoneOrders(): Promise<{ orderId: string; stones: number }[]> {
  try {
    const res = await IAP.getPendingOrders();
    const orders = (res?.orders ?? []) as { orderId: string; sku: string }[];
    return orders.map((o) => ({ orderId: o.orderId, stones: STONE_BY_SKU[o.sku] ?? 0 }));
  } catch {
    return [];
  }
}

/** 미결 주문 지급 완료 처리 */
export async function completeStoneOrder(orderId: string): Promise<void> {
  try {
    await IAP.completeProductGrant({ params: { orderId } });
  } catch {
    // 무시 (다음 앱 시작 시 재시도됨)
  }
}
