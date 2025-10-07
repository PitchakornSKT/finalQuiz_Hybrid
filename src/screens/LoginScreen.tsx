import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import useAuth from '../hooks/useAuth';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { save } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const onLogin = async () => {
    if (!email || !password) {
      return Alert.alert('กรุณากรอกข้อมูลให้ครบ');
    }

    if (!email.includes('@')) {
      return Alert.alert('รูปแบบอีเมลไม่ถูกต้อง');
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
        await save(data.data.token);
        Alert.alert('เข้าสู่ระบบสำเร็จ', `ยินดีต้อนรับ ${data.data.firstname}`);
        router.replace('/feed');
      } else {
        Alert.alert('เข้าสู่ระบบไม่สำเร็จ', data.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#007AFF', '#5856D6', '#AF52DE']}
        style={styles.background}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#FFFFFF', '#F2F2F7']}
                style={styles.logo}
              >
                <Ionicons name="school" size={40} color="#007AFF" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>CIS Classroom</Text>
            <Text style={styles.subtitle}>มหาวิทยาลัยขอนแก่น</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <LinearGradient
              colors={['#FFFFFF', '#F8F9FA']}
              style={styles.form}
            >
              <Text style={styles.formTitle}>เข้าสู่ระบบ</Text>
              
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Ionicons 
                  name="mail-outline" 
                  size={20} 
                  color={focusedInput === 'email' ? '#007AFF' : '#8E8E93'} 
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="อีเมลมหาวิทยาลัย"
                  placeholderTextColor="#8E8E93"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[
                    styles.input,
                    focusedInput === 'email' && styles.inputFocused
                  ]}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color={focusedInput === 'password' ? '#007AFF' : '#8E8E93'} 
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="รหัสผ่าน"
                  placeholderTextColor="#8E8E93"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  style={[
                    styles.input,
                    focusedInput === 'password' && styles.inputFocused
                  ]}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#8E8E93" 
                  />
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity 
                onPress={onLogin} 
                style={styles.button}
                disabled={loading}
              >
                <LinearGradient
                  colors={loading ? ['#C7C7CC', '#AEAEB2'] : ['#007AFF', '#5856D6']}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.buttonText}>เข้าสู่ระบบ</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Help Text */}
              <View style={styles.helpContainer}>
                <Text style={styles.helpText}>
                  ใช้บัญชีอีเมล @kkumail.com ของมหาวิทยาลัยขอนแก่น
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>CIS Classroom System</Text>
            <Text style={styles.footerSubtext}>มหาวิทยาลัยขอนแก่น</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    minHeight: height,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  formContainer: {
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  form: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  inputFocused: {
    borderColor: '#007AFF',
  },
  eyeIcon: {
    padding: 16,
    paddingLeft: 12,
  },
  button: {
    borderRadius: 14,
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  helpContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  helpText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
});