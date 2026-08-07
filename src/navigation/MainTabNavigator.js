// src/navigation/MainTabNavigator.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "../store/useAuthStore";
import { COLORS } from "../theme/colors";

// Importamos las pantallas reales
import Perfil from "../screens/shared/Perfil";
import GestionUsuarios from "../screens/admin/GestionUsuarios";
import ListaTickets from "../screens/tech/ListaTickets";
import ChecklistLimpieza from "../screens/cleaning/ChecklistLimpieza";
import Notificaciones from "../screens/shared/Notificaciones";
import MiTrabajo from "../screens/shared/MiTrabajo";
import Finanzas from "../screens/admin/Finanzas";
import CalendarioGlobal from "../screens/shared/CalendarioGlobal";
import Documentos from "../screens/shared/Documentos";
import AuditoriaLimpieza from "../screens/admin/AuditorialLimpieza";
import Premium from "../screens/shared/Premium";
import AuditoriaTickets from "../screens/admin/AuditoriaTickets";
import Inventario from "../screens/admin/Inventario";

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const user = useAuthStore((state) => state.user);
  const rol = user?.rol || "empleado";
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.surface,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.secondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          height: insets.bottom > 0 ? 60 + insets.bottom : 70,
        },
        // BOTÓN PREMIUM EN LA CABECERA
        headerRight: () => (
          <TouchableOpacity
            style={{
              marginRight: 15,
              backgroundColor: "#F59E0B",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 15,
            }}
            onPress={() => navigation.navigate("Premium")}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>
              👑 PRO
            </Text>
          </TouchableOpacity>
        ),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Perfil")
            iconName = focused ? "person" : "person-outline";
          else if (route.name === "Calendario")
            iconName = focused ? "calendar" : "calendar-outline";
          else if (route.name === "Documentos")
            iconName = focused ? "folder" : "folder-outline";
          else if (route.name === "Notificaciones")
            iconName = focused ? "notifications" : "notifications-outline";
          else if (route.name === "Gestión")
            iconName = focused ? "briefcase" : "briefcase-outline";
          else if (route.name === "Finanzas")
            iconName = focused ? "stats-chart" : "stats-chart-outline";
          else if (route.name === "Auditoría")
            iconName = focused ? "clipboard" : "clipboard-outline";
          else if (route.name === "Mi Trabajo")
            iconName = focused ? "cash" : "cash-outline";
          else if (route.name === "Mantenimiento")
            iconName = focused ? "build" : "build-outline";
          else if (route.name === "Aud. Tickets")
            iconName = focused ? "hardware-chip" : "hardware-chip-outline";
          else if (route.name === "Limpieza")
            iconName = focused ? "sparkles" : "sparkles-outline";

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {/* Vistas Generales */}
      <Tab.Screen name="Perfil" component={Perfil} />
      <Tab.Screen name="Calendario" component={CalendarioGlobal} />
      <Tab.Screen name="Documentos" component={Documentos} />
      {/* Vistas por Rol */}

      {rol === "jefe" && (
        <>
          <Tab.Screen name="Gestión" component={GestionUsuarios} />
          <Tab.Screen name="Inventario" component={Inventario} />
          <Tab.Screen name="Finanzas" component={Finanzas} />
          <Tab.Screen name="Auditoría" component={AuditoriaLimpieza} />
          <Tab.Screen name="Aud. Tickets" component={AuditoriaTickets} />
        </>
      )}
      {rol === "empleado" && (
        <Tab.Screen name="Mi Trabajo" component={MiTrabajo} />
      )}
      {rol === "tecnico" && (
        <Tab.Screen name="Mantenimiento" component={ListaTickets} />
      )}
      {rol === "limpieza" && (
        <Tab.Screen name="Limpieza" component={ChecklistLimpieza} />
      )}
      {/* Buzón de Notificaciones */}
      <Tab.Screen name="Notificaciones" component={Notificaciones} />
      {/* Pantalla Premium (Oculta del menú de pestañas, pero accesible desde el botón PRO) */}
      {/* Pantalla Premium oculta sin dejar espacios */}
      <Tab.Screen
        name="Premium"
        component={Premium}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" }, // <-- ESTO ELIMINA EL HUECO
        }}
      />
    </Tab.Navigator>
  );
}
