import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import useAuth from '../hooks/useAuth';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const { save } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email || !password) {
      return Alert.alert('กรุณากรอกข้อมูลให้ครบ');
    }

    setLoading(true);

    try {
      const res = await fetch('https://cis.kku.ac.th/api/classroom/signin', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': '51bd9c1b9b33adc23964465d24add4a9cc0e2c04589a35d65ef6a872f38ff585',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log('Login response:', data);

      if (res.ok) {
        await save(data.data.token);             // เก็บ token
        Alert.alert('เข้าสู่ระบบสำเร็จ', `ยินดีต้อนรับ ${data.data.firstname}`);
        router.replace('/feed');                 // ไปหน้า Feed
      } else {
        Alert.alert('Login failed', data.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('เกิดข้อผิดพลาด', String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>เข้าสู่ระบบ CIS</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <TouchableOpacity onPress={onLogin} style={styles.button} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'กำลังเข้าสู่ระบบ...' : 'Login'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginVertical: 8 },
  button: { backgroundColor: '#2b6cb0', padding: 12, borderRadius: 8, marginTop: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
