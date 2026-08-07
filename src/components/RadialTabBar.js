// src/components/RadialTabBar.js
import React, { useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../theme/colors";

export default function RadialTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);

  // Filtramos las rutas invisibles (como Premium) para que no ocupen lugar
  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    return options.tabBarItemStyle?.display !== "none";
  });

  // Auto-scroll animado para centrar el icono seleccionado
  useEffect(() => {
    const activeRoute = state.routes[state.index];
    const activeIndex = visibleRoutes.findIndex(
      (r) => r.key === activeRoute?.key,
    );

    if (activeIndex !== -1 && scrollViewRef.current) {
      const tabWidth = 75; // Ancho estimado de cada botón
      const screenWidth = Dimensions.get("window").width;
      const xOffset = activeIndex * tabWidth - screenWidth / 2 + tabWidth / 2;

      scrollViewRef.current.scrollTo({
        x: Math.max(0, xOffset),
        animated: true,
      });
    }
  }, [state.index, visibleRoutes]);

  const getIconName = (routeName) => {
    switch (routeName) {
      case "Mi Trabajo":
        return "cash";
      case "Inventario":
        return "cube";
      case "Calendario":
        return "calendar";
      case "Documentos":
        return "folder";
      case "Gestión":
        return "briefcase";
      case "Finanzas":
        return "stats-chart";
      case "Limpieza":
        return "sparkles";
      case "Mantenimiento":
        return "build";
      case "Aud. Tickets":
        return "hardware-chip";
      case "Auditoría":
        return "clipboard";
      case "Perfil":
        return "person";
      case "Notificaciones":
        return "notifications";
      case "Reservas":
        return "business";
      default:
        return "ellipse";
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 15 }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {visibleRoutes.map((route) => {
          const isFocused =
            state.index === state.routes.findIndex((r) => r.key === route.key);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              <View
                style={[
                  styles.iconContainer,
                  isFocused && styles.iconContainerActive,
                ]}
              >
                <Ionicons
                  name={getIconName(route.name)}
                  size={22}
                  color={isFocused ? COLORS.surface : "#9CA3AF"}
                />
              </View>
              <Text
                style={[styles.label, isFocused && styles.labelActive]}
                numberOfLines={1}
              >
                {route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111827", // Fondo oscuro elegante
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 5,
    alignItems: "center",
  },
  tabItem: {
    width: 75, // Espacio suficiente para nombres largos
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 6,
  },
  iconContainerActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
  },
  label: {
    fontSize: 10,
    color: "#9CA3AF",
    textAlign: "center",
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
});
