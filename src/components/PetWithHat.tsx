import { Image } from '@granite-js/react-native';
import React from 'react';
import { DimensionValue, StyleProp, View, ViewStyle } from 'react-native';
import { IMG } from '../constants/imageData';
import { PET_MAP, STAGE_HAT } from '../constants/pets';

/** 펫별 머리 앵커: [x중심, y착용지점, 모자폭] (펫 이미지 대비 비율). 오프라인 합성으로 튜닝. */
const HAT_ANCHORS: Record<string, [number, number, number]> = {
  dog: [0.49, 0.27, 0.62],
  cat: [0.50, 0.26, 0.70],
  chick: [0.50, 0.35, 0.64],
  parrot: [0.55, 0.23, 0.52],
  chinchilla: [0.49, 0.27, 0.60],
  gecko: [0.37, 0.37, 0.40],
  ferret: [0.47, 0.39, 0.44],
  pig: [0.46, 0.27, 0.56],
};

/** 모자 에셋별 [종횡비(h/w), 착용지점(모자 높이 대비)] */
const HAT_META: Record<string, [number, number]> = {
  hat_child: [0.6229, 0.78],
  hat_teen: [0.7694, 0.80],
  hat_adult: [0.6303, 0.80],
};

const pct = (f: number): DimensionValue => `${f * 100}%`;

interface Props {
  petId: string;
  stage: number;
  /** 정사각형 컨테이너 스타일 (px 또는 width/height '100%'). 모자는 비율로 정사각 기준 배치. */
  style?: StyleProp<ViewStyle>;
}

/** 펫 이미지 + 진화 단계 모자 오버레이. 컨테이너는 반드시 정사각형이어야 비율이 맞음. */
export function PetWithHat({ petId, stage, style }: Props) {
  const def = PET_MAP[petId];
  if (!def) return null;

  const hatKey = STAGE_HAT[stage] ?? null;
  const anchor = HAT_ANCHORS[petId];
  const meta = hatKey ? HAT_META[hatKey] : null;
  const hatH = meta && anchor ? anchor[2] * meta[0] : 0;

  return (
    <View style={style}>
      <Image source={def.image} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
      {hatKey && anchor && meta && (
        <Image
          source={IMG[hatKey]}
          style={{
            position: 'absolute',
            width: pct(anchor[2]),
            height: pct(hatH),
            left: pct(anchor[0] - anchor[2] / 2),
            top: pct(anchor[1] - hatH * meta[1]),
            resizeMode: 'contain',
          }}
        />
      )}
    </View>
  );
}
