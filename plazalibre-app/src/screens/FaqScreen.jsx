import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Un componente reutilizable para cada pregunta
const FaqItem = ({ question, answer, icon }) => (
  <View style={styles.faqItem}>
    <View style={styles.questionContainer}>
      <Ionicons name={icon} size={24} color="#007AFF" style={styles.icon} />
      <Text style={styles.question}>{question}</Text>
    </View>
    <Text style={styles.answer}>{answer}</Text>
  </View>
);

const FaqScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Centro de Ayuda</Text>

      <FaqItem
        icon="shield-checkmark-outline"
        question="¿Es legal usar Plaza Libre?"
        answer="¡Totalmente! Plaza Libre no vende ni reserva espacio público. Simplemente conectamos a conductores de forma colaborativa para intercambiar información sobre una plaza que va a quedar libre. No se realiza ningún pago entre usuarios por la plaza."
      />
      
      <FaqItem
        icon="star-outline"
        question="¿Para qué sirven los puntos?"
        answer="Los puntos miden tu reputación y tu contribución a la comunidad. No tienen valor monetario y no se pueden comprar. Acumular puntos te dará ventajas en el futuro, como prioridad en las notificaciones o acceso a nuevas funciones."
      />
      
      <FaqItem
        icon="hourglass-outline"
        question="¿Qué pasa si llego y la plaza ya no está?"
        answer="Nuestro sistema se basa en la buena fe. El chat sirve para coordinar los últimos detalles. Si un usuario ofrece plazas falsas repetidamente, su reputación bajará y podrá ser penalizado. Siempre confirma por el chat antes de llegar."
      />

      <FaqItem
        icon="card-outline"
        question="¿Cómo funciona la suscripción Premium?"
        answer="Ser Premium te dará acceso a funciones avanzadas como alertas personalizadas para zonas y horarios específicos, búsquedas guardadas y una experiencia sin publicidad. Es la forma de apoyar el proyecto y sacar el máximo partido a la app."
      />
      
      <FaqItem
        icon="shield-outline"
        question="¿Qué hacéis con mis datos?"
        answer="Respetamos tu privacidad al máximo. Solo recogemos los datos mínimos necesarios para que la app funcione (como tu ubicación mientras la usas). No vendemos tus datos a terceros. Puedes solicitar la eliminación de tu cuenta y todos tus datos en cualquier momento desde tu perfil."
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    padding: 20,
    paddingBottom: 10,
  },
  faqItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 15,
    // Sombra
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    marginRight: 10,
  },
  question: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1, // Para que el texto se ajuste
  },
  answer: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24, // Espacio entre líneas para mejor lectura
  },
});

export default FaqScreen;