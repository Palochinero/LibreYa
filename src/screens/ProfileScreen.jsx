// ProfileScreen.jsx - VERSIÓN FINAL Y CORREGIDA

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ¡¡¡LA LÍNEA CLAVE QUE FALTABA!!!
import { useAuth } from '../context/AuthContext'; 
import { useTheme } from '../context/ThemeContext';
import { auth } from '../api/firebase';

const StarRating = ({ rating = 0 }) => {
    const totalStars = 5;
    return (
      <View style={{ flexDirection: 'row' }}>
        {[...Array(totalStars)].map((_, index) => {
          const starName = index < Math.round(rating) ? 'star' : 'star-outline';
          return <Ionicons key={index} name={starName} size={20} color="#FFD700" />;
        })}
      </View>
    );
};

const ProfileScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth(); // Ahora sí sabe qué es 'useAuth'
  const { theme, colors, toggleTheme } = useTheme();

  const handleLogout = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres cerrar tu sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, Cerrar Sesión", 
          onPress: () => auth.signOut(),
          style: 'destructive' 
        }
      ]
    );
  };

  const MenuItem = ({ icon, text, onPress }) => (
    <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderTopColor: colors.border }]} onPress={onPress}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text style={[styles.menuItemText, { color: colors.text }]}>{text}</Text>
      <Ionicons name="chevron-forward-outline" size={24} color={colors.inactive} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Ionicons name="person-circle-outline" size={80} color={colors.text} />
        <Text style={[styles.email, { color: colors.text }]}>{user?.email}</Text>
        <StarRating rating={userProfile?.averageRating} />
        <Text style={[styles.ratingText, { color: colors.inactive }]}>({userProfile?.totalRatings || 0} valoraciones)</Text>
      </View>

      <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
        <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{userProfile?.points || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.inactive }]}>Puntos</Text>
        </View>
        <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.secondary }]}>{userProfile?.parkCoins || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.inactive }]}>ParkCoins</Text>
        </View>
      </View>

      <View style={styles.menuGroup}>
        <MenuItem icon="help-circle-outline" text="Preguntas Frecuentes" onPress={() => navigation.navigate('Faq')} />
        <MenuItem icon="star-outline" text="Hazte Premium" onPress={() => { /* Navegar a pantalla Premium */ }} />
      </View>
      
      <View style={styles.menuGroup}>
        <View style={[styles.menuItem, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <Ionicons name={theme === 'dark' ? 'moon-outline' : 'sunny-outline'} size={24} color={colors.primary} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Modo Oscuro</Text>
            <Switch
                trackColor={{ false: "#767577", true: colors.secondary }}
                thumbColor={theme === 'dark' ? colors.primary : "#f4f3f4"}
                onValueChange={toggleTheme}
                value={theme === 'dark'}
            />
        </View>
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// --- ESTILOS ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { alignItems: 'center', paddingVertical: 30, borderBottomWidth: 1 },
    email: { fontSize: 18, marginTop: 10, marginBottom: 5 },
    ratingText: { marginTop: 5, fontSize: 12 },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20 },
    statBox: { alignItems: 'center', width: 100 },
    statNumber: { fontSize: 24, fontWeight: 'bold' },
    statLabel: { fontSize: 14, marginTop: 5 },
    menuGroup: { marginTop: 20, borderWidth: 1, borderColor: '#f0f0f0', borderRadius: 12, overflow: 'hidden', marginHorizontal: 10 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderTopWidth: 1, },
    menuItemText: { fontSize: 18, marginLeft: 15, flex: 1 },
    logoutButton: { margin: 20, padding: 15, borderRadius: 12, alignItems: 'center', backgroundColor: '#FF3B30' },
    logoutButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default ProfileScreen;