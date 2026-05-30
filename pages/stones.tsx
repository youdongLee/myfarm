import { createRoute } from '@granite-js/react-native';
import { PageNavbar, Txt } from '@toss/tds-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { STONE_BY_SKU, STONE_PRODUCTS } from '../src/constants/iap';
import {
  BG, CARD_BORDER, PRIMARY, PRIMARY_LIGHT, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY,
} from '../src/constants/theme';
import { fetchProducts, purchaseProduct, RemoteProduct } from '../src/lib/iap';
import { useMyfarm } from '../stores/MyfarmContext';

export const Route = createRoute('/stones', {
  component: StonesPage,
  screenOptions: { title: '진화석 상점' },
});

function StonesPage() {
  const navigation = Route.useNavigation();
  const { state, grantStones } = useMyfarm();
  const [remote, setRemote] = useState<RemoteProduct[] | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchProducts(new Set(Object.keys(STONE_BY_SKU))).then((list) => { if (alive) setRemote(list); });
    return () => { alive = false; };
  }, []);

  const remoteBySku: Record<string, RemoteProduct> = {};
  (remote ?? []).forEach((p) => { remoteBySku[p.sku] = p; });

  const handleBuy = (sku: string) => {
    if (buying) return;
    Alert.alert(
      '구매 전 안내',
      '진화석은 이 기기에 저장돼요.\n\n구매 후 사용하지 않은 진화석이 남아 있는 상태에서 기기를 변경하면, 남은 진화석은 복원되지 않고 사라질 수 있어요.\n\n이에 동의하시면 구매를 진행해주세요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '구매 진행', onPress: () => startPurchase(sku) },
      ],
    );
  };

  const startPurchase = (sku: string) => {
    if (buying) return;
    setBuying(sku);
    purchaseProduct(
      sku,
      async () => {
        const n = STONE_BY_SKU[sku] ?? 0;
        if (n > 0) await grantStones(n);
      },
      () => {
        setBuying(null);
        Alert.alert('🎉 구매 완료', '진화석이 지급됐어요!');
      },
      () => {
        setBuying(null);
        Alert.alert('결제가 취소됐어요', '잠시 후 다시 시도해주세요.');
      },
    );
  };

  return (
    <View style={styles.container}>
      <PageNavbar />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.balance}>
          <Text style={styles.gem}>💎</Text>
          <View style={{ flex: 1 }}>
            <Txt typography="t4" color={TEXT_PRIMARY}>보유 진화석 {state.evolveStones}개</Txt>
            <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 2 }}>
              진화석으로 반려동물을 다음 단계로 진화시켜요
            </Txt>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('/evolution-guide')}
          activeOpacity={0.7}
          style={styles.guideLink}
        >
          <Txt typography="c1" color={PRIMARY}>진화란? 자세히 알아보기 ›</Txt>
        </TouchableOpacity>

        {remote === null ? (
          <View style={styles.loading}>
            <ActivityIndicator color={PRIMARY} />
          </View>
        ) : (
          STONE_PRODUCTS.map((p) => {
            const r = remoteBySku[p.sku];
            const available = !!r;
            const isBuying = buying === p.sku;
            return (
              <TouchableOpacity
                key={p.sku}
                style={[styles.product, !available && styles.productDisabled]}
                onPress={() => available && handleBuy(p.sku)}
                activeOpacity={available ? 0.8 : 1}
                disabled={!available || isBuying}
              >
                <Text style={styles.productGem}>💎</Text>
                <View style={{ flex: 1 }}>
                  <Txt typography="t5" color={TEXT_PRIMARY}>{r?.displayName ?? p.label}</Txt>
                  <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 2 }}>
                    {available ? r!.displayAmount : '준비 중 (콘솔 등록 후 구매 가능)'}
                  </Txt>
                </View>
                <View style={[styles.buyBtn, !available && styles.buyBtnDisabled]}>
                  <Txt typography="t5" color={available ? '#FFFFFF' : TEXT_MUTED}>
                    {isBuying ? '결제 중' : available ? '구매' : '준비 중'}
                  </Txt>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.notice}>
          <Txt typography="c1" color={TEXT_MUTED}>• 진화석은 반려동물 진화에 사용되는 유료 아이템이에요.</Txt>
          <Txt typography="c1" color={TEXT_MUTED}>• 결제·환불은 앱마켓 정책을 따라요.</Txt>
          <Txt typography="c1" color={TEXT_MUTED}>• 미사용 진화석은 기기 변경 시 복원되지 않아요.</Txt>
          <Txt typography="c1" color={TEXT_MUTED}>• 진화석은 생산 속도를 높일 뿐, 포인트 지급 한도와는 무관해요.</Txt>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 24 },
  balance: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: PRIMARY_LIGHT, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  gem: { fontSize: 36 },
  guideLink: { alignItems: 'center', paddingVertical: 4 },
  loading: { paddingVertical: 40, alignItems: 'center' },
  product: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  productDisabled: { opacity: 0.6 },
  productGem: { fontSize: 26 },
  buyBtn: {
    backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  buyBtnDisabled: { backgroundColor: '#F3F4F6' },
  notice: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, gap: 4,
  },
});
