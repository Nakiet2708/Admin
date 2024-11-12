import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"; 
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Image, Alert, ImageBackground } from 'react-native';
import { app } from '../../config'; 
import { useNavigation } from '@react-navigation/native'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 

const LoginScreen = () => {
  const navigation = useNavigation(); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    const auth = getAuth(app);
    const db = getFirestore(app);
  
    signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        
        // Tìm document trong collection USERS với ID là email
        const userDoc = await getDoc(doc(db, 'USERS', email));
        
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          console.log('Đăng nhập thành công:', user);
          await AsyncStorage.setItem('isLoggedIn', 'true');
          navigation.navigate('Home');
        } else {
          window.alert('Lỗi', 'Bạn không có quyền truy cập. Chỉ tài khoản admin mới được phép đăng nhập.');
          // Đăng xuất nếu không phải admin
          auth.signOut();
        }
      })
      .catch((error) => {
        console.error('Error', error);
        window.alert('Lỗi: Tài khoản hoặc mật khẩu không chính xác');
      });
  };

  return (
    <ImageBackground 
      source={require('../../assets/backgroundLogin.jpg')}
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/logo.png')}
            style={styles.logo}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <Text style={styles.labelText}>Tài khoản:</Text>
            <TextInput
              placeholder="username"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholderTextColor="#DDDDDD"
            />
          </View>
          
          <View style={styles.inputRow}>
            <Text style={styles.labelText}>Mật khẩu:</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={[styles.input, styles.passwordInput]}
                placeholderTextColor="#DDDDDD"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.signInButton}
          onPress={handleLogin}
        >
          <Text style={styles.signInText}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    position: 'absolute',
    top: 85,
    zIndex: 1,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'white',
  },
  inputRow: {
    marginBottom: 15,
  },
  labelText: {
    color: '#666',
    marginBottom: 5,
  },
  inputContainer: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 15,
    marginBottom: 3,
    marginTop: 40,
  },
  input: {
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
  },
  forgotText: {
    color: '#3498db',
    fontSize: 12,
    marginLeft: 10,
  },
  signInButton: {
    width: '100%',
    maxWidth: 300,
    height: 45,
    backgroundColor: '#7ED321', 
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

});

export default LoginScreen;
