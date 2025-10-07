import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TextInput, TouchableOpacity } from 'react-native';
import useAuth from '../src/hooks/useAuth';

export default function ClassScreen() {
  const { token } = useAuth();
  const [year, setYear] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const API_KEY = '51bd9c1b9b33adc23964465d24add4a9cc0e2c04589a35d65ef6a872f38ff585';

  const fetchStudents = async () => {
    if (!year) return Alert.alert('กรุณากรอกปีที่เข้าศึกษา');
    setLoading(true);
    try {
      const res = await fetch(`https://cis.kku.ac.th/api/classroom/class/${year}`, {
        headers: {
          accept: 'application/json',
          'x-api-key': API_KEY,
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok || data.data) setStudents(data.data);
      else Alert.alert('Error', data.error || 'ไม่พบข้อมูล');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputBox}>
        <TextInput placeholder="ปีที่เข้าศึกษา เช่น 2565" value={year} onChangeText={setYear} style={styles.input} keyboardType="numeric" />
        <TouchableOpacity onPress={fetchStudents} style={styles.button}>
          <Text style={styles.buttonText}>ค้นหา</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2b6cb0" style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text>{item.firstname} {item.lastname}</Text>
              <Text>{item.email}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  inputBox: { flexDirection: 'row', marginBottom: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8 },
  button: { backgroundColor: '#2b6cb0', padding: 12, marginLeft: 8, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  card: { padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12 },
});
