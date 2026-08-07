// src/navigation/MainTabNavigator.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../store/useAuthStore";
import { COLORS } from "../theme/colors";

// Importamos las pantallas
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
import Reservas from "../screens/shared/Reservas"; // <-- Asegurate de que la ruta exista

// Importamos el componente giratorio REPARADO
import RadialTabBar from "../components/RadialTabBar";

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const user = useAuthStore((state) => state.user);
  const rol = user?.rol || "empleado";

  // Obtenemos los márgenes seguros del teléfono (ej: la barrita de iPhone abajo)
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      tabBar={(props) => <RadialTabBar {...props} />}
      // LA MAGIA GLOBAL ESTÁ ACÁ: Le damos padding inferior a TODAS las pantallas
      sceneContainerStyle={{
        paddingBottom: 60 + insets.bottom,
        backgroundColor: COLORS.background,
      }}
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.surface,
        headerTitleAlign: "center",
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
      })}
    >
      {/* Vistas Generales */}
      <Tab.Screen name="Perfil" component={Perfil} />
      <Tab.Screen name="Calendario" component={CalendarioGlobal} />
      <Tab.Screen name="Documentos" component={Documentos} />
      <Tab.Screen name="Reservas" component={Reservas} />

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

      {/* Pantalla Premium */}
      <Tab.Screen
        name="Premium"
        component={Premium}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
    </Tab.Navigator>
  );
}
