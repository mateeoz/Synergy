// src/screens/admin/Finanzas.js
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { useFocusEffect } from "@react-navigation/native";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function Finanzas() {
  const [datosGrafico, setDatosGrafico] = useState([]);
  const [totales, setTotales] = useState({
    ingresos: 0,
    egresos: 0,
    balance: 0,
  });

  useFocusEffect(
    useCallback(() => {
      calcularFinanzas();
    }, []),
  );

  const calcularFinanzas = () => {
    try {
      const transacciones = db.getAllSync("SELECT * FROM transacciones");

      let sumIngresos = 0;
      let sumEgresos = 0;

      transacciones.forEach((t) => {
        if (t.tipo === "Ingreso") sumIngresos += t.monto;
        if (t.tipo === "Egreso") sumEgresos += t.monto;
      });

      setTotales({
        ingresos: sumIngresos,
        egresos: sumEgresos,
        balance: sumIngresos - sumEgresos,
      });

      // Preparamos los datos con el formato que exige la librería de gráficos
      setDatosGrafico([
        { value: sumIngresos, label: "Ingresos", frontColor: COLORS.success },
        { value: sumEgresos, label: "Egresos", frontColor: COLORS.danger },
      ]);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>Resumen Financiero</Text>

      <View style={styles.cardsRow}>
        <View style={[styles.miniCard, { borderBottomColor: COLORS.success }]}>
          <Text style={styles.cardLabel}>Ingresos</Text>
          <Text style={[styles.cardValue, { color: COLORS.success }]}>
            ${totales.ingresos}
          </Text>
        </View>
        <View style={[styles.miniCard, { borderBottomColor: COLORS.danger }]}>
          <Text style={styles.cardLabel}>Gastos</Text>
          <Text style={[styles.cardValue, { color: COLORS.danger }]}>
            ${totales.egresos}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.balanceCard,
          totales.balance < 0 ? styles.balanceNegativo : styles.balancePositivo,
        ]}
      >
        <Text style={styles.balanceLabel}>Balance Total</Text>
        <Text style={styles.balanceValue}>${totales.balance}</Text>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Gráfico de Rendimiento</Text>
        {datosGrafico.length > 0 ? (
          <BarChart
            data={datosGrafico}
            barWidth={50}
            spacing={40}
            roundedTop
            roundedBottom
            hideRules
            xAxisThickness={1}
            yAxisThickness={0}
            yAxisTextStyle={{ color: COLORS.secondary }}
            noOfSections={4}
            maxValue={Math.max(totales.ingresos, totales.egresos) + 1000} // Da un margen superior al gráfico
          />
        ) : (
          <Text style={styles.emptyText}>Cargando datos...</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.background, padding: 20 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 20,
  },
  cardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  miniCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    elevation: 2,
    borderBottomWidth: 4,
  },
  cardLabel: { fontSize: 14, color: COLORS.textMuted },
  cardValue: { fontSize: 20, fontWeight: "bold", marginTop: 5 },
  balanceCard: {
    padding: 20,
    borderRadius: 10,
    marginHorizontal: 5,
    marginBottom: 20,
    alignItems: "center",
  },
  balancePositivo: { backgroundColor: "#D1FAE5" }, // Verde muy claro
  balanceNegativo: { backgroundColor: "#FEE2E2" }, // Rojo muy claro
  balanceLabel: { fontSize: 16, color: COLORS.text },
  balanceValue: { fontSize: 28, fontWeight: "bold", color: COLORS.primary },
  chartContainer: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 15,
    elevation: 2,
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  emptyText: { color: COLORS.textMuted },
});
