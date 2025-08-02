import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  Image, // ¡Importamos el componente de Imagen!
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, db } from '../api/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext'; // Importamos nuestro hook de Tema
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const LoginScreen = () => {
  const { colors } = useTheme(); // Obtenemos la paleta de colores activa

  // --- ESTADOS ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Para mostrar spinner de carga
  const [isGoogleLoading, setIsGoogleLoading] = useState(false); // Para Google Sign-In

  // --- CONFIGURACIÓN DE GOOGLE SIGN-IN ---
  React.useEffect(() => {
    GoogleSignin.configure({
      webClientId: '13007497972-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com', // Reemplazar con tu Web Client ID
      offlineAccess: true,
    });
  }, []);

  // --- FUNCIONES ---
  const handleAuthAction = async (authFunction, successMessage, errorMessagePrefix) => {
    if (!email || !password) {
      Alert.alert('Campos incompletos', 'Por favor, introduce tu correo y contraseña.');
      return;
    }
    setIsLoading(true);
    try {
      await authFunction(auth, email, password);
      console.log(successMessage);
      // No necesitamos hacer nada más, el AuthContext se encargará de la navegación.
    } catch (error) {
      Alert.alert(errorMessagePrefix, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    handleAuthAction(signInWithEmailAndPassword, '¡Sesión iniciada!', 'Error al iniciar sesión');
  };

  const handleRegister = () => {
    handleAuthAction(createUserWithEmailAndPassword, '¡Usuario registrado!', 'Error al registrarse');
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // Verificar si el dispositivo soporta Google Sign-In
      await GoogleSignin.hasPlayServices();
      
      // Iniciar el flujo de Google Sign-In
      const userInfo = await GoogleSignin.signIn();
      
      // Crear credencial de Firebase con el token de Google
      const googleCredential = GoogleAuthProvider.credential(userInfo.idToken);
      
      // Iniciar sesión en Firebase
      const result = await signInWithCredential(auth, googleCredential);
      
      // Crear o actualizar perfil del usuario en Firestore
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Usuario nuevo - crear perfil
        await setDoc(userRef, {
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          parkcoins: 0,
          reputation: 100,
          plan: 'free',
          createdAt: new Date(),
          lastLoginAt: new Date(),
        });
      } else {
        // Usuario existente - actualizar último login
        await setDoc(userRef, {
          lastLoginAt: new Date(),
        }, { merge: true });
      }
      
      console.log('¡Sesión iniciada con Google!');
    } catch (error) {
      console.error('Error en Google Sign-In:', error);
      if (error.code === 'SIGN_IN_CANCELLED') {
        Alert.alert('Inicio de sesión cancelado', 'Has cancelado el inicio de sesión con Google.');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        Alert.alert('Servicios de Google no disponibles', 'Los servicios de Google Play no están disponibles en tu dispositivo.');
      } else {
        Alert.alert('Error de Google Sign-In', error.message || 'Error al iniciar sesión con Google');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // --- RENDERIZADO (Lo que se ve en pantalla) ---
  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ¡AQUÍ ESTÁ TU LOGO! */}
      <Image 
        source={require('../assets/logo.png')} 
        style={styles.logo} 
      />
      
      {/* Inputs con estilo del Tema */}
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder="Correo electrónico"
        placeholderTextColor={colors.inactive}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="emailAddress"
      />
      
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder="Contraseña"
        placeholderTextColor={colors.inactive}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
      />
      
      {/* Si está cargando, mostramos un spinner en lugar de los botones */}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleLogin}>
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.buttonOutline, { borderColor: colors.primary }]} onPress={handleRegister}>
            <Text style={[styles.buttonOutlineText, { color: colors.primary }]}>Crear Cuenta</Text>
          </TouchableOpacity>

          {/* Separador */}
          <View style={styles.separator}>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.separatorText, { color: colors.inactive }]}>o</Text>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Botón de Google Sign-In */}
          <TouchableOpacity 
            style={[styles.googleButton, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#4285F4" size="small" />
            ) : (
              <>
                <Text style={[styles.googleButtonText, { color: colors.text }]}>Continuar con Google</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

// --- ESTILOS (El Diseño) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 50,
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    fontSize: 16,
  },
  button: {
    width: '100%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  buttonOutlineText: {
    fontWeight: '700',
    fontSize: 16,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    marginHorizontal: 15,
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    width: '100%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default LoginScreen;