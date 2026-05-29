import { IMG } from './imageData';

export type Rarity = 'common' | 'rare' | 'legendary';

export interface PetDef {
  id: string;
  name: string;
  rarity: Rarity;
  image: { uri: string };
  /** 별 1성→5성 시간당 코인 생산량 (인덱스 0 = 1성) */
  coinPerHour: number[];
}

export const PETS: PetDef[] = [
  { id: 'dog', name: '강아지', rarity: 'common', image: IMG.pet_dog, coinPerHour: [1, 1.5, 2, 2.5, 3] },
  { id: 'cat', name: '고양이', rarity: 'common', image: IMG.pet_cat, coinPerHour: [1, 1.5, 2, 2.5, 3] },
  { id: 'chick', name: '병아리', rarity: 'common', image: IMG.pet_chick, coinPerHour: [1, 1.5, 2, 2.5, 3] },
  { id: 'parrot', name: '앵무새', rarity: 'rare', image: IMG.pet_parrot, coinPerHour: [2, 3, 4, 5, 6] },
  { id: 'chinchilla', name: '친칠라', rarity: 'rare', image: IMG.pet_chinchilla, coinPerHour: [2, 3, 4, 5, 6] },
  { id: 'gecko', name: '게코', rarity: 'legendary', image: IMG.pet_gecko, coinPerHour: [4, 5.5, 7, 8.5, 10] },
  { id: 'ferret', name: '흰담비', rarity: 'legendary', image: IMG.pet_ferret, coinPerHour: [4, 5.5, 7, 8.5, 10] },
  { id: 'pig', name: '미니돼지', rarity: 'legendary', image: IMG.pet_pig, coinPerHour: [4, 5.5, 7, 8.5, 10] },
];

export const PET_MAP: Record<string, PetDef> = PETS.reduce((m, p) => {
  m[p.id] = p;
  return m;
}, {} as Record<string, PetDef>);

/** 등급별 추첨 확률 (합 100). 등급 내에서는 균등 추첨. */
export const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 70,
  rare: 25,
  legendary: 5,
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: '일반',
  rare: '희귀',
  legendary: '전설',
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  legendary: '#F59E0B',
};

export const MAX_STAR = 5;

/** 진화 단계: 0=아기, 1=어린이, 2=청소년, 3=성인 */
export const MAX_STAGE = 3;
export const STAGE_LABEL = ['아기', '어린이', '청소년', '성인'];
/** 단계별 코인 생산 배율 (아기 ×1 → 성인 ×27). 단계 내 1→5성 성장폭(×3)과 맞물려 진화 시 생산량 하락 없음 */
export const STAGE_MULTIPLIER = [1, 3, 9, 27];
/** 단계별 모자 에셋 키 (아기는 모자 없음 → null). IMG[key]로 참조 */
export const STAGE_HAT: (string | null)[] = [null, 'hat_child', 'hat_teen', 'hat_adult'];
