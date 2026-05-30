/** 100 코인 = 1원 토스포인트 */
export const COIN_PER_WON = 100;

/** 농장 슬롯 (펫 동시 배치 수) */
export const FARM_SLOTS = 5;

/** 오프라인 누적 최대 시간 */
export const MAX_IDLE_HOURS = 8;

/** 일일 액션 한도 */
export const DAILY_LIMITS = {
  attendance: 1,   // 출석 보상
  egg: 3,          // 알 받기 (광고) — 일일 한도. 부족분은 IAP로 구매 가능
  game: 3,         // 먹이잡기 게임
  feed: FARM_SLOTS, // 펫당 1회 = 슬롯 수만큼
  exchange: 1,     // 토스포인트 교환
};

/** 교환 단위: 코인 → 토스포인트(원). 100:1 비율 유지 */
export const EXCHANGE_TIERS = [
  { coin: 10000, won: 100 },
  { coin: 50000, won: 500 },
  { coin: 100000, won: 1000 },
];

/** 알 부화 시간 (ms) */
export const HATCH_MS = {
  common: 30 * 60 * 1000, // 30분
  golden: 60 * 60 * 1000, // 1시간
};

/** 동시 부화 슬롯 */
export const HATCH_SLOTS = 3;

/** 진화석 소모량: 현재 단계 i에서 i+1로 진화 시 필요 개수 (아기→어린이 1, 어린이→청소년 2, 청소년→성인 3) */
export const EVOLVE_STONE_COST = [1, 2, 3];

/** 먹이주기 효과: 24시간 동안 생산량 배수 */
export const FEED_BUFF_MULTIPLIER = 1.5;
export const FEED_BUFF_MS = 24 * 60 * 60 * 1000;

/** 출석 보상 (알 1개) */
export const ATTENDANCE_REWARD_EGG = 1;

/** 먹이잡기 점수 → 코인 환산 (점수 × 이 값) */
export const GAME_COIN_PER_POINT = 2;

/** 먹이잡기 보너스 알 임계점수 */
export const GAME_BONUS_EGG_THRESHOLD = 30;
export const GAME_BONUS_EGG_CHANCE = 0.3;

/** 게임 먹이 점수 */
export const FOOD_POINTS = {
  carrot: 1,
  seed: 1,
  bone: 1,
  goldenApple: 3,
  bomb: -3,
};
