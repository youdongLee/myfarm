/**
 * 광고 슬롯 ID (콘솔 발급 실 ID).
 * 보상형은 폴백 체인(배열) — runRewardAd가 앞에서부터 로드 시도, 실패 시 다음 ID.
 */

// 보상형 (Reward) — 슬롯별 3단 폴백 체인
export const AD_HARVEST = [
  'ait.v2.live.e70600c70e1d4807',
  'ait.v2.live.651c3c90215d4eb6',
  'ait.v2.live.1055aa6cef9048d7',
];
export const AD_FEED = [
  'ait.v2.live.a3ce37e7c7cf42b3',
  'ait.v2.live.ad5fdf36534c4ebf',
  'ait.v2.live.4cf563a609d749bc',
];
export const AD_PET = [
  'ait.v2.live.9eb89012c76d4d1b',
  'ait.v2.live.6f0c197a155145e4',
  'ait.v2.live.e1ab4719a2d94492',
];
export const AD_EGG = [
  'ait.v2.live.8eca35579def4c66',
  'ait.v2.live.5dfaaaf37ca24f82',
  'ait.v2.live.209fa9159a4f4458',
];
export const AD_HATCH = [
  'ait.v2.live.ed2d4766fed84be9',
  'ait.v2.live.f8a3e7e7eb9148d9',
  'ait.v2.live.5054835aaa344f26',
];
export const AD_GAME = [
  'ait.v2.live.1c2bcfd95b5d4b34',
  'ait.v2.live.aacaf5b861c44bf5',
  'ait.v2.live.21021a8b83274708',
];

// 인라인 배너 / 이미지 (홈·도감 배너는 동일 배너 그룹 공유)
export const BANNER_HOME = 'ait.v2.live.cfd9000b6a4e420a';
export const BANNER_DEX = 'ait.v2.live.cfd9000b6a4e420a';
export const IMG_GUIDE = 'ait.v2.live.ccb385a49e074709';
