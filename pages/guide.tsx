import { InlineAd } from '@apps-in-toss/framework';
import { createRoute, Image } from '@granite-js/react-native';
import { Button, PageNavbar, Txt } from '@toss/tds-react-native';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IMG_GUIDE } from '../src/constants/ads';
import { IMG } from '../src/constants/imageData';
import {
  BG, CARD_BORDER, TEXT_PRIMARY, TEXT_SECONDARY,
} from '../src/constants/theme';

export const Route = createRoute('/guide', {
  component: GuidePage,
  screenOptions: { title: '먹이잡기 안내' },
});

const CARROT = IMG.food_carrot;
const APPLE = IMG.food_golden_apple;
const BOMB = IMG.food_bomb;

function GuidePage() {
  const navigation = Route.useNavigation();

  return (
    <View style={styles.container}>
      <PageNavbar />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.intro}>
          <Txt typography="t3" color={TEXT_PRIMARY}>🎮 먹이잡기 게임</Txt>
          <Txt typography="t5" color={TEXT_SECONDARY} style={{ marginTop: 6 }}>
            10초 동안 떨어지는 먹이를 탭해서 점수를 모아보세요
          </Txt>
        </View>

        <View style={styles.rule}>
          <RuleRow img={CARROT} title="일반 먹이" desc="당근/씨앗/뼈다귀 — 점수 +1" />
          <RuleRow img={APPLE} title="황금사과" desc="점수 +3 (보너스!)" />
          <RuleRow img={BOMB} title="폭탄" desc="피하세요! 점수 -3" />
        </View>

        <View style={styles.tips}>
          <Txt typography="t5" color={TEXT_PRIMARY}>🎁 보상</Txt>
          <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 6 }}>
            • 점수 × 2 만큼 코인 획득{'\n'}
            • 30점 이상이면 황금알 보너스 30% 확률
          </Txt>
        </View>

        <View style={styles.adWrap}>
          <InlineAd adGroupId={IMG_GUIDE} variant="card" impressFallbackOnMount />
        </View>

        <Button
          type="primary"
          size="large"
          onPress={() => navigation.navigate('/game')}
          display="block"
        >
          시작하기
        </Button>
      </ScrollView>
    </View>
  );
}

function RuleRow({ img, title, desc }: { img: any; title: string; desc: string }) {
  return (
    <View style={styles.ruleRow}>
      <Image source={img} style={styles.ruleImg} />
      <View style={{ flex: 1 }}>
        <Txt typography="t5" color={TEXT_PRIMARY}>{title}</Txt>
        <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 2 }}>{desc}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 24 },
  intro: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  rule: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 8,
    borderWidth: 1, borderColor: CARD_BORDER, gap: 4,
  },
  ruleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8,
  },
  ruleImg: { width: 44, height: 44, resizeMode: 'contain' },
  tips: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  adWrap: { width: '100%' },
});
