// src/navigation/AppNavigator.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/useAuthStore";

// Importamos las pantallas de Autenticación
import Login from "../screens/auth/Login";
import Registro from "../screens/auth/Registro";

// Importamos el Tab Navigator que acabamos de crear
import MainTabNavigator from "./MainTabNavigator";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const user = useAuthStore((state) => state.user);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Si NO hay usuario logueado -> Stack de Login/Registro
          <Stack.Group>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Registro" component={Registro} />
          </Stack.Group>
        ) : (
          // Si SÍ hay usuario logueado -> Pasamos el control al Tab Navigator
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
