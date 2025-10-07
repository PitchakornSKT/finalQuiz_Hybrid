// app/index.tsx
import React from 'react';
import { View, Text } from 'react-native';
import LoginScreen from '../src/screens/LoginScreen';

export default function Home() {
  return (
    <View style={{ flex: 1 }}>
      <LoginScreen />
    </View>
  );
}
