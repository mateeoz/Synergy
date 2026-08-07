// src/screens/admin/Finanzas.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { BarChart, ProgressChart } from "react-native-chart-kit";
import { useFocusEffect } from "@react-navigation/native";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

const screenWidth = Dimensions.get("window").width;

export default function Finanzas() {
  // Estados del sistema base (Balance e Historial)
  const [balance, setBalance] = useState({ ingresos: 0, egresos: 0, neto: 0 });
  const [historial, setHistorial] = useState([]);

  // Estados del nuevo sistema (Presupuesto y Gráficos)
  const [presupuesto, setPresupuesto] = useState(0);
  const [gastado, setGastado] = useState(0);
  const [nuevoPresupuesto, setNuevoPresupuesto] = useState("");
  const [datosVentas, setDatosVentas] = useState({
    labels: ["Sin datos"],
    datasets: [{ data: [0] }],
  });

  const getMesActual = () => {
    const fecha = new Date();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const anio = fecha.getFullYear();
    return `${mes}/${anio}`;
  };

  const mesActualStr = getMesActual();

  useFocusEffect(
    useCallback(() => {
      cargarDatosFinancieros();
    }, []),
  );

  const cargarDatosFinancieros = () => {
    try {
      // 1. Cargar Presupuesto del mes actual
      const resPresupuesto = db.getAllSync(
        "SELECT monto FROM presupuestos WHERE mes = ?",
        [mesActualStr],
      );
      setPresupuesto(resPresupuesto.length > 0 ? resPresupuesto[0].monto : 0);

      // 2. Cargar todas las transacciones
      const transacciones = db.getAllSync(
        "SELECT * FROM transacciones ORDER BY id DESC",
      );

      // Guardamos los últimos 5 movimientos para el historial rápido
      setHistorial(transacciones.slice(0, 5));

      let ingTotales = 0;
      let egrTotales = 0;
      let totalGastadoMes = 0;
      let ingresosPorMes = {};

      transacciones.forEach((t) => {
        // Sumatorias para el Balance General (Sistema original)
        if (t.tipo === "Ingreso") ingTotales += t.monto;
        if (t.tipo === "Egreso") egrTotales += t.monto;

        // Procesamiento de fechas para presupuestos y gráficos
        const partesFecha = t.fecha.split("/");
        if (partesFecha.length === 3) {
          const mesAnio = `${partesFecha[1].padStart(2, "0")}/${partesFecha[2]}`; // MM/YYYY

          // Calcular Egresos solo del mes actual
          if (t.tipo === "Egreso" && mesAnio === mesActualStr) {
            totalGastadoMes += t.monto;
          }

          // Agrupar Ingresos (Ventas) por mes
          if (t.tipo === "Ingreso") {
            if (!ingresosPorMes[mesAnio]) ingresosPorMes[mesAnio] = 0;
            ingresosPorMes[mesAnio] += t.monto;
          }
        }
      });

      // Actualizamos los estados
      setBalance({
        ingresos: ingTotales,
        egresos: egrTotales,
        neto: ingTotales - egrTotales,
      });
      setGastado(totalGastadoMes);

      // Preparar datos para el gráfico de barras (Últimos meses)
      const meses = Object.keys(ingresosPorMes).sort();
      if (meses.length > 0) {
        setDatosVentas({
          labels: meses.map((m) => m.substring(0, 5)), // Muestra solo MM/YY
          datasets: [{ data: meses.map((m) => ingresosPorMes[m]) }],
        });
      }
    } catch (error) {
      console.error("Error al cargar finanzas:", error);
    }
  };

  const guardarPresupuesto = () => {
    const montoNum = parseFloat(nuevoPresupuesto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return Alert.alert("Error", "Ingresa un monto válido.");
    }

    try {
      db.runSync(
        "INSERT OR REPLACE INTO presupuestos (id, mes, monto) VALUES ((SELECT id FROM presupuestos WHERE mes = ?), ?, ?)",
        [mesActualStr, mesActualStr, montoNum],
      );
      Alert.alert("Éxito", "Presupuesto mensual actualizado.");
      setNuevoPresupuesto("");
      cargarDatosFinancieros();
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el presupuesto.");
    }
  };

  const porcentajeGastado = presupuesto > 0 ? gastado / presupuesto : 0;
  const progresoNormalizado = Math.min(porcentajeGastado, 1);
  const colorProgreso = porcentajeGastado > 1 ? COLORS.danger : COLORS.primary;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.headerTitle}>Panel Financiero</Text>

      {/* SECCIÓN 1: BALANCE GENERAL (Tu sistema original) */}
      <View style={styles.cardBalance}>
        <Text style={styles.cardTitleWhite}>Balance Total Histórico</Text>
        <Text style={styles.netBalance}>${balance.neto.toFixed(2)}</Text>

        <View style={styles.rowBalance}>
          <View style={styles.colBalance}>
            <Text style={styles.labelBalance}>Ingresos</Text>
            <Text style={styles.valIngreso}>
              +${balance.ingresos.toFixed(2)}
            </Text>
          </View>
          <View style={styles.colBalance}>
            <Text style={styles.labelBalance}>Egresos</Text>
            <Text style={styles.valEgreso}>-${balance.egresos.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* SECCIÓN 2: PRESUPUESTO MENSUAL (Lo nuevo) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Presupuesto de Gastos ({mesActualStr})
        </Text>

        <View style={styles.budgetDisplay}>
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetText}>
              Límite: ${presupuesto.toFixed(2)}
            </Text>
            <Text style={[styles.budgetText, { color: colorProgreso }]}>
              Gastado: ${gastado.toFixed(2)}
            </Text>
            <Text style={styles.budgetSub}>
              {presupuesto > 0
                ? `Disponible: $${Math.max(presupuesto - gastado, 0).toFixed(2)}`
                : "Fija un límite mensual abajo"}
            </Text>
          </View>

          <ProgressChart
            data={{ data: [progresoNormalizado] }}
            width={100}
            height={100}
            strokeWidth={12}
            radius={32}
            chartConfig={{
              backgroundGradientFrom: COLORS.surface,
              backgroundGradientTo: COLORS.surface,
              color: (opacity = 1) =>
                porcentajeGastado > 1
                  ? `rgba(239, 68, 68, ${opacity})`
                  : `rgba(37, 99, 235, ${opacity})`,
            }}
            hideLegend={true}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputDark}
            placeholder="Asignar presupuesto..."
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={nuevoPresupuesto}
            onChangeText={setNuevoPresupuesto}
          />
          <TouchableOpacity style={styles.btnSave} onPress={guardarPresupuesto}>
            <Text style={styles.btnSaveText}>Fijar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SECCIÓN 3: GRÁFICO DE VENTAS (Lo nuevo) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Crecimiento de Ventas</Text>
        <BarChart
          data={datosVentas}
          width={screenWidth - 70}
          height={220}
          yAxisLabel="$"
          chartConfig={{
            backgroundColor: COLORS.surface,
            backgroundGradientFrom: COLORS.surface,
            backgroundGradientTo: COLORS.surface,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            labelColor: (opacity = 1) => COLORS.textMuted,
            style: { borderRadius: 16 },
            barPercentage: 0.6,
          }}
          style={styles.chartStyle}
        />
      </View>

      {/* SECCIÓN 4: HISTORIAL DE TRANSACCIONES (Tu sistema original) */}
      <View style={[styles.card, { marginBottom: 40 }]}>
        <Text style={styles.cardTitle}>Últimos Movimientos</Text>
        {historial.length === 0 ? (
          <Text style={styles.emptyText}>
            No hay transacciones registradas.
          </Text>
        ) : (
          historial.map((item) => (
            <View key={item.id} style={styles.historyRow}>
              <View>
                <Text style={styles.historyClient}>
                  {item.cliente || item.tipo}
                </Text>
                <Text style={styles.historyDate}>
                  {item.fecha} • {item.metodo_pago}
                </Text>
              </View>
              <Text
                style={[
                  styles.historyAmount,
                  item.tipo === "Ingreso"
                    ? styles.valIngreso
                    : styles.valEgreso,
                ]}
              >
                {item.tipo === "Ingreso" ? "+" : "-"}${item.monto.toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 20,
  },

  cardBalance: {
    backgroundColor: "#111827",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3,
  },
  cardTitleWhite: {
    fontSize: 16,
    color: "#9CA3AF",
    fontWeight: "bold",
    marginBottom: 5,
  },
  netBalance: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 15,
  },
  rowBalance: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#374151",
    paddingTop: 15,
  },
  colBalance: { flex: 1 },
  labelBalance: { fontSize: 12, color: "#9CA3AF", marginBottom: 5 },
  valIngreso: { fontSize: 16, fontWeight: "bold", color: COLORS.success },
  valEgreso: { fontSize: 16, fontWeight: "bold", color: COLORS.danger },

  card: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 15,
  },

  budgetDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  budgetInfo: { flex: 1, paddingRight: 10 },
  budgetText: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 5,
  },
  budgetSub: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 5,
    fontStyle: "italic",
  },

  inputRow: { flexDirection: "row", alignItems: "center" },
  inputDark: {
    flex: 1,
    backgroundColor: "#1F2937",
    color: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  btnSave: { backgroundColor: COLORS.success, padding: 14, borderRadius: 8 },
  btnSaveText: { color: COLORS.surface, fontWeight: "bold" },

  chartStyle: { marginVertical: 8, borderRadius: 16, alignSelf: "center" },

  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  historyClient: { fontSize: 14, fontWeight: "bold", color: COLORS.text },
  historyDate: { fontSize: 11, color: COLORS.secondary, marginTop: 2 },
  historyAmount: { fontSize: 14, fontWeight: "bold" },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginTop: 10,
  },
});
