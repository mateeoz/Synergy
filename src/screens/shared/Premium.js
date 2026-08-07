// src/screens/shared/Premium.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { COLORS } from "../../theme/colors";

export default function Premium() {
  const simularCompra = () => {
    Alert.alert(
      "¡Gracias por tu compra!",
      "Las funciones Premium han sido habilitadas (Modo Demo).",
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.badgeContainer}>
        <Text style={styles.badgeText}>PRO</Text>
      </View>
      <Text style={styles.title}>Synergy Premium</Text>
      <Text style={styles.subtitle}>
        Desbloquea el máximo potencial de la gestión empresarial.
      </Text>

      <View style={styles.priceContainer}>
        <Text style={styles.price}>$9.99</Text>
        <Text style={styles.period}>/ mes</Text>
      </View>

      <View style={styles.featuresList}>
        <Text style={styles.featureItem}>
          ✅ Gráficos financieros ilimitados
        </Text>
        <Text style={styles.featureItem}>
          ✅ Soporte técnico prioritario 24/7
        </Text>
        <Text style={styles.featureItem}>
          ✅ Exportación de actas a Excel y PDF
        </Text>
        <Text style={styles.featureItem}>
          ✅ Copias de seguridad automáticas
        </Text>
        <Text style={styles.featureItem}>✅ Personalización de reportes</Text>
      </View>

      <TouchableOpacity style={styles.btnUpgrade} onPress={simularCompra}>
        <Text style={styles.btnUpgradeText}>Adquirir Premium</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        *Esto es una demostración para presentación. No se realizarán cargos
        reales.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.primary,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeContainer: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgeText: {
    color: COLORS.surface,
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.surface,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
  },
  price: { fontSize: 48, fontWeight: "bold", color: COLORS.surface },
  period: { fontSize: 18, color: "#9CA3AF", marginLeft: 5 },
  featuresList: {
    backgroundColor: COLORS.surface,
    width: "100%",
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
  },
  featureItem: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 15,
    fontWeight: "500",
  },
  btnUpgrade: {
    backgroundColor: COLORS.success,
    width: "100%",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    elevation: 5,
  },
  btnUpgradeText: {
    color: COLORS.surface,
    fontWeight: "bold",
    fontSize: 18,
    textTransform: "uppercase",
  },
  disclaimer: {
    marginTop: 20,
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
  },
});
