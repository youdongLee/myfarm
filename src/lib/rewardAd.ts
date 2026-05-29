import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';

/** 개발용 광고 스킵 플래그 (dev 패널 토글). 기본 false = 실제 광고 재생 */
let _skipAds = false;
export function setRewardAdSkip(v: boolean): void { _skipAds = v; }
export function getRewardAdSkip(): boolean { return _skipAds; }

/**
 * 보상형 광고를 ID 체인 폴백으로 로드 후 노출.
 * - dev 스킵 토글 ON → onReward 즉시 실행 (광고 없이 테스트)
 * - 광고 미지원 환경 → false 반환 (지급 안 함)
 * - userEarnedReward 이벤트 시에만 onReward 호출 (지급 누락 방지)
 * - safety timeout 은 pre-show 구간(10초)만 적용
 */
export async function runRewardAd(
  adIds: string[],
  onReward: () => Promise<void> | void,
): Promise<boolean> {
  if (_skipAds) {
    await onReward();
    return true;
  }
  if (!loadFullScreenAd.isSupported()) {
    return false;
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
