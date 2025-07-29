// Este archivo es el cerebro de la sesión del usuario.
// Se encarga de:
// 1. Saber si el usuario ha iniciado sesión o no.
// 2. Cargar los datos del perfil del usuario desde la base de datos (puntos, reputación, etc.).
// 3. Compartir esta información con TODA la aplicación de forma sencilla.

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../api/firebase';

// 1. Creamos un "Contexto", que es como un canal de información global para la app.
const AuthContext = createContext();

// 2. Creamos el "Proveedor", el componente que gestionará y compartirá la información.
export const AuthProvider = ({ children }) => {
  // --- ESTADOS ---
  // user: Contiene la información BÁSICA de Firebase Auth (email, uid, etc.). Es null si no hay sesión.
  const [user, setUser] = useState(null);
  // userProfile: Contiene los datos que guardamos en nuestra base de datos (puntos, misiones, etc.).
  const [userProfile, setUserProfile] = useState(null);
  // loading: Nos dice si todavía estamos comprobando si hay una sesión activa. Evita parpadeos en la pantalla.
  const [loading, setLoading] = useState(true);

  // --- EFECTOS (Lógica que se ejecuta automáticamente) ---

  // Este primer useEffect se encarga de escuchar a Firebase Authentication.
  // Se dispara AUTOMÁTICAMENTE cuando el usuario inicia sesión, cierra sesión o al abrir la app.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser); // Guardamos el usuario de Firebase (o null si cierra sesión)
      
      // Si no hay usuario, ya hemos terminado de cargar y no hay perfil que buscar.
      if (!firebaseUser) {
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Se devuelve la función de limpieza para dejar de escuchar cuando el componente se desmonte.
    return unsubscribe;
  }, []);

  // Este segundo useEffect se activa SOLO CUANDO el estado 'user' cambia y NO es nulo.
  // Su misión es ir a Firestore a buscar los datos del perfil de ese usuario.
  useEffect(() => {
    // Si no hay usuario, no hacemos nada.
    if (!user) return;

    // Creamos una referencia al documento del usuario en nuestra base de datos.
    const userRef = doc(db, 'users', user.uid);

    // 'onSnapshot' es un "oyente" en tiempo real. Si los puntos del usuario cambian en la
    // base de datos, ¡esta función se disparará y actualizará la app al instante!
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserProfile({ id: doc.id, ...doc.data() });
      } else {
        // Esto puede pasar si un usuario se registra pero aún no hemos creado su perfil.
        setUserProfile(null); 
      }
      // Una vez que hemos intentado cargar el perfil, terminamos la carga inicial.
      setLoading(false);
    });
    
    // Devolvemos la función de limpieza para dejar de escuchar a este documento.
    return unsubscribe;
  }, [user]); // Esta es la dependencia: se ejecuta cada vez que 'user' cambia.

  // --- VALORES A COMPARTIR ---

  // Calculamos si el usuario es Premium. Esta lógica está ahora en un solo sitio.
  const isPremium = userProfile?.isPremium && new Date() < userProfile?.premiumExpiryDate?.toDate();

  // Creamos un objeto con toda la información que queremos que el resto de la app pueda usar.
  const value = {
    user,          // El objeto de autenticación de Firebase
    userProfile,   // Los datos de nuestro Firestore (puntos, etc.)
    isPremium,     // Un booleano fácil de usar: true o false
    loading,       // Para saber si la app está lista o cargando
  };

  // El Provider "envuelve" al resto de la app (los 'children') y le da acceso a 'value'.
  // Solo mostramos la app cuando 'loading' es false, para evitar pantallas raras al inicio.
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 3. Creamos un "Hook" personalizado. Esto es un atajo para que en otras pantallas
//    solo tengamos que escribir 'useAuth()' en lugar de 'useContext(AuthContext)'. ¡Más limpio!
export const useAuth = () => useContext(AuthContext);