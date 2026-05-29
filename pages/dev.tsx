import { createRoute } from '@granite-js/react-native';
import { Button, PageNavbar, Txt } from '@toss/tds-react-native';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MAX_STAGE, MAX_STAR, PETS, STAGE_LABEL } from '../src/constants/pets';
import {
  BG, CARD_BORDER, PRIMARY, PRIMARY_DARK, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY,
} from '../src/constants/theme';
import { useMyfarm } from '../stores/MyfarmContext';

export const Route = createRoute('/dev', {
  component: DevPage,
  screenOptions: { title: 'DEV' },
});

function DevPage() {
  const {
    state, hourlyRate, pendingCoins, remaining,
    resetAll, grantStones, devUnlockAll, devSetStar, devSetStage, petStage,
  } = useMyfarm();

  const handleReset = () => {
    Alert.alert('초기화하시겠어요?', '모든 진행 상태가 사라집니다.', [
      { text: '취소', style: 'cancel' },
      { text: '초기화', style: 'destructive', onPress: async () => {
        await resetAll();
        Alert.alert('초기화 완료');
      } },
    ]);
  };

  return (
    <View style={styles.container}>
      <PageNavbar />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Txt typography="t5" color={TEXT_PRIMARY}>현재 상태</Txt>
          <Row label="코인" value={state.coins.toString()} />
          <Row label="알" value={state.eggs.toString()} />
          <Row label="시간당 생산" value={hourlyRate.toFixed(2)} />
          <Row label="대기 중 코인" value={pendingCoins.toString()} />
          <Row label="누적 토스포인트" value={`${state.totalEarnedWon}원`} />
          <Row label="진화석" value={state.evolveStones.toString()} />
          <Row label="농장 펫" value={state.farmPets.filter(Boolean).join(', ') || '없음'} />
          <Row label="부화 중" value={state.hatching.length.toString()} />
        </View>

        <View style={styles.card}>
          <Txt typography="t5" color={TEXT_PRIMARY}>오늘 잔여 횟수</Txt>
          <Row label="출석" value={`${remaining.attendance}/1`} />
          <Row label="알 받기" value={`${remaining.egg}/6`} />
          <Row label="게임" value={`${remaining.game}/3`} />
          <Row label="먹이주기" value={`${remaining.feed}/5`} />
          <Row label="교환" value={`${remaining.exchange}/1`} />
        </View>

        {/* 펫 테스트 */}
        <View style={styles.card}>
          <View style={styles.petHeader}>
            <Txt typography="t5" color={TEXT_PRIMARY}>펫 테스트</Txt>
            <TouchableOpacity
              style={styles.summonBtn}
              onPress={async () => { await devUnlockAll(); Alert.alert('모든 펫 소환', '8종을 1성으로 소환하고 농장을 채웠어요.'); }}
              activeOpacity={0.8}
            >
              <Txt typography="c1" color="#FFFFFF">모든 펫 소환</Txt>
            </TouchableOpacity>
          </View>

          {PETS.map((p) => {
            const star = state.ownedStars[p.id] ?? 0;
            const stage = petStage(p.id);
            const owned = star > 0;
            return (
              <View key={p.id} style={styles.petRow}>
                <View style={{ flex: 1 }}>
                  <Txt typography="t5" color={TEXT_PRIMARY}>{p.name}</Txt>
                  <Txt typography="c1" color={owned ? PRIMARY_DARK : TEXT_MUTED}>
                    {owned ? `${STAGE_LABEL[stage]} · ★${star}/${MAX_STAR}` : '미보유'}
                  </Txt>
                </View>
                <View style={styles.stepGroup}>
                  <Txt typography="c1" color={TEXT_SECONDARY}>성</Txt>
                  <StepBtn label="−" onPress={() => devSetStar(p.id, star - 1)} />
                  <StepBtn label="+" onPress={() => devSetStar(p.id, star + 1)} />
                </View>
                <View style={styles.stepGroup}>
                  <Txt typography="c1" color={TEXT_SECONDARY}>진화</Txt>
                  <StepBtn label="−" onPress={() => devSetStage(p.id, stage - 1)} />
                  <StepBtn label="+" onPress={() => devSetStage(p.id, stage + 1)} />
                </View>
              </View>
            );
          })}
          <Txt typography="c1" color={TEXT_MUTED} style={{ marginTop: 4 }}>
            성: 0(미보유)~{MAX_STAR}, 진화: 아기~성인({MAX_STAGE})
          </Txt>
        </View>

        <Button
          type="primary"
          size="large"
          onPress={async () => { await grantStones(10); Alert.alert('진화석 +10', '테스트용 진화석 10개를 지급했어요.'); }}
          display="block"
        >
          진화석 10개 지급 (테스트)
        </Button>

        <Button type="primary" size="large" onPress={handleReset} display="block">
          전체 초기화
        </Button>
      </ScrollView>
    </View>
  );
}

function StepBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.stepBtn} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.stepBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Txt typography="c1" color={TEXT_SECONDARY}>{label}</Txt>
      <Txt typography="c1" color={TEXT_PRIMARY}>{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 24 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 8,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F2F4F6',
  },
  petHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  summonBtn: {
    backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
  },
  petRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F2F4F6',
  },
  stepGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: PRIMARY, backgroundColor: '#FFFBEB',
  },
  stepBtnText: { fontSize: 16, fontWeight: '700', color: PRIMARY_DARK },
});
