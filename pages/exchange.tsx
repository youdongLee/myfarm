import { InlineAd } from '@apps-in-toss/framework';
import { createRoute, Image } from '@granite-js/react-native';
import { PageNavbar, Txt } from '@toss/tds-react-native';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BANNER_EXCHANGE } from '../src/constants/ads';
import { EXCHANGE_TIERS } from '../src/constants/economy';
import { IMG } from '../src/constants/imageData';
import {
  BG, CARD_BORDER, PRIMARY, PRIMARY_DARK, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY,
} from '../src/constants/theme';
import { useMyfarm } from '../stores/MyfarmContext';

export const Route = createRoute('/exchange', {
  component: ExchangePage,
  screenOptions: { title: '포인트 교환' },
});

const COIN_IMG = IMG.coin;

// TODO: 콘솔에서 발급받은 실제 프로모션 코드로 교체
const PROMO_CODES: Record<number, string> = {
  5: 'TEST_PROMO_5',
  10: 'TEST_PROMO_10',
  20: 'TEST_PROMO_20',
};

function ExchangePage() {
  const { state, remaining, exchangeCoins } = useMyfarm();

  const handleExchange = async (coin: number, won: number) => {
    if (remaining.exchange <= 0) {
      Alert.alert('오늘 이미 교환했어요', '내일 다시 시도해주세요.');
      return;
    }
    if (state.coins < coin) {
      Alert.alert('코인이 부족해요', `${coin} 코인이 필요해요.`);
      return;
    }
    const promo = PROMO_CODES[won];
    if (promo?.startsWith('TEST_')) {
      // 개발 환경: 광고/프로모션 생략
      const ok = await exchangeCoins(coin, won);
      if (ok) Alert.alert('🎁 교환 완료', `${won}원이 토스포인트로 지급될 예정이에요. (TEST 모드)`);
      return;
    }
    // TODO: 실 환경 — runRewardAd + grantPromotionReward
    const ok = await exchangeCoins(coin, won);
    if (ok) Alert.alert('🎁 교환 완료', `토스포인트 ${won}원이 지급됐어요!`);
  };

  return (
    <View style={styles.container}>
      <PageNavbar />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <InlineAd adGroupId={BANNER_EXCHANGE} variant="expanded" impressFallbackOnMount />

        <View style={styles.summary}>
          <Image source={COIN_IMG} style={styles.summaryIcon} />
          <View style={{ flex: 1 }}>
            <Txt typography="t4" color={TEXT_PRIMARY}>{state.coins.toLocaleString()} 코인</Txt>
            <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 2 }}>100 코인 = 1원</Txt>
          </View>
        </View>

        <View style={styles.tiers}>
          {EXCHANGE_TIERS.map(({ coin, won }) => {
            const ok = state.coins >= coin;
            return (
              <TouchableOpacity
                key={coin}
                style={[styles.tier, !ok && styles.tierDisabled]}
                onPress={() => handleExchange(coin, won)}
                activeOpacity={ok ? 0.7 : 1}
              >
                <View style={{ flex: 1 }}>
                  <Txt typography="t4" color={ok ? TEXT_PRIMARY : TEXT_MUTED}>{coin} 코인</Txt>
                  <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 2 }}>
                    토스포인트 {won}원으로 교환
                  </Txt>
                </View>
                <Text style={[styles.arrow, ok && { color: PRIMARY }]}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.notice}>
          <Txt typography="c1" color={TEXT_MUTED}>
            • 교환은 하루 1회만 가능해요
          </Txt>
          <Txt typography="c1" color={TEXT_MUTED}>
            • 오늘 남은 횟수: {remaining.exchange}/1
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
  tiers: { gap: 10 },
  tier: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  tierDisabled: { opacity: 0.5 },
  arrow: { fontSize: 22, color: '#B0B8C1' },
  notice: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, gap: 4,
  },
});
