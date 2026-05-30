import { InlineAd } from '@apps-in-toss/framework';
import { createRoute, Image } from '@granite-js/react-native';
import { PageNavbar, Txt } from '@toss/tds-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AD_EGG, AD_HATCH, BANNER_EGGS } from '../src/constants/ads';
import { IMG } from '../src/constants/imageData';
import { HATCH_MS, HATCH_SLOTS } from '../src/constants/economy';
import { EGG_BY_SKU, EGG_PRODUCTS } from '../src/constants/iap';
import { PET_MAP } from '../src/constants/pets';
import {
  BG, CARD_BORDER, PRIMARY, PRIMARY_DARK, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY,
} from '../src/constants/theme';
import { fetchProducts, purchaseProduct, RemoteProduct } from '../src/lib/iap';
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
  const { state, now, remaining, claimEggFromAd, startHatch, instantHatch, completeHatch, grantEggs } = useMyfarm();
  const [remote, setRemote] = useState<RemoteProduct[] | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchProducts(new Set(Object.keys(EGG_BY_SKU))).then((list) => { if (alive) setRemote(list); });
    return () => { alive = false; };
  }, []);

  const remoteBySku: Record<string, RemoteProduct> = {};
  (remote ?? []).forEach((p) => { remoteBySku[p.sku] = p; });

  const handleBuy = (sku: string) => {
    if (buying) return;
    Alert.alert(
      '구매 전 안내',
      '알은 이 기기에 저장돼요.\n\n구매 후 사용하지 않은 알이 남아 있는 상태에서 기기를 변경하면, 남은 알은 복원되지 않고 사라질 수 있어요.\n\n이에 동의하시면 구매를 진행해주세요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '구매 진행', onPress: () => startPurchaseEgg(sku) },
      ],
    );
  };

  const startPurchaseEgg = (sku: string) => {
    if (buying) return;
    setBuying(sku);
    purchaseProduct(
      sku,
      async () => {
        const n = EGG_BY_SKU[sku] ?? 0;
        if (n > 0) await grantEggs(n);
      },
      () => {
        setBuying(null);
        Alert.alert('🎉 구매 완료', '알이 지급됐어요!');
      },
      () => {
        setBuying(null);
        Alert.alert('결제가 취소됐어요', '잠시 후 다시 시도해주세요.');
      },
    );
  };

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

  const handleComplete = async (index: number) => {
    const petId = await completeHatch(index);
    if (petId) {
      const pet = PET_MAP[petId];
      Alert.alert('🎉 펫을 만났어요!', `${pet?.name}이(가) 부화했어요!`);
    }
  };

  const askInstantHatch = (index: number) => {
    Alert.alert('즉시 부화', '광고를 본 뒤 남은 시간 없이 바로 부화시킬까요?', [
      { text: '취소', style: 'cancel' },
      { text: '광고 보고 부화', onPress: () => doInstantHatch(index) },
    ]);
  };

  const doInstantHatch = async (index: number) => {
    const ok = await runRewardAd(AD_HATCH, async () => {
      const petId = await instantHatch(index);
      if (petId) {
        const pet = PET_MAP[petId];
        Alert.alert('🎉 펫을 만났어요!', `${pet?.name}이(가) 부화했어요!`);
      }
    });
    if (!ok) Alert.alert('광고를 불러올 수 없어요', '잠시 후 다시 시도해주세요.');
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
              <View
                key={i}
                style={[styles.hatchCard, ready && styles.hatchReady]}
              >
                <Image source={EGG_IMG} style={styles.hatchEgg} />
                <View style={{ flex: 1 }}>
                  <Txt typography="t5" color={ready ? '#FFFFFF' : TEXT_PRIMARY}>
                    {ready ? '🎉 부화 완료!' : '부화 중...'}
                  </Txt>
                  <Txt typography="c1" color={ready ? 'rgba(255,255,255,0.9)' : TEXT_SECONDARY} style={{ marginTop: 2 }}>
                    {ready ? '받기 버튼을 눌러주세요' : `${formatRemaining(remainMs)} 남음`}
                  </Txt>
                  {!ready && (
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
                    </View>
                  )}
                </View>
                {ready ? (
                  <TouchableOpacity
                    style={styles.cardActionReady}
                    onPress={() => handleComplete(i)}
                    activeOpacity={0.8}
                  >
                    <Txt typography="t5" color={PRIMARY_DARK}>받기</Txt>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.cardActionInstant}
                    onPress={() => askInstantHatch(i)}
                    activeOpacity={0.8}
                  >
                    <Txt typography="c1" color="#FFFFFF">즉시 부화</Txt>
                  </TouchableOpacity>
                )}
              </View>
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
          <Txt typography="t5" color={PRIMARY_DARK}>광고 보고 알 받기 ({remaining.egg}/3)</Txt>
        </TouchableOpacity>

        {/* 알 구매 */}
        <View style={styles.shopSection}>
          <Txt typography="t5" color={TEXT_PRIMARY} style={{ marginBottom: 4 }}>알 구매</Txt>
          {remote === null ? (
            <View style={styles.shopLoading}><ActivityIndicator color={PRIMARY} /></View>
          ) : (
            EGG_PRODUCTS.map((p) => {
              const r = remoteBySku[p.sku];
              const available = !!r;
              const isBuying = buying === p.sku;
              return (
                <TouchableOpacity
                  key={p.sku}
                  style={[styles.eggProduct, !available && styles.eggProductDisabled]}
                  onPress={() => available && handleBuy(p.sku)}
                  activeOpacity={available ? 0.8 : 1}
                  disabled={!available || isBuying}
                >
                  <Text style={styles.eggEmoji}>🥚</Text>
                  <View style={{ flex: 1 }}>
                    <Txt typography="t5" color={TEXT_PRIMARY}>{r?.displayName ?? p.label}</Txt>
                    <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 2 }}>
                      {available ? r!.displayAmount : '준비 중 (콘솔 등록 후 구매 가능)'}
                    </Txt>
                  </View>
                  <View style={[styles.eggBuyBtn, !available && styles.eggBuyBtnDisabled]}>
                    <Txt typography="c1" color={available ? '#FFFFFF' : TEXT_MUTED}>
                      {isBuying ? '결제 중' : available ? '구매' : '준비 중'}
                    </Txt>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <Txt typography="c1" color={TEXT_MUTED} style={{ marginTop: 4 }}>
            • 미사용 알은 기기 변경 시 복원되지 않아요.
          </Txt>
        </View>
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
  cardActionReady: {
    backgroundColor: '#FFFFFF', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
  },
  cardActionInstant: {
    backgroundColor: PRIMARY, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: PRIMARY, borderRadius: 16, padding: 16, alignItems: 'center',
  },
  secondaryBtn: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: PRIMARY,
  },
  shopSection: { gap: 8 },
  shopLoading: { paddingVertical: 24, alignItems: 'center' },
  eggProduct: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  eggProductDisabled: { opacity: 0.6 },
  eggEmoji: { fontSize: 26 },
  eggBuyBtn: {
    backgroundColor: PRIMARY, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9, alignItems: 'center', justifyContent: 'center',
  },
  eggBuyBtnDisabled: { backgroundColor: '#F3F4F6' },
});
