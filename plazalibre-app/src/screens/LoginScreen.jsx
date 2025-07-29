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
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../api/firebase';
import { useTheme } from '../context/ThemeContext'; // Importamos nuestro hook de Tema

const LoginScreen = () => {
  const { colors } = useTheme(); // Obtenemos la paleta de colores activa

  // --- ESTADOS ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Para mostrar spinner de carga

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
});

export default LoginScreen;