import React, { createContext, useState, useContext } from 'react';

// Paletas de colores para cada tema
const lightColors = {
  background: '#f4f7f5',
  text: '#1A1A1A',
  card: 'white',
  primary: '#007AFF',
  secondary: '#28a745',
  border: '#e0e0e0',
  inactive: 'gray',
};

const darkColors = {
  background: '#121212',
  text: '#FFFFFF',
  card: '#1e1e1e',
  primary: '#0A84FF',
  secondary: '#30D158',
  border: '#333333',
  inactive: 'gray',
};

// Creamos el contexto
const ThemeContext = createContext();

// Creamos el Proveedor que envolverá toda la app
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light'); // 'light' o 'dark'

  const toggleTheme = () => {
    setTheme(currentTheme => (currentTheme === 'light' ? 'dark' : 'light'));
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Creamos el hook para usar el tema fácilmente en cualquier pantalla
export const useTheme = () => useContext(ThemeContext);