import { Image } from '@granite-js/react-native';
import { Txt } from '@toss/tds-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Alert, Animated, Dimensions, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import { InlineAd } from '@apps-in-toss/framework';
import { AD_FEED, AD_PET, BANNER_SHEET } from '../constants/ads';
import { EVOLVE_STONE_COST, FEED_BUFF_MS } from '../constants/economy';
import { IMG } from '../constants/imageData';
import {
  MAX_STAGE, MAX_STAR, PET_MAP, RARITY_COLOR, RARITY_LABEL, STAGE_LABEL, STAGE_MULTIPLIER,
} from '../constants/pets';
import { PetWithHat } from './PetWithHat';
import {
  CARD_BORDER, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT,
  TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY,
} from '../constants/theme';
import { runRewardAd } from '../lib/rewardAd';
import { useMyfarm } from '../../stores/MyfarmContext';

const SCREEN_H = Dimensions.get('window').height;

function formatBuffRemain(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export function PetDetailSheet({
  petId, onClose, onBuyStones, onOpenGuide,
}: {
  petId: string | null;
  onClose: () => void;
  onBuyStones?: () => void;
  onOpenGuide?: () => void;
}) {
  const {
    state, now, petHourlyRate, isPettedToday, remaining,
    feedPet, petPet, swapFarmPet, petStage, canEvolve, evolvePet,
  } = useMyfarm();

  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const visible = !!petId;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : SCREEN_H,
        duration: visible ? 250 : 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 200 : 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  if (!petId) {
    // 첫 렌더 + 닫힌 상태: 아무것도 마운트 안 함 (애니메이션 무관)
    return null;
  }

  const def = PET_MAP[petId];
  if (!def) return null;

  const star = state.ownedStars[petId] ?? 0;
  const stage = petStage(petId);
  const canEvo = canEvolve(petId);
  const evolveCost = stage < MAX_STAGE ? EVOLVE_STONE_COST[stage] : 0;
  const rate = petHourlyRate(petId);
  const baseRate = (def.coinPerHour[Math.max(0, star - 1)] ?? 0) * (STAGE_MULTIPLIER[stage] ?? 1);
  const isBuffed = (state.feedBuffs[petId] ?? 0) > now;
  const buffRemainMs = isBuffed ? (state.feedBuffs[petId] - now) : 0;
  const lifetime = state.petTotals[petId] ?? 0;
  const pettedAlready = isPettedToday(petId);
  const canFeed = !isBuffed && remaining.feed > 0;

  const handleFeed = () => {
    if (isBuffed) {
      Alert.alert('이미 먹이를 먹었어요', `${formatBuffRemain(buffRemainMs)} 후에 다시 줄 수 있어요.`);
      return;
    }
    if (remaining.feed <= 0) {
      Alert.alert('오늘 먹이를 다 줬어요', '내일 다시 시도해주세요.');
      return;
    }
    Alert.alert('먹이주기', `광고를 본 뒤 ${def.name}에게 먹이를 줘요. (24시간 ×1.5 생산) 진행할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '광고 보고 먹이주기', onPress: doFeed },
    ]);
  };

  const doFeed = async () => {
    const ok = await runRewardAd(AD_FEED, async () => {
      await feedPet(petId);
      Alert.alert('🥕 먹이주기 완료', `${def.name}이(가) 24시간 동안 1.5배 더 생산해요!`);
    });
    if (!ok) Alert.alert('광고를 불러올 수 없어요', '잠시 후 다시 시도해주세요.');
  };

  const handlePet = () => {
    if (pettedAlready) {
      Alert.alert('오늘은 충분히 쓰다듬었어요', '내일 다시 만나요!');
      return;
    }
    Alert.alert('쓰다듬기', `광고를 본 뒤 ${def.name}을(를) 쓰다듬어요. (+5 코인) 진행할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '광고 보고 쓰다듬기', onPress: doPet },
    ]);
  };

  const doPet = async () => {
    const ok = await runRewardAd(AD_PET, async () => {
      await petPet(petId);
      Alert.alert('🥰 쓰다듬기 완료', `${def.name}이(가) 행복해해요! +5 코인`);
    });
    if (!ok) Alert.alert('광고를 불러올 수 없어요', '잠시 후 다시 시도해주세요.');
  };

  const handleEvolve = async () => {
    if (star < MAX_STAR) {
      Alert.alert('아직 진화할 수 없어요', `별 5개를 모두 모아야 진화할 수 있어요. (${star}/${MAX_STAR})`);
      return;
    }
    if (state.evolveStones < evolveCost) {
      Alert.alert('진화석이 부족해요', `진화하려면 진화석 ${evolveCost}개가 필요해요.`);
      return;
    }
    const ok = await evolvePet(petId);
    if (ok) {
      Alert.alert('🎉 진화 완료!', `${def.name}이(가) ${STAGE_LABEL[stage + 1]}(으)로 자랐어요!\n별을 다시 모으면 최대 생산량이 3배까지 늘어요.`);
    }
  };

  const handleRelease = () => {
    Alert.alert(
      '농장에서 뺄까요?',
      '도감에서 언제든 다시 농장으로 보낼 수 있어요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '빼기', style: 'destructive', onPress: async () => {
          const slot = state.farmPets.indexOf(petId);
          if (slot >= 0) await swapFarmPet(slot, null);
          onClose();
        } },
      ],
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* 배경 어둡게 */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      {/* 시트 본체 */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* 핸들 */}
        <View style={styles.handle} />

        {/* 헤더: 이미지 + 이름 + 등급 + 별 */}
        <View style={styles.header}>
          <View style={styles.petImgWrap}>
            <PetWithHat petId={petId} stage={stage} style={styles.petImg} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.nameRow}>
              <Txt typography="t3" color={TEXT_PRIMARY}>{def.name}</Txt>
              <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLOR[def.rarity] }]}>
                <Text style={styles.rarityText}>{RARITY_LABEL[def.rarity]}</Text>
              </View>
            </View>
            <Txt typography="c1" color={PRIMARY_DARK}>{STAGE_LABEL[stage]} 단계</Txt>
            <View style={styles.starRow}>
              {Array.from({ length: MAX_STAR }, (_, i) => (
                <Text key={i} style={[styles.star, i < star && styles.starOn]}>★</Text>
              ))}
            </View>
          </View>
        </View>

        {/* 정보 */}
        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>⚡</Text>
            <View style={{ flex: 1 }}>
              <Txt typography="t5" color={TEXT_PRIMARY}>시간당 +{rate.toFixed(1)} 코인</Txt>
              {isBuffed && (
                <Txt typography="c1" color={PRIMARY_DARK} style={{ marginTop: 2 }}>
                  먹이 버프 ×1.5 적용 중 (기본 {baseRate.toFixed(1)})
                </Txt>
              )}
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🥕</Text>
            <View style={{ flex: 1 }}>
              <Txt typography="t5" color={TEXT_PRIMARY}>
                {isBuffed ? `먹이 효과 ${formatBuffRemain(buffRemainMs)} 남음` : '아직 먹이를 안 줬어요'}
              </Txt>
              {!isBuffed && (
                <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 2 }}>
                  먹이를 주면 24시간 동안 ×1.5 생산
                </Txt>
              )}
            </View>
          </View>
          <View style={styles.infoRow}>
            <Image source={IMG.coin} style={styles.coinIcon} />
            <View style={{ flex: 1 }}>
              <Txt typography="t5" color={TEXT_PRIMARY}>평생 누적 {lifetime.toLocaleString()} 코인</Txt>
              <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 2 }}>
                지금까지 모아준 코인의 총합
              </Txt>
            </View>
          </View>
        </View>

        {/* 배너 광고 (액션 카드 상단) */}
        <InlineAd adGroupId={BANNER_SHEET} variant="expanded" impressFallbackOnMount />

        {/* 액션 */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, !canFeed && styles.actionBtnDisabled]}
            onPress={handleFeed}
            activeOpacity={0.85}
          >
            <Text style={styles.actionEmoji}>🥕</Text>
            <Txt typography="t5" color={canFeed ? '#FFFFFF' : TEXT_MUTED}>먹이주기</Txt>
            <Txt typography="c1" color={canFeed ? 'rgba(255,255,255,0.9)' : TEXT_MUTED} style={{ marginTop: 2 }}>
              {isBuffed ? '버프 중' : `오늘 ${remaining.feed}/5`}
            </Txt>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnAlt, pettedAlready && styles.actionBtnDisabled]}
            onPress={handlePet}
            activeOpacity={0.85}
          >
            <Text style={styles.actionEmoji}>🥰</Text>
            <Txt typography="t5" color={pettedAlready ? TEXT_MUTED : PRIMARY_DARK}>쓰다듬기</Txt>
            <Txt typography="c1" color={pettedAlready ? TEXT_MUTED : TEXT_SECONDARY} style={{ marginTop: 2 }}>
              {pettedAlready ? '오늘 완료' : '+5 코인'}
            </Txt>
          </TouchableOpacity>
        </View>

        {/* 진화 */}
        <View style={styles.evolveBlock}>
          <View style={styles.evolveHeader}>
            <Text style={styles.evolveIcon}>🪄</Text>
            <View style={{ flex: 1 }}>
              <Txt typography="t5" color={TEXT_PRIMARY}>
                {stage < MAX_STAGE ? `진화: ${STAGE_LABEL[stage]} → ${STAGE_LABEL[stage + 1]}` : '최종 단계 달성!'}
              </Txt>
              <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 2 }}>
                {stage < MAX_STAGE ? '진화하면 최대 생산량이 3배까지 늘어요' : `${def.name}이(가) 완전히 자랐어요`}
              </Txt>
            </View>
            <View style={styles.stoneBadge}>
              <Text style={styles.stoneEmoji}>💎</Text>
              <Txt typography="t5" color={PRIMARY_DARK}>{state.evolveStones}</Txt>
            </View>
          </View>
          {stage < MAX_STAGE && (
            <TouchableOpacity
              style={[styles.evolveBtn, !canEvo && styles.evolveBtnDisabled]}
              onPress={handleEvolve}
              activeOpacity={0.85}
            >
              <Txt typography="t5" color={canEvo ? '#FFFFFF' : TEXT_MUTED}>
                {star < MAX_STAR
                  ? `별 ${MAX_STAR}개를 모아야 진화할 수 있어요 (${star}/${MAX_STAR})`
                  : `진화석 ${evolveCost}개로 진화하기`}
              </Txt>
            </TouchableOpacity>
          )}
          {onBuyStones && stage < MAX_STAGE && (
            <TouchableOpacity style={styles.buyStoneBtn} onPress={onBuyStones} activeOpacity={0.8}>
              <Txt typography="t5" color={PRIMARY_DARK}>💎 진화석 구매</Txt>
            </TouchableOpacity>
          )}
          {onOpenGuide && (
            <TouchableOpacity onPress={onOpenGuide} activeOpacity={0.7} style={styles.guideLink}>
              <Txt typography="c1" color={TEXT_MUTED}>진화란? 자세히 알아보기 ›</Txt>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={handleRelease} activeOpacity={0.7} style={styles.releaseBtn}>
          <Txt typography="t5" color={TEXT_MUTED}>농장에서 빼기</Txt>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
          <Txt typography="t5" color={TEXT_SECONDARY}>닫기</Txt>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
    gap: 14,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: '#E5E7EB',
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 6,
  },
  petImgWrap: {
    width: 90, height: 90,
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  petImg: { width: 84, height: 84, resizeMode: 'contain' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rarityBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  rarityText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  starRow: { flexDirection: 'row' },
  star: { fontSize: 18, color: '#E5E7EB', marginRight: 2 },
  starOn: { color: '#F59E0B' },

  infoBlock: {
    backgroundColor: '#FFFBEB', borderRadius: 14,
    padding: 14, gap: 12,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  coinIcon: { width: 28, height: 28, resizeMode: 'contain' },

  actions: {
    flexDirection: 'row', gap: 10,
  },
  actionBtn: {
    flex: 1, backgroundColor: PRIMARY, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', gap: 2,
  },
  actionBtnAlt: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2, borderColor: PRIMARY,
  },
  actionBtnDisabled: {
    backgroundColor: '#F3F4F6', borderColor: '#E5E7EB',
  },
  actionEmoji: { fontSize: 24 },

  evolveBlock: {
    backgroundColor: PRIMARY_LIGHT, borderRadius: 14, padding: 12, gap: 10,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  evolveHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  evolveIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  stoneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
  },
  stoneEmoji: { fontSize: 16 },
  evolveBtn: {
    backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  evolveBtnDisabled: { backgroundColor: '#F3F4F6' },
  buyStoneBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: PRIMARY,
  },
  guideLink: { alignItems: 'center', paddingVertical: 2 },

  releaseBtn: {
    paddingVertical: 12, alignItems: 'center',
  },
  closeBtn: {
    paddingVertical: 10, alignItems: 'center',
  },
});
