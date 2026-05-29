import { createRoute, Image } from '@granite-js/react-native';
import { Button, PageNavbar, Txt } from '@toss/tds-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Dimensions, StyleSheet, TouchableWithoutFeedback, View,
} from 'react-native';
import { AD_GAME } from '../src/constants/ads';
import {
  FOOD_POINTS,
  GAME_BONUS_EGG_CHANCE, GAME_BONUS_EGG_THRESHOLD, GAME_COIN_PER_POINT,
} from '../src/constants/economy';
import { IMG } from '../src/constants/imageData';
import {
  BG, CARD_BORDER, PRIMARY, PRIMARY_DARK, TEXT_PRIMARY, TEXT_SECONDARY,
} from '../src/constants/theme';
import { runRewardAd } from '../src/lib/rewardAd';
import { useMyfarm } from '../stores/MyfarmContext';

export const Route = createRoute('/game', {
  component: GamePage,
  screenOptions: { title: '먹이잡기' },
});

type FoodType = keyof typeof FOOD_POINTS;
const FOOD_IMAGES: Record<FoodType, { uri: string }> = {
  carrot: IMG.food_carrot,
  seed: IMG.food_seed,
  bone: IMG.food_bone,
  goldenApple: IMG.food_golden_apple,
  bomb: IMG.food_bomb,
};

interface FallingItem { id: number; x: number; y: number; type: FoodType; }

const GAME_DURATION = 10; // seconds
const COUNTDOWN = 3;
const TICK_MS = 60;
const FALL_SPEED = 6; // px per tick
const SPAWN_MS = 600;
const ITEM_SIZE = 56;

const SCREEN = Dimensions.get('window');
const PLAYFIELD_HEIGHT = Math.min(SCREEN.height - 320, 500);

function pickFoodType(): FoodType {
  const r = Math.random();
  // 65% common (carrot/seed/bone), 20% goldenApple, 15% bomb
  if (r < 0.65) {
    const commons: FoodType[] = ['carrot', 'seed', 'bone'];
    return commons[Math.floor(Math.random() * 3)];
  }
  if (r < 0.85) return 'goldenApple';
  return 'bomb';
}

function GamePage() {
  const navigation = Route.useNavigation();
  const { remaining, addGameReward } = useMyfarm();

  const [phase, setPhase] = useState<'ready' | 'countdown' | 'play' | 'end'>('ready');
  const [countdown, setCountdown] = useState(COUNTDOWN);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [score, setScore] = useState(0);
  const [playWidth, setPlayWidth] = useState(SCREEN.width - 32);
  const idCounter = useRef(0);
  const tappedIds = useRef<Set<number>>(new Set());
  const claimed = useRef(false);

  // 카운트다운
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('play');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // 게임 타이머
  useEffect(() => {
    if (phase !== 'play') return;
    if (timeLeft <= 0) {
      setPhase('end');
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  // 아이템 낙하 (틱)
  useEffect(() => {
    if (phase !== 'play') return;
    const id = setInterval(() => {
      setItems(prev => prev
        .map(it => ({ ...it, y: it.y + FALL_SPEED }))
        .filter(it => it.y < PLAYFIELD_HEIGHT)
      );
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase]);

  // 아이템 스폰
  useEffect(() => {
    if (phase !== 'play') return;
    const id = setInterval(() => {
      const x = Math.random() * (playWidth - ITEM_SIZE);
      setItems(prev => [...prev, { id: idCounter.current++, x, y: 0, type: pickFoodType() }]);
    }, SPAWN_MS);
    return () => clearInterval(id);
  }, [phase, playWidth]);

  const handleTap = (item: FallingItem) => {
    if (tappedIds.current.has(item.id)) return;
    tappedIds.current.add(item.id);
    setScore(s => s + FOOD_POINTS[item.type]);
    setItems(prev => prev.filter(it => it.id !== item.id));
  };

  const handleStart = () => {
    if (remaining.game <= 0) {
      Alert.alert('오늘 게임을 다 했어요', '내일 다시 시도해주세요.');
      return;
    }
    setCountdown(COUNTDOWN);
    setTimeLeft(GAME_DURATION);
    setScore(0);
    setItems([]);
    tappedIds.current.clear();
    claimed.current = false;
    setPhase('countdown');
  };

  const handleClaim = async () => {
    if (claimed.current) return;
    const finalScore = Math.max(0, score);
    const coin = finalScore * GAME_COIN_PER_POINT;
    const bonusEgg = finalScore >= GAME_BONUS_EGG_THRESHOLD && Math.random() < GAME_BONUS_EGG_CHANCE;
    const ok = await runRewardAd(AD_GAME, async () => {
      claimed.current = true;
      await addGameReward(coin, bonusEgg);
      Alert.alert(
        '🎉 게임 종료!',
        `+${coin} 코인${bonusEgg ? '\n+ 보너스 알 1개!' : ''}`,
        [{ text: '확인', onPress: () => navigation.goBack() }],
      );
    });
    if (!ok) Alert.alert('광고를 불러올 수 없어요', '잠시 후 다시 시도해주세요.');
  };

  return (
    <View style={styles.container}>
      <PageNavbar />

      {/* 상단 HUD */}
      <View style={styles.hud}>
        <Txt typography="t5" color={TEXT_PRIMARY}>점수 {score}</Txt>
        <Txt typography="t5" color={PRIMARY_DARK}>⏱ {phase === 'play' ? timeLeft : GAME_DURATION}초</Txt>
      </View>

      {/* 플레이 영역 */}
      <View
        style={[styles.playfield, { height: PLAYFIELD_HEIGHT }]}
        onLayout={(e) => setPlayWidth(e.nativeEvent.layout.width)}
      >
        {phase === 'ready' && (
          <View style={styles.overlay}>
            <Txt typography="t2" color={TEXT_PRIMARY}>준비됐나요?</Txt>
            <Txt typography="t5" color={TEXT_SECONDARY} style={{ marginTop: 8 }}>
              떨어지는 먹이를 탭해서 점수를 모아요{'\n'}폭탄은 피하세요!
            </Txt>
            <View style={{ marginTop: 24, width: 200 }}>
              <Button type="primary" size="large" onPress={handleStart} display="block">시작</Button>
            </View>
          </View>
        )}

        {phase === 'countdown' && (
          <View style={styles.overlay}>
            <Txt typography="t1" color={PRIMARY}>{countdown === 0 ? 'GO!' : countdown}</Txt>
          </View>
        )}

        {phase === 'play' && items.map(item => (
          <TouchableWithoutFeedback key={item.id} onPress={() => handleTap(item)}>
            <Image
              source={FOOD_IMAGES[item.type]}
              style={[styles.fallingItem, { left: item.x, top: item.y }]}
            />
          </TouchableWithoutFeedback>
        ))}

        {phase === 'end' && (
          <View style={styles.overlay}>
            <Txt typography="t2" color={TEXT_PRIMARY}>최종 점수</Txt>
            <Txt typography="t1" color={PRIMARY}>{Math.max(0, score)}점</Txt>
            <Txt typography="t5" color={TEXT_SECONDARY} style={{ marginTop: 8 }}>
              +{Math.max(0, score) * GAME_COIN_PER_POINT} 코인
              {score >= GAME_BONUS_EGG_THRESHOLD && '\n🥚 황금알 보너스 확률!'}
            </Txt>
            <View style={{ marginTop: 24, width: 240 }}>
              <Button type="primary" size="large" onPress={handleClaim} display="block">
                광고 보고 보상 받기
              </Button>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  hud: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, marginHorizontal: 16, marginTop: 8,
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: CARD_BORDER,
  },
  playfield: {
    margin: 16, backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: CARD_BORDER, overflow: 'hidden', position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  fallingItem: {
    position: 'absolute', width: ITEM_SIZE, height: ITEM_SIZE, resizeMode: 'contain',
  },
});
