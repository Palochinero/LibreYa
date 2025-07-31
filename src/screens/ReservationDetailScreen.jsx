import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ReservationDetailScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Pantalla de Detalles de Reserva</Text>
      {/* Aquí se verán los detalles de una plaza y los botones de reservar/chatear */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  }
});

export default ReservationDetailScreen;