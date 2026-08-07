// App.js
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initDB } from "./src/database/initDB";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  useEffect(() => {
    initDB();
  }, []);

  return (
    // SafeAreaProvider evita que la app se superponga con el notch o la barra de estado del celular
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
