import { InlineAd } from '@apps-in-toss/framework';
import { createRoute, Image } from '@granite-js/react-native';
import { PageNavbar, Txt } from '@toss/tds-react-native';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AD_EGG, AD_HATCH, BANNER_EGGS } from '../src/constants/ads';
import { IMG } from '../src/constants/imageData';
import { HATCH_MS, HATCH_SLOTS } from '../src/constants/economy';
import { PET_MAP } from '../src/constants/pets';
import {
  BG, CARD_BORDER, PRIMARY, PRIMARY_DARK, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY,
} from '../src/constants/theme';
import { runRewardAd } from '../src/lib/rewardAd';
import { useMyfarm } from '../stores/MyfarmContext';

export const Route = createRoute('/eggs', {
  component: EggsPage,
  screenOptions: { title: '알 부화' },
});

const EGG_IMG = IMG.egg_common;

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function EggsPage() {
  const { state, now, remaining, claimEggFromAd, startHatch, instantHatch, completeHatch } = useMyfarm();

  const handleGetEgg = async () => {
    if (remaining.egg <= 0) {
      Alert.alert('오늘 알을 다 받았어요', '내일 다시 시도해주세요.');
      return;
    }
    const ok = await runRewardAd(AD_EGG, async () => {
      await claimEggFromAd();
      Alert.alert('🥚 알을 받았어요!', '부화시켜서 어떤 펫이 나올지 확인해보세요!');
    });
    if (!ok) Alert.alert('광고를 불러올 수 없어요', '잠시 후 다시 시도해주세요.');
  };

  const handleStart = async () => {
    if (state.eggs <= 0) {
      Alert.alert('알이 없어요', '알을 먼저 받아주세요.');
      return;
    }
    if (state.hatching.length >= HATCH_SLOTS) {
      Alert.alert('부화 자리가 꽉 찼어요', '한 칸이 비면 다시 시도해주세요.');
      return;
    }
    await startHatch();
  };

  const handleHatch = async (index: number, ready: boolean) => {
    if (ready) {
      const petId = await completeHatch(index);
      if (petId) {
        const pet = PET_MAP[petId];
        Alert.alert('🎉 펫을 만났어요!', `${pet?.name}이(가) 부화했어요!`);
      }
    } else {
      // 즉시 부화는 광고
      const ok = await runRewardAd(AD_HATCH, async () => {
        const petId = await instantHatch(index);
        if (petId) {
          const pet = PET_MAP[petId];
          Alert.alert('🎉 펫을 만났어요!', `${pet?.name}이(가) 부화했어요!`);
        }
      });
      if (!ok) Alert.alert('광고를 불러올 수 없어요', '잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <View style={styles.container}>
      <PageNavbar />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <InlineAd adGroupId={BANNER_EGGS} variant="expanded" impressFallbackOnMount />

        <View style={styles.summary}>
          <Image source={EGG_IMG} style={styles.summaryIcon} />
          <View style={{ flex: 1 }}>
            <Txt typography="t4" color={TEXT_PRIMARY}>{state.eggs}개의 알</Txt>
            <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 2 }}>
              부화하면 8종의 펫 중 하나가 나와요
            </Txt>
          </View>
        </View>

        {/* 부화 슬롯 */}
        <View style={styles.section}>
          <Txt typography="t5" color={TEXT_PRIMARY} style={{ marginBottom: 8 }}>
            부화 중 ({state.hatching.length}/{HATCH_SLOTS})
          </Txt>
          {state.hatching.length === 0 && (
            <View style={styles.emptyHatch}>
              <Txt typography="c1" color={TEXT_MUTED}>알을 부화시켜 보세요</Txt>
            </View>
          )}
          {state.hatching.map((slot, i) => {
            const elapsed = now - slot.startedAt;
            const total = HATCH_MS[slot.type];
            const remainMs = total - elapsed;
            const ready = remainMs <= 0;
            const progress = Math.min(1, elapsed / total);
            return (
              <TouchableOpacity
                key={i}
                style={[styles.hatchCard, ready && styles.hatchReady]}
                onPress={() => handleHatch(i, ready)}
                activeOpacity={0.8}
              >
                <Image source={EGG_IMG} style={styles.hatchEgg} />
                <View style={{ flex: 1 }}>
                  <Txt typography="t5" color={ready ? '#FFFFFF' : TEXT_PRIMARY}>
                    {ready ? '🎉 부화 완료!' : '부화 중...'}
                  </Txt>
                  <Txt typography="c1" color={ready ? 'rgba(255,255,255,0.9)' : TEXT_SECONDARY} style={{ marginTop: 2 }}>
                    {ready ? '탭해서 만나보기' : `${formatRemaining(remainMs)} 또는 광고 보고 즉시 부화`}
                  </Txt>
                  {!ready && (
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
                    </View>
                  )}
                </View>
                <Text style={[styles.cardArrow, ready && { color: '#FFFFFF' }]}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 액션 */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleStart} activeOpacity={0.85}>
          <Txt typography="t4" color="#FFFFFF">알 부화 시작</Txt>
          <Txt typography="c1" color="rgba(255,255,255,0.9)" style={{ marginTop: 2 }}>
            30분 후 자동 부화
          </Txt>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleGetEgg} activeOpacity={0.85}>
          <Txt typography="t5" color={PRIMARY_DARK}>광고 보고 알 받기 ({remaining.egg}/6)</Txt>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 24 },
  summary: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  summaryIcon: { width: 48, height: 48 },
  section: { gap: 8 },
  emptyHatch: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#F2F4F6',
  },
  hatchCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  hatchReady: { backgroundColor: PRIMARY, borderColor: PRIMARY_DARK },
  hatchEgg: { width: 44, height: 44 },
  progressTrack: {
    marginTop: 6, height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: PRIMARY },
  cardArrow: { fontSize: 20, color: '#B0B8C1' },
  primaryBtn: {
    backgroundColor: PRIMARY, borderRadius: 16, padding: 16, alignItems: 'center',
  },
  secondaryBtn: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: PRIMARY,
  },
});
