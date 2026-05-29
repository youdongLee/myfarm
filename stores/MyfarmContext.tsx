import { Storage } from '@apps-in-toss/framework';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ATTENDANCE_REWARD_EGG,
  DAILY_LIMITS,
  EVOLVE_STONE_COST,
  FARM_SLOTS,
  FEED_BUFF_MS,
  FEED_BUFF_MULTIPLIER,
  HATCH_MS,
  HATCH_SLOTS,
  MAX_IDLE_HOURS,
} from '../src/constants/economy';
import {
  MAX_STAGE,
  MAX_STAR,
  PETS,
  PET_MAP,
  RARITY_WEIGHT,
  Rarity,
  STAGE_MULTIPLIER,
} from '../src/constants/pets';
import { completeStoneOrder, getPendingStoneOrders } from '../src/lib/stoneIap';

type ActionKey = 'attendance' | 'egg' | 'game' | 'feed' | 'exchange';

interface DailyCounts {
  date: string; // KST YYYYMMDD
  attendance: number;
  egg: number;
  game: number;
  feed: number;
  exchange: number;
}

interface HatchSlot {
  startedAt: number;
  type: 'common';
}

interface PersistState {
  version: number;
  coins: number;
  totalEarnedWon: number;
  ownedStars: Record<string, number>; // petId → 1..5 (없으면 0)
  petStages: Record<string, number>; // petId → 0(아기)~3(성인), 없으면 0
  evolveStones: number; // 진화석 보유량 (IAP로 충전 예정)
  farmPets: (string | null)[]; // length = FARM_SLOTS
  eggs: number;
  hatching: HatchSlot[]; // length up to HATCH_SLOTS
  feedBuffs: Record<string, number>; // petId → expiresAtMs
  daily: DailyCounts;
  lastHarvest: number; // ms
  /** 펫이 평생 모아준 코인 누적 (애착 형성용) */
  petTotals: Record<string, number>;
  /** 펫별 마지막 쓰다듬은 날짜 YYYYMMDD (펫당 1회/일 제한) */
  lastPetted: Record<string, string>;
}

interface MyfarmContextValue {
  state: PersistState;
  now: number;
  /** 시간당 농장 총 생산량 (먹이주기 버프 반영) */
  hourlyRate: number;
  /** 현재 누적되어 있는 미수확 코인 (오프라인 8시간 캡 반영) */
  pendingCoins: number;
  /** 일일 한도 잔여 */
  remaining: Record<ActionKey, number>;

  // Actions (광고 시청 성공 후 호출되는 형태)
  harvest: () => Promise<number>; // 수확된 코인 반환
  claimAttendance: () => Promise<boolean>; // 알 1개 + true/false
  claimEggFromAd: () => Promise<boolean>;
  startHatch: () => Promise<boolean>;
  instantHatch: (index: number) => Promise<string | null>; // 부화된 petId
  completeHatch: (index: number) => Promise<string | null>;
  feedPet: (petId: string) => Promise<boolean>;
  swapFarmPet: (slot: number, petId: string | null) => Promise<void>;
  addGameReward: (coins: number, bonusEgg: boolean) => Promise<void>;
  exchangeCoins: (coin: number, won: number) => Promise<boolean>;
  /** 쓰다듬기 — 펫당 1회/일, +5 코인 (광고 시청 가정 후 호출) */
  petPet: (petId: string) => Promise<boolean>;
  /** 펫이 오늘 이미 쓰다듬어졌는지 */
  isPettedToday: (petId: string) => boolean;
  /** 펫이 시간당 생산하는 코인 (먹이 버프 반영) */
  petHourlyRate: (petId: string) => number;
  /** 펫의 진화 단계 (0=아기~3=성인) */
  petStage: (petId: string) => number;
  /** 진화 가능 여부 (5성 만렙 + 성인 전 + 진화석 충분) */
  canEvolve: (petId: string) => boolean;
  /** 진화 실행 (진화석 차감, 단계+1, 별 1성 리셋) */
  evolvePet: (petId: string) => Promise<boolean>;
  /** 진화석 지급 — IAP 지급 콜백/개발용 (n개 추가) */
  grantStones: (n: number) => Promise<void>;
  /** [개발용] 모든 펫 1성 소환 + 빈 농장 자동 배치 */
  devUnlockAll: () => Promise<void>;
  /** [개발용] 펫 별 지정 (0=미보유~5) */
  devSetStar: (petId: string, star: number) => Promise<void>;
  /** [개발용] 펫 진화 단계 지정 (0~3) */
  devSetStage: (petId: string, stage: number) => Promise<void>;
  resetAll: () => Promise<void>;
}

const STORAGE_KEY = 'myfarm_state_v1';
const CURRENT_VERSION = 1;

function todayKst(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return (
    String(kst.getUTCFullYear()) +
    String(kst.getUTCMonth() + 1).padStart(2, '0') +
    String(kst.getUTCDate()).padStart(2, '0')
  );
}

function emptyDaily(): DailyCounts {
  return { date: todayKst(), attendance: 0, egg: 0, game: 0, feed: 0, exchange: 0 };
}

function emptyState(): PersistState {
  return {
    version: CURRENT_VERSION,
    coins: 0,
    totalEarnedWon: 0,
    ownedStars: {},
    petStages: {},
    evolveStones: 0,
    farmPets: Array(FARM_SLOTS).fill(null),
    eggs: 0,
    hatching: [],
    feedBuffs: {},
    daily: emptyDaily(),
    lastHarvest: Date.now(),
    petTotals: {},
    lastPetted: {},
  };
}

function migrate(raw: any): PersistState {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    farmPets: Array.isArray(raw.farmPets)
      ? [...raw.farmPets, ...Array(FARM_SLOTS).fill(null)].slice(0, FARM_SLOTS)
      : base.farmPets,
    hatching: Array.isArray(raw.hatching) ? raw.hatching.slice(0, HATCH_SLOTS) : [],
    feedBuffs: raw.feedBuffs && typeof raw.feedBuffs === 'object' ? raw.feedBuffs : {},
    daily: raw.daily && raw.daily.date === todayKst() ? raw.daily : emptyDaily(),
    ownedStars: raw.ownedStars && typeof raw.ownedStars === 'object' ? raw.ownedStars : {},
    petStages: raw.petStages && typeof raw.petStages === 'object' ? raw.petStages : {},
    evolveStones: typeof raw.evolveStones === 'number' ? raw.evolveStones : 0,
    petTotals: raw.petTotals && typeof raw.petTotals === 'object' ? raw.petTotals : {},
    lastPetted: raw.lastPetted && typeof raw.lastPetted === 'object' ? raw.lastPetted : {},
  };
}

/** 등급별 가중치 → 랜덤 펫 id (5★ 만렙 제외) */
function rollPet(ownedStars: Record<string, number>): string {
  const eligible = PETS.filter(p => (ownedStars[p.id] ?? 0) < MAX_STAR);
  const fallback = PETS; // 전부 만렙이면 그냥 가챠 (이상적으로 발생 안 함)
  const pool = eligible.length > 0 ? eligible : fallback;

  // 1) 등급 추첨
  const byRarity: Record<Rarity, typeof PETS> = { common: [], rare: [], legendary: [] };
  pool.forEach(p => byRarity[p.rarity].push(p));

  const rarities: Rarity[] = ['common', 'rare', 'legendary'];
  const activeRarities = rarities.filter(r => byRarity[r].length > 0);
  const totalWeight = activeRarities.reduce((s, r) => s + RARITY_WEIGHT[r], 0);
  let roll = Math.random() * totalWeight;
  let chosenRarity: Rarity = activeRarities[0];
  for (const r of activeRarities) {
    if (roll < RARITY_WEIGHT[r]) {
      chosenRarity = r;
      break;
    }
    roll -= RARITY_WEIGHT[r];
  }

  // 2) 등급 안에서 균등
  const arr = byRarity[chosenRarity];
  return arr[Math.floor(Math.random() * arr.length)].id;
}

const MyfarmContext = createContext<MyfarmContextValue | null>(null);

export function MyfarmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistState>(() => emptyState());
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());

  // 매초 시계 갱신 (부화 카운트다운/유휴 누적)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // 초기 로드 + 미결 IAP 진화석 복원
  useEffect(() => {
    (async () => {
      const raw = await Storage.getItem(STORAGE_KEY).catch(() => null);
      let next = emptyState();
      if (raw) {
        try {
          next = migrate(JSON.parse(raw));
        } catch {
          // ignore parse error, keep default
        }
      }
      // 결제됐으나 미지급된 진화석 주문 복원 — 먼저 상태 반영·저장 후 완료 처리
      const pending = await getPendingStoneOrders();
      const addStones = pending.reduce((sum, o) => sum + o.stones, 0);
      if (addStones > 0) {
        next = { ...next, evolveStones: next.evolveStones + addStones };
      }
      setState(next);
      await Storage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      setLoaded(true);
      for (const o of pending) {
        await completeStoneOrder(o.orderId);
      }
    })();
  }, []);

  // 날짜 변경 시 daily 리셋
  useEffect(() => {
    if (!loaded) return;
    const today = todayKst();
    if (state.daily.date !== today) {
      const next = { ...state, daily: emptyDaily() };
      setState(next);
      Storage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    }
  }, [loaded, now]);

  const save = async (next: PersistState) => {
    setState(next);
    await Storage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  // 시간당 생산량 = 농장 펫 각각의 (별 단계 코인 × 버프배수) 합
  const hourlyRate = useMemo(() => {
    return state.farmPets.reduce((sum, petId) => {
      if (!petId) return sum;
      const def = PET_MAP[petId];
      const star = state.ownedStars[petId] ?? 0;
      if (!def || star < 1) return sum;
      const stageMult = STAGE_MULTIPLIER[state.petStages[petId] ?? 0] ?? 1;
      const base = (def.coinPerHour[star - 1] ?? 0) * stageMult;
      const buffed = (state.feedBuffs[petId] ?? 0) > now ? base * FEED_BUFF_MULTIPLIER : base;
      return sum + buffed;
    }, 0);
  }, [state.farmPets, state.ownedStars, state.petStages, state.feedBuffs, now]);

  const pendingCoins = useMemo(() => {
    const elapsedMs = Math.min(now - state.lastHarvest, MAX_IDLE_HOURS * 3600 * 1000);
    if (elapsedMs <= 0 || hourlyRate <= 0) return 0;
    return Math.floor((elapsedMs / 3600000) * hourlyRate);
  }, [now, state.lastHarvest, hourlyRate]);

  const remaining: Record<ActionKey, number> = useMemo(() => {
    const today = todayKst();
    const d = state.daily.date === today ? state.daily : emptyDaily();
    return {
      attendance: Math.max(0, DAILY_LIMITS.attendance - d.attendance),
      egg: Math.max(0, DAILY_LIMITS.egg - d.egg),
      game: Math.max(0, DAILY_LIMITS.game - d.game),
      feed: Math.max(0, DAILY_LIMITS.feed - d.feed),
      exchange: Math.max(0, DAILY_LIMITS.exchange - d.exchange),
    };
  }, [state.daily, now]);

  const incDaily = (key: ActionKey): DailyCounts => {
    const today = todayKst();
    const d = state.daily.date === today ? state.daily : emptyDaily();
    return { ...d, [key]: d[key] + 1 };
  };

  const petHourlyRate = (petId: string): number => {
    const def = PET_MAP[petId];
    const star = state.ownedStars[petId] ?? 0;
    if (!def || star < 1) return 0;
    const stageMult = STAGE_MULTIPLIER[state.petStages[petId] ?? 0] ?? 1;
    const base = (def.coinPerHour[star - 1] ?? 0) * stageMult;
    return (state.feedBuffs[petId] ?? 0) > now ? base * FEED_BUFF_MULTIPLIER : base;
  };

  const petStage = (petId: string): number => state.petStages[petId] ?? 0;

  /** 진화 가능 여부: 현 단계 5성 만렙 + 성인 전 + 진화석 충분 */
  const canEvolve = (petId: string): boolean => {
    if ((state.ownedStars[petId] ?? 0) < MAX_STAR) return false;
    const stage = state.petStages[petId] ?? 0;
    if (stage >= MAX_STAGE) return false;
    return state.evolveStones >= (EVOLVE_STONE_COST[stage] ?? Infinity);
  };

  /** 진화 실행: 진화석 차감, 단계 +1, 별 1성으로 리셋 */
  const evolvePet = async (petId: string): Promise<boolean> => {
    if (!canEvolve(petId)) return false;
    const stage = state.petStages[petId] ?? 0;
    const cost = EVOLVE_STONE_COST[stage] ?? Infinity;
    const next: PersistState = {
      ...state,
      evolveStones: state.evolveStones - cost,
      petStages: { ...state.petStages, [petId]: stage + 1 },
      ownedStars: { ...state.ownedStars, [petId]: 1 },
    };
    await save(next);
    return true;
  };

  const harvest = async (): Promise<number> => {
    const amount = pendingCoins;
    if (amount <= 0) return 0;
    // 펫별 기여도로 누적 분배 (헤더 누적 표시용)
    const elapsedHours = Math.min(now - state.lastHarvest, MAX_IDLE_HOURS * 3600 * 1000) / 3600000;
    const newTotals = { ...state.petTotals };
    state.farmPets.forEach(petId => {
      if (!petId) return;
      const contrib = Math.floor(petHourlyRate(petId) * elapsedHours);
      newTotals[petId] = (newTotals[petId] ?? 0) + contrib;
    });
    const next: PersistState = {
      ...state,
      coins: state.coins + amount,
      petTotals: newTotals,
      lastHarvest: Date.now(),
    };
    await save(next);
    return amount;
  };

  const claimAttendance = async (): Promise<boolean> => {
    if (remaining.attendance <= 0) return false;
    const next: PersistState = {
      ...state,
      eggs: state.eggs + ATTENDANCE_REWARD_EGG,
      daily: incDaily('attendance'),
    };
    await save(next);
    return true;
  };

  const claimEggFromAd = async (): Promise<boolean> => {
    if (remaining.egg <= 0) return false;
    const next: PersistState = {
      ...state,
      eggs: state.eggs + 1,
      daily: incDaily('egg'),
    };
    await save(next);
    return true;
  };

  const startHatch = async (): Promise<boolean> => {
    if (state.eggs <= 0) return false;
    if (state.hatching.length >= HATCH_SLOTS) return false;
    const next: PersistState = {
      ...state,
      eggs: state.eggs - 1,
      hatching: [...state.hatching, { startedAt: Date.now(), type: 'common' }],
    };
    await save(next);
    return true;
  };

  const hatchOne = async (index: number): Promise<string | null> => {
    if (index < 0 || index >= state.hatching.length) return null;
    const petId = rollPet(state.ownedStars);
    const currStar = state.ownedStars[petId] ?? 0;
    const newStar = Math.min(currStar + 1, MAX_STAR);
    const newOwned = { ...state.ownedStars, [petId]: newStar };
    const newHatching = state.hatching.filter((_, i) => i !== index);

    // 농장 빈 자리에 자동 배치 (새로 획득한 펫만)
    let newFarm = state.farmPets;
    if (currStar === 0) {
      const emptyIdx = newFarm.indexOf(null);
      if (emptyIdx >= 0) {
        newFarm = [...newFarm];
        newFarm[emptyIdx] = petId;
      }
    }

    const next: PersistState = {
      ...state,
      ownedStars: newOwned,
      hatching: newHatching,
      farmPets: newFarm,
    };
    await save(next);
    return petId;
  };

  const completeHatch = async (index: number): Promise<string | null> => {
    const slot = state.hatching[index];
    if (!slot) return null;
    const ms = HATCH_MS[slot.type];
    if (now - slot.startedAt < ms) return null;
    return hatchOne(index);
  };

  const instantHatch = async (index: number): Promise<string | null> => {
    return hatchOne(index);
  };

  const feedPet = async (petId: string): Promise<boolean> => {
    if (remaining.feed <= 0) return false;
    if ((state.ownedStars[petId] ?? 0) < 1) return false;
    const next: PersistState = {
      ...state,
      feedBuffs: { ...state.feedBuffs, [petId]: Date.now() + FEED_BUFF_MS },
      daily: incDaily('feed'),
    };
    await save(next);
    return true;
  };

  const swapFarmPet = async (slot: number, petId: string | null) => {
    if (slot < 0 || slot >= FARM_SLOTS) return;
    if (petId && (state.ownedStars[petId] ?? 0) < 1) return;
    const newFarm = [...state.farmPets];
    // 이미 다른 슬롯에 같은 펫이 있으면 swap
    if (petId) {
      const existing = newFarm.indexOf(petId);
      if (existing >= 0 && existing !== slot) {
        newFarm[existing] = newFarm[slot];
      }
    }
    newFarm[slot] = petId;
    await save({ ...state, farmPets: newFarm });
  };

  const addGameReward = async (coins: number, bonusEgg: boolean) => {
    if (remaining.game <= 0) return;
    const next: PersistState = {
      ...state,
      coins: state.coins + Math.max(0, coins),
      eggs: state.eggs + (bonusEgg ? 1 : 0),
      daily: incDaily('game'),
    };
    await save(next);
  };

  const exchangeCoins = async (coin: number, won: number): Promise<boolean> => {
    if (remaining.exchange <= 0) return false;
    if (state.coins < coin) return false;
    const next: PersistState = {
      ...state,
      coins: state.coins - coin,
      totalEarnedWon: state.totalEarnedWon + won,
      daily: incDaily('exchange'),
    };
    await save(next);
    return true;
  };

  const isPettedToday = (petId: string): boolean => {
    return state.lastPetted[petId] === todayKst();
  };

  const petPet = async (petId: string): Promise<boolean> => {
    if (isPettedToday(petId)) return false;
    if ((state.ownedStars[petId] ?? 0) < 1) return false;
    const next: PersistState = {
      ...state,
      coins: state.coins + 5,
      lastPetted: { ...state.lastPetted, [petId]: todayKst() },
    };
    await save(next);
    return true;
  };

  const grantStones = async (n: number) => {
    if (!Number.isFinite(n) || n === 0) return;
    await save({ ...state, evolveStones: Math.max(0, state.evolveStones + n) });
  };

  const devUnlockAll = async () => {
    const owned = { ...state.ownedStars };
    PETS.forEach(p => { if ((owned[p.id] ?? 0) < 1) owned[p.id] = 1; });
    const farm = [...state.farmPets];
    const placed = new Set(farm.filter(Boolean) as string[]);
    let pi = 0;
    for (let i = 0; i < farm.length; i++) {
      if (farm[i]) continue;
      while (pi < PETS.length && placed.has(PETS[pi].id)) pi++;
      if (pi < PETS.length) { farm[i] = PETS[pi].id; placed.add(PETS[pi].id); pi++; }
    }
    await save({ ...state, ownedStars: owned, farmPets: farm });
  };

  const devSetStar = async (petId: string, star: number) => {
    const s = Math.max(0, Math.min(MAX_STAR, Math.round(star)));
    const owned = { ...state.ownedStars };
    if (s <= 0) {
      delete owned[petId];
      const farm = state.farmPets.map(p => (p === petId ? null : p));
      await save({ ...state, ownedStars: owned, farmPets: farm });
    } else {
      owned[petId] = s;
      await save({ ...state, ownedStars: owned });
    }
  };

  const devSetStage = async (petId: string, stage: number) => {
    const st = Math.max(0, Math.min(MAX_STAGE, Math.round(stage)));
    await save({ ...state, petStages: { ...state.petStages, [petId]: st } });
  };

  const resetAll = async () => {
    await save(emptyState());
  };

  return (
    <MyfarmContext.Provider
      value={{
        state,
        now,
        hourlyRate,
        pendingCoins,
        remaining,
        harvest,
        claimAttendance,
        claimEggFromAd,
        startHatch,
        instantHatch,
        completeHatch,
        feedPet,
        swapFarmPet,
        addGameReward,
        exchangeCoins,
        petPet,
        isPettedToday,
        petHourlyRate,
        petStage,
        canEvolve,
        evolvePet,
        grantStones,
        devUnlockAll,
        devSetStar,
        devSetStage,
        resetAll,
      }}
    >
      {children}
    </MyfarmContext.Provider>
  );
}

export function useMyfarm(): MyfarmContextValue {
  const ctx = useContext(MyfarmContext);
  if (!ctx) throw new Error('useMyfarm must be used within MyfarmProvider');
  return ctx;
}
