import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';

/**
 * 보상형 광고를 ID 체인 폴백으로 로드 후 노출.
 * - 미지원 환경 or TEST_ 플레이스홀더 ID → onReward 즉시 실행 (dev grant)
 * - userEarnedReward 이벤트 시에만 onReward 호출 (지급 누락 방지)
 * - safety timeout 은 pre-show 구간(10초)만 적용
 */
export async function runRewardAd(
  adIds: string[],
  onReward: () => Promise<void> | void,
): Promise<boolean> {
  const isDev = adIds[0]?.startsWith('TEST_') || !loadFullScreenAd.isSupported();
  if (isDev) {
    await onReward();
    return true;
  }

  for (let i = 0; i < adIds.length; i++) {
    const adId = adIds[i];
    const loaded = await new Promise<boolean>((resolve) => {
      let settled = false;
      const unregister = loadFullScreenAd({
        options: { adGroupId: adId },
        onEvent: (e: any) => {
          if (e.type === 'loaded' && !settled) {
            settled = true;
            resolve(true);
          }
        },
        onError: () => {
          if (!settled) {
            settled = true;
            resolve(false);
          }
        },
      });
      setTimeout(() => {
        if (!settled) {
          settled = true;
          try { unregister(); } catch {}
          resolve(false);
        }
      }, 10000);
    });

    if (!loaded) continue;

    const rewarded = await new Promise<boolean>((resolve) => {
      let settled = false;
      showFullScreenAd({
        options: { adGroupId: adId },
        onEvent: async (e: any) => {
          if (e.type === 'userEarnedReward' && !settled) {
            settled = true;
            await onReward();
            resolve(true);
          } else if (e.type === 'dismissed' && !settled) {
            settled = true;
            resolve(false);
          }
        },
        onError: () => {
          if (!settled) {
            settled = true;
            resolve(false);
          }
        },
      });
    });
    return rewarded;
  }
  return false;
}
