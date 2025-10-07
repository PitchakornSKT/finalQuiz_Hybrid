import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'app_token';
const USER_KEY = 'app_user';

// Interface สำหรับข้อมูลผู้ใช้
interface User {
  _id: string;
  email: string;
  firstname?: string;
  lastname?: string;
}

export default function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuthData();
  }, []);

  const loadAuthData = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(KEY),
        AsyncStorage.getItem(USER_KEY)
      ]);

      if (storedToken) {
        setToken(storedToken);
      }

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
    } finally {
      setLoading(false);
    }
  };

  const save = async (t: string) => {
    try {
      await AsyncStorage.setItem(KEY, t);
      setToken(t);
      
      // เมื่อมี token แล้วให้ดึงข้อมูล user (ปรับตาม API ของคุณ)
      // await fetchAndSaveUserData(t);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  };

  const saveUser = async (userData: User) => {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(KEY),
        AsyncStorage.removeItem(USER_KEY)
      ]);
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // ฟังก์ชันสำหรับดึงข้อมูลผู้ใช้จาก API (ปรับตาม API จริงของคุณ)
  const fetchAndSaveUserData = async (authToken: string) => {
    try {
      // ตัวอย่างการดึงข้อมูลผู้ใช้ - ปรับ URL และ headers ตาม API จริง
      const response = await fetch('https://cis.kku.ac.th/api/classroom/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'accept': 'application/json',
          'x-api-key': '51bd9c1b9b33adc23964465d24add4a9cc0e2c04589a35d65ef6a872f38ff585'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          await saveUser(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // อัพเดท useEffect เพื่อดึงข้อมูลผู้ใช้เมื่อมี token
  useEffect(() => {
    if (token && !user) {
      fetchAndSaveUserData(token);
    }
  }, [token, user]);

  return { 
    token, 
    user, 
    save, 
    saveUser, 
    logout, 
    loading 
  };
}