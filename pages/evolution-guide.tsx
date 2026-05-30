import { createRoute } from '@granite-js/react-native';
import { PageNavbar, Txt } from '@toss/tds-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PetWithHat } from '../src/components/PetWithHat';
import { EVOLVE_STONE_COST } from '../src/constants/economy';
import { MAX_STAGE, PET_MAP, STAGE_LABEL, STAGE_MULTIPLIER } from '../src/constants/pets';
import {
  BG, CARD_BORDER, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY,
} from '../src/constants/theme';

export const Route = createRoute('/evolution-guide', {
  component: EvolutionGuidePage,
  screenOptions: { title: '진화 안내' },
});

const EXAMPLE_PET_ID = 'gecko';
const STAGES = [0, 1, 2, 3];

function EvolutionGuidePage() {
  const def = PET_MAP[EXAMPLE_PET_ID];
  const base1Star = def?.coinPerHour?.[0] ?? 0; // 게코 1성 기준 = 4

  return (
    <View style={styles.container}>
      <PageNavbar />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.intro}>
          <Txt typography="t3" color={TEXT_PRIMARY}>🪄 진화 시스템</Txt>
          <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 8 }}>
            반려동물을 별 ★5성까지 키운 뒤 진화석으로 진화시키면, 외모(모자)가 바뀌고 코인 생산량이 ×3씩 늘어요.
          </Txt>
          <Txt typography="c1" color={PRIMARY_DARK} style={{ marginTop: 6 }}>
            아래는 전설 펫 게코의 ★1성 기준 예시예요.
          </Txt>
        </View>

        {STAGES.map((stage) => {
          const rate = base1Star * (STAGE_MULTIPLIER[stage] ?? 1);
          const isLast = stage === MAX_STAGE;
          return (
            <View key={stage}>
              <View style={styles.stageCard}>
                <View style={styles.petBox}>
                  <PetWithHat petId={EXAMPLE_PET_ID} stage={stage} style={styles.petImg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt typography="t4" color={TEXT_PRIMARY}>{STAGE_LABEL[stage]} 게코</Txt>
                  <Txt typography="t5" color={PRIMARY_DARK} style={{ marginTop: 6 }}>
                    ★1성 · 시간당 {rate} 코인
                  </Txt>
                  <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 2 }}>
                    아기 대비 ×{STAGE_MULTIPLIER[stage]}
                  </Txt>
                </View>
              </View>
              {!isLast && (
                <View style={styles.arrowRow}>
                  <Text style={styles.arrowIcon}>↓</Text>
                  <View style={styles.stonePill}>
                    <Text style={styles.gemEmoji}>💎</Text>
                    <Txt typography="c1" color={PRIMARY_DARK}>진화석 {EVOLVE_STONE_COST[stage]}개로 진화</Txt>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.notice}>
          <Txt typography="c1" color={TEXT_MUTED}>• 진화 후 별은 ★1성부터 다시 모아요</Txt>
          <Txt typography="c1" color={TEXT_MUTED}>• ★5성 만렙에서만 다음 단계로 진화 가능</Txt>
          <Txt typography="c1" color={TEXT_MUTED}>• 진화석은 상점에서 인앱결제로 구매할 수 있어요</Txt>
          <Txt typography="c1" color={TEXT_MUTED}>• 다른 등급(일반/희귀)도 같은 ×3 사다리로 진화해요</Txt>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
  intro: {
    backgroundColor: PRIMARY_LIGHT, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  stageCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  petBox: {
    width: 96, height: 96, alignItems: 'center', justifyContent: 'center',
    backgroundColor: PRIMARY_LIGHT, borderRadius: 14,
  },
  petImg: { width: 88, height: 88 },
  arrowRow: { alignItems: 'center', gap: 6, paddingVertical: 4 },
  arrowIcon: { fontSize: 20, color: TEXT_MUTED },
  stonePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFBEB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: PRIMARY,
  },
  gemEmoji: { fontSize: 14 },
  notice: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, gap: 4, marginTop: 4,
  },
});
