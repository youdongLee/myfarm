import { InlineAd } from '@apps-in-toss/framework';
import { createRoute, Image } from '@granite-js/react-native';
import { PageNavbar, Txt } from '@toss/tds-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AD_EGG, AD_HARVEST, BANNER_HOME, IMG_HOME } from '../src/constants/ads';
import { PetDetailSheet } from '../src/components/PetDetailSheet';
import { PetWithHat } from '../src/components/PetWithHat';
import { IMG } from '../src/constants/imageData';
import { PET_MAP } from '../src/constants/pets';
import { FARM_SLOTS } from '../src/constants/economy';
import {
  BG,
  CARD_BORDER,
  PRIMARY,
  PRIMARY_DARK,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '../src/constants/theme';
import { runRewardAd } from '../src/lib/rewardAd';
import { useMyfarm } from '../stores/MyfarmContext';

export const Route = createRoute('/', {
  component: HomePage,
  screenOptions: { title: '반려동물 모으기', headerTitleAlign: 'left' },
});

const FARM_BG = IMG.farm_bg;
const NEST_IMG = IMG.nest_empty;
const COIN_IMG = IMG.coin;
const EGG_IMG = IMG.egg_common;

function HomePage() {
  const navigation = Route.useNavigation();
  const { state, hourlyRate, pendingCoins, remaining, harvest, claimAttendance, petStage } = useMyfarm();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [devTaps, setDevTaps] = useState(0);

  const handleVersionTap = () => {
    const n = devTaps + 1;
    if (n >= 7) {
      setDevTaps(0);
      navigation.navigate('/dev');
    } else {
      setDevTaps(n);
    }
  };

  const handleHarvest = () => {
    if (pendingCoins <= 0) {
      Alert.alert('아직 모인 코인이 없어요', '펫을 농장에 두고 시간이 지나면 코인이 쌓여요.');
      return;
    }
    Alert.alert('코인 수확', `광고를 본 뒤 ${pendingCoins} 코인을 수확해요. 진행할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '광고 보고 수확', onPress: doHarvest },
    ]);
  };

  const doHarvest = async () => {
    const ok = await runRewardAd(AD_HARVEST, async () => {
      const amount = await harvest();
      Alert.alert('🌟 수확 완료!', `+${amount} 코인을 받았어요!`);
    });
    if (!ok) Alert.alert('광고를 불러올 수 없어요', '잠시 후 다시 시도해주세요.');
  };

  const handleAttendance = () => {
    if (remaining.attendance <= 0) {
      Alert.alert('이미 받았어요', '내일 다시 출석해주세요.');
      return;
    }
    Alert.alert('출석 보상', '광고를 본 뒤 알 1개를 받아요. 진행할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '광고 보고 받기', onPress: doAttendance },
    ]);
  };

  const doAttendance = async () => {
    const ok = await runRewardAd(AD_EGG, async () => {
      const claimed = await claimAttendance();
      if (claimed) Alert.alert('🎁 출석 완료', '알 1개를 받았어요!');
    });
    if (!ok) Alert.alert('광고를 불러올 수 없어요', '잠시 후 다시 시도해주세요.');
  };

  // 포인트 교환 카드 가시성 감지 → 안 보이면 플로팅 안내 표시
  const scrollRef = useRef<ScrollView>(null);
  const [scrollViewH, setScrollViewH] = useState(0);
  const [exchangeY, setExchangeY] = useState<number | null>(null);
  const [pillVisible, setPillVisible] = useState(true);

  const evaluatePill = (scrollY: number) => {
    if (exchangeY === null || scrollViewH === 0) return;
    const shouldShow = scrollY + scrollViewH < exchangeY + 40;
    setPillVisible((prev) => (prev !== shouldShow ? shouldShow : prev));
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    evaluatePill(e.nativeEvent.contentOffset.y);
  };

  useEffect(() => {
    // 초기 위치(0)에서도 평가 — 컨텐츠가 작아 스크롤 불필요한 경우 대비
    evaluatePill(0);
  }, [exchangeY, scrollViewH]);

  return (
    <View style={styles.container}>
      <PageNavbar />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        onLayout={(e) => setScrollViewH(e.nativeEvent.layout.height)}
      >
        {/* 상단 통계 (각 카드 2행: 아이콘+숫자 / 라벨) */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <Image source={COIN_IMG} style={styles.statIconSm} />
              <Txt typography="t4" color={TEXT_PRIMARY}>{state.coins.toLocaleString()}</Txt>
            </View>
            <Txt typography="c1" color={TEXT_SECONDARY}>코인</Txt>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <Image source={EGG_IMG} style={styles.statIconSm} />
              <Txt typography="t4" color={TEXT_PRIMARY}>{state.eggs}</Txt>
            </View>
            <Txt typography="c1" color={TEXT_SECONDARY}>알</Txt>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <Text style={styles.statEmojiSm}>⚡</Text>
              <Txt typography="t4" color={TEXT_PRIMARY}>{hourlyRate.toFixed(1)}</Txt>
            </View>
            <Txt typography="c1" color={TEXT_SECONDARY}>시간당</Txt>
          </View>
        </View>

        {/* 농장 비주얼 */}
        <ImageBackground source={FARM_BG} style={styles.farm} imageStyle={styles.farmBg}>
          <View style={styles.slotGrid}>
            {Array.from({ length: FARM_SLOTS }, (_, i) => {
              const petId = state.farmPets[i];
              const def = petId ? PET_MAP[petId] : null;
              const star = petId ? state.ownedStars[petId] ?? 0 : 0;
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.slot}
                  onPress={() => def && petId && setSelectedPetId(petId)}
                  activeOpacity={def ? 0.7 : 1}
                  disabled={!def}
                >
                  {def ? (
                    <>
                      <PetWithHat petId={petId!} stage={petStage(petId!)} style={styles.petImg} />
                      {star > 0 && (
                        <View style={styles.starBadge}>
                          <Text style={styles.starText}>★{star}</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <Image source={NEST_IMG} style={styles.nestImg} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ImageBackground>

        {/* 수확 버튼 (1행) */}
        <TouchableOpacity style={styles.harvestBtn} onPress={handleHarvest} activeOpacity={0.85}>
          <Image source={COIN_IMG} style={styles.harvestIcon} />
          <Txt typography="t4" color="#FFFFFF" style={{ flex: 1 }}>
            코인 수확하기{pendingCoins > 0 ? ` (+${pendingCoins.toLocaleString()})` : ''}
          </Txt>
          <Text style={styles.harvestArrow}>›</Text>
        </TouchableOpacity>

        {/* 배너 광고 (수확 버튼 아래) */}
        <InlineAd adGroupId={BANNER_HOME} variant="expanded" impressFallbackOnMount />

        {/* 출석 (오늘 안 받았으면 노출) */}
        {remaining.attendance > 0 && (
          <TouchableOpacity style={styles.attendanceCard} onPress={handleAttendance} activeOpacity={0.85}>
            <Text style={styles.attendanceEmoji}>📅</Text>
            <View style={{ flex: 1 }}>
              <Txt typography="t5" color={TEXT_PRIMARY}>오늘의 출석 보상</Txt>
              <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 2 }}>광고 보고 알 1개</Txt>
            </View>
            <Text style={styles.cardArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* 액션 타일 (1열) */}
        <ActionTile
          image={EGG_IMG}
          label="알 받기"
          sub={`${remaining.egg}/3 남음`}
          onPress={() => navigation.navigate('/eggs')}
        />
        <ActionTile
          emoji="🎮"
          label="먹이잡기"
          sub={`${remaining.game}/3 남음`}
          onPress={() => navigation.navigate('/guide')}
        />
        <ActionTile
          emoji="📖"
          label="도감"
          sub={`${Object.keys(state.ownedStars).filter(k => state.ownedStars[k] > 0).length}/8`}
          onPress={() => navigation.navigate('/dex')}
        />

        {/* 이미지 광고 (보상 안내 위) */}
        <InlineAd adGroupId={IMG_HOME} variant="card" impressFallbackOnMount />

        {/* 보상 안내 */}
        <View style={styles.guide}>
          <Txt typography="t5" color={TEXT_PRIMARY} style={{ marginBottom: 8 }}>보상 안내</Txt>
          {[
            { icon: '🌟', text: '농장의 펫이 시간당 코인을 모아줘요' },
            { icon: '⏱', text: '오프라인 누적은 최대 8시간까지 모여요' },
            { icon: '🥚', text: '알을 부화시켜 새 펫을 모아보세요' },
            { icon: '⭐', text: '중복 펫은 별이 올라 생산량 UP' },
            { icon: '💰', text: '100 코인 = 1원 토스포인트' },
          ].map(({ icon, text }) => (
            <View key={text} style={styles.guideRow}>
              <Text style={styles.guideIcon}>{icon}</Text>
              <Txt typography="t5" color={TEXT_SECONDARY}>{text}</Txt>
            </View>
          ))}
        </View>

        {/* 포인트 교환 카드 (보상 안내 아래) */}
        <View onLayout={(e) => setExchangeY(e.nativeEvent.layout.y)}>
          <ActionTile
            image={COIN_IMG}
            label="포인트 교환"
            sub={`${state.coins.toLocaleString()} 코인 보유`}
            onPress={() => navigation.navigate('/exchange')}
          />
        </View>

        <TouchableOpacity activeOpacity={1} onPress={handleVersionTap}>
          <Txt typography="c1" color={TEXT_MUTED} style={styles.version}>v1.0.32</Txt>
        </TouchableOpacity>
      </ScrollView>

      {pillVisible && (
        <TouchableOpacity
          style={styles.floatingPill}
          onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
          activeOpacity={0.85}
        >
          <Text style={styles.pillIcon}>💰</Text>
          <Txt typography="c1" color="#FFFFFF">아래로 스크롤하면 포인트 교환</Txt>
        </TouchableOpacity>
      )}

      <PetDetailSheet
        petId={selectedPetId}
        onClose={() => setSelectedPetId(null)}
        onBuyStones={() => { setSelectedPetId(null); navigation.navigate('/stones'); }}
        onOpenGuide={() => { setSelectedPetId(null); navigation.navigate('/evolution-guide'); }}
      />
    </View>
  );
}

function ActionTile({
  emoji, image, label, sub, onPress,
}: {
  emoji?: string;
  image?: { uri: string };
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionTile} onPress={onPress} activeOpacity={0.8}>
      {image ? (
        <Image source={image} style={styles.actionImg} />
      ) : (
        <Text style={styles.actionEmoji}>{emoji}</Text>
      )}
      <View style={{ flex: 1 }}>
        <Txt typography="t5" color={TEXT_PRIMARY}>{label}</Txt>
        <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 2 }}>{sub}</Txt>
      </View>
      <Text style={styles.actionArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24, gap: 14 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingVertical: 10, paddingHorizontal: 12, gap: 2,
    borderWidth: 1, borderColor: CARD_BORDER,
    alignItems: 'flex-start',
  },
  statTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statIconSm: { width: 22, height: 22 },
  statEmojiSm: { fontSize: 20, width: 22, textAlign: 'center' },

  farm: { width: '100%', aspectRatio: 1, borderRadius: 20, overflow: 'hidden' },
  farmBg: { borderRadius: 20 },
  slotGrid: {
    flex: 1, paddingHorizontal: 8, paddingBottom: 18,
    flexDirection: 'row', flexWrap: 'nowrap',
    alignItems: 'flex-end', justifyContent: 'space-around',
  },
  slot: {
    flex: 1, aspectRatio: 1, maxWidth: 72,
    alignItems: 'center', justifyContent: 'center',
  },
  petImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  nestImg: { width: '78%', height: '78%', resizeMode: 'contain', opacity: 0.9 },
  starBadge: {
    position: 'absolute', top: 0, right: 4,
    backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2,
  },
  starText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  harvestBtn: {
    backgroundColor: PRIMARY, borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: PRIMARY_DARK, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  harvestIcon: { width: 40, height: 40 },
  harvestArrow: { fontSize: 24, color: '#FFFFFF', fontWeight: '700' },

  attendanceCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  attendanceEmoji: { fontSize: 24 },
  cardArrow: { fontSize: 20, color: '#B0B8C1' },

  actionTile: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  actionImg: { width: 40, height: 40, resizeMode: 'contain' },
  actionEmoji: { fontSize: 28, width: 40, textAlign: 'center' },
  actionArrow: { fontSize: 20, color: '#B0B8C1', fontWeight: '700' },

  floatingPill: {
    position: 'absolute', bottom: 20, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: PRIMARY_DARK, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 6,
  },
  pillIcon: { fontSize: 14, color: '#FFFFFF' },

  guide: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 8,
    borderWidth: 1, borderColor: '#F2F4F6',
  },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guideIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  version: { textAlign: 'center', marginTop: 4 },
});
