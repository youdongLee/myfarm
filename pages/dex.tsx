import { InlineAd } from '@apps-in-toss/framework';
import { createRoute } from '@granite-js/react-native';
import { PageNavbar, Txt } from '@toss/tds-react-native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BANNER_DEX } from '../src/constants/ads';
import { PetWithHat } from '../src/components/PetWithHat';
import { MAX_STAR, PETS, RARITY_COLOR, RARITY_LABEL, STAGE_LABEL } from '../src/constants/pets';
import {
  BG, CARD_BORDER, PRIMARY, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY,
} from '../src/constants/theme';
import { useMyfarm } from '../stores/MyfarmContext';

export const Route = createRoute('/dex', {
  component: DexPage,
  screenOptions: { title: '도감' },
});

function DexPage() {
  const { state, swapFarmPet, petStage } = useMyfarm();
  const [selected, setSelected] = useState<string | null>(null);

  const collected = PETS.filter(p => (state.ownedStars[p.id] ?? 0) > 0).length;

  const placeInFarm = async (petId: string) => {
    if ((state.ownedStars[petId] ?? 0) < 1) {
      Alert.alert('아직 만나지 못한 펫이에요', '알을 부화시켜 만나보세요!');
      return;
    }
    if (state.farmPets.includes(petId)) {
      // 농장에서 빼기
      const slot = state.farmPets.indexOf(petId);
      await swapFarmPet(slot, null);
      return;
    }
    // 빈 슬롯 찾기
    const emptySlot = state.farmPets.indexOf(null);
    if (emptySlot >= 0) {
      await swapFarmPet(emptySlot, petId);
    } else {
      Alert.alert('농장이 꽉 찼어요', '다른 펫을 농장에서 빼주세요.');
    }
  };

  const renderDexCard = (p: typeof PETS[number]) => {
    const star = state.ownedStars[p.id] ?? 0;
    const owned = star > 0;
    const stage = petStage(p.id);
    const inFarm = state.farmPets.includes(p.id);
    return (
      <TouchableOpacity
        key={p.id}
        style={[styles.card, !owned && styles.cardLocked, inFarm && styles.cardInFarm]}
        onPress={() => owned && placeInFarm(p.id)}
        activeOpacity={owned ? 0.7 : 1}
      >
        <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLOR[p.rarity] }]}>
          <Text style={styles.rarityText}>{RARITY_LABEL[p.rarity]}</Text>
        </View>
        <PetWithHat
          petId={p.id}
          stage={owned ? stage : 0}
          style={[styles.petImg, !owned && styles.petImgLocked]}
        />
        <Txt typography="t5" color={owned ? TEXT_PRIMARY : TEXT_MUTED}>
          {owned && stage > 0 ? `${STAGE_LABEL[stage]} ${p.name}` : p.name}
        </Txt>
        <View style={styles.starRow}>
          {Array.from({ length: MAX_STAR }, (_, i) => (
            <Text key={i} style={[styles.star, i < star && styles.starOn]}>★</Text>
          ))}
        </View>
        {inFarm && (
          <View style={styles.inFarmTag}>
            <Text style={styles.inFarmTagText}>농장</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <PageNavbar />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summary}>
          <Txt typography="t4" color={TEXT_PRIMARY}>도감 {collected} / {PETS.length}</Txt>
          <Txt typography="c1" color={TEXT_SECONDARY} style={{ marginTop: 4 }}>
            같은 펫을 중복으로 모으면 별이 올라 생산량이 증가해요
          </Txt>
        </View>

        <View style={styles.grid}>
          {PETS.slice(0, 4).map((p) => renderDexCard(p))}
        </View>

        <InlineAd adGroupId={BANNER_DEX} variant="expanded" impressFallbackOnMount />

        <View style={styles.grid}>
          {PETS.slice(4).map((p) => renderDexCard(p))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 24 },
  summary: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '48%', flexGrow: 1, backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: CARD_BORDER,
  },
  cardLocked: { opacity: 0.7 },
  cardInFarm: { borderColor: PRIMARY, borderWidth: 2 },
  rarityBadge: {
    alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  rarityText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  petImg: { width: 90, height: 90, resizeMode: 'contain', marginVertical: 6 },
  petImgLocked: { opacity: 0.2 },
  starRow: { flexDirection: 'row', marginTop: 4 },
  star: { fontSize: 14, color: '#E5E7EB', marginHorizontal: 1 },
  starOn: { color: '#F59E0B' },
  inFarmTag: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: PRIMARY, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  inFarmTagText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});
