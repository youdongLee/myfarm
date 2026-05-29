import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const Route = createRoute('/_404', {
  component: NotFoundPage,
  screenOptions: { headerShown: false },
});

function NotFoundPage() {
  const navigation = Route.useNavigation();
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🐾</Text>
      <Text style={styles.text}>페이지를 찾을 수 없어요</Text>
      <TouchableOpacity onPress={() => navigation.navigate('/')}>
        <Text style={styles.link}>홈으로 돌아가기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#FFFBEB' },
  emoji: { fontSize: 48 },
  text: { fontSize: 16, color: '#8B95A1' },
  link: { color: '#FFB84D', fontWeight: '600', fontSize: 15 },
});
