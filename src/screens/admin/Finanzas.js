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
import { Ionicons } from "@expo/vector-icons";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

const screenWidth = Dimensions.get("window").width;

export default function Finanzas() {
  const [balance, setBalance] = useState({ ingresos: 0, egresos: 0, neto: 0 });
  const [historial, setHistorial] = useState([]);
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
      const resPresupuesto = db.getAllSync(
        "SELECT monto FROM presupuestos WHERE mes = ?",
        [mesActualStr],
      );
      setPresupuesto(resPresupuesto.length > 0 ? resPresupuesto[0].monto : 0);

      const transacciones = db.getAllSync(
        "SELECT * FROM transacciones ORDER BY id DESC",
      );
      setHistorial(transacciones.slice(0, 5));

      let ingTotales = 0;
      let egrTotales = 0;
      let totalGastadoMes = 0;
      let ingresosPorMes = {};

      transacciones.forEach((t) => {
        if (t.tipo === "Ingreso") ingTotales += t.monto;
        if (t.tipo === "Egreso") egrTotales += t.monto;

        const partesFecha = t.fecha.split("/");
        if (partesFecha.length === 3) {
          const mesAnio = `${partesFecha[1].padStart(2, "0")}/${partesFecha[2]}`;

          if (t.tipo === "Egreso" && mesAnio === mesActualStr) {
            totalGastadoMes += t.monto;
          }

          if (t.tipo === "Ingreso") {
            if (!ingresosPorMes[mesAnio]) ingresosPorMes[mesAnio] = 0;
            ingresosPorMes[mesAnio] += t.monto;
          }
        }
      });

      setBalance({
        ingresos: ingTotales,
        egresos: egrTotales,
        neto: ingTotales - egrTotales,
      });
      setGastado(totalGastadoMes);

      const meses = Object.keys(ingresosPorMes).sort();
      if (meses.length > 0) {
        setDatosVentas({
          labels: meses.map((m) => m.substring(0, 5)),
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
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.headerTitle}>Métricas Financieras</Text>

      {/* TARJETA PRINCIPAL: BALANCE (Estilo VIP) */}
      <View style={styles.mainBalanceCard}>
        <Text style={styles.balanceSubtitle}>BALANCE NETO HISTÓRICO</Text>
        <Text style={styles.balanceNeto}>
          ${balance.neto.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")}
        </Text>

        <View style={styles.balanceDivider} />

        <View style={styles.balanceMetricsRow}>
          <View style={styles.metricItem}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: "rgba(16, 185, 129, 0.2)" },
              ]}
            >
              <Ionicons
                name="arrow-down-outline"
                size={16}
                color={COLORS.success}
              />
            </View>
            <View>
              <Text style={styles.metricLabel}>Ingresos Totales</Text>
              <Text style={styles.metricValueIngreso}>
                +${balance.ingresos.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.metricItem}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: "rgba(239, 68, 68, 0.2)" },
              ]}
            >
              <Ionicons
                name="arrow-up-outline"
                size={16}
                color={COLORS.danger}
              />
            </View>
            <View>
              <Text style={styles.metricLabel}>Egresos Totales</Text>
              <Text style={styles.metricValueEgreso}>
                -${balance.egresos.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* CONTROL DE PRESUPUESTO */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Control de Presupuesto ({mesActualStr})
        </Text>

        <View style={styles.budgetDisplay}>
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetText}>
              Límite fijado:{" "}
              <Text style={{ fontWeight: "400" }}>
                ${presupuesto.toFixed(2)}
              </Text>
            </Text>
            <Text style={[styles.budgetText, { color: colorProgreso }]}>
              Consumido:{" "}
              <Text style={{ fontWeight: "bold" }}>${gastado.toFixed(2)}</Text>
            </Text>
            <Text style={styles.budgetSub}>
              {presupuesto > 0
                ? `Quedan disponibles: $${Math.max(presupuesto - gastado, 0).toFixed(2)}`
                : "Fija un límite mensual debajo"}
            </Text>
          </View>

          <ProgressChart
            data={{ data: [progresoNormalizado] }}
            width={90}
            height={90}
            strokeWidth={10}
            radius={36}
            chartConfig={{
              backgroundGradientFrom: COLORS.surface,
              backgroundGradientTo: COLORS.surface,
              color: (opacity = 1) =>
                porcentajeGastado > 1
                  ? `rgba(239, 68, 68, ${opacity})`
                  : `rgba(11, 29, 51, ${opacity})`,
            }}
            hideLegend={true}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Nuevo presupuesto..."
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            value={nuevoPresupuesto}
            onChangeText={setNuevoPresupuesto}
          />
          <TouchableOpacity
            style={styles.btnSave}
            onPress={guardarPresupuesto}
            activeOpacity={0.8}
          >
            <Text style={styles.btnSaveText}>Actualizar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* GRÁFICO DE VENTAS */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rendimiento de Ingresos (Mensual)</Text>
        <BarChart
          data={datosVentas}
          width={screenWidth - 80}
          height={220}
          yAxisLabel="$"
          chartConfig={{
            backgroundColor: COLORS.surface,
            backgroundGradientFrom: COLORS.surface,
            backgroundGradientTo: COLORS.surface,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(11, 29, 51, ${opacity})`, // Usando tu nuevo Azul Noche
            labelColor: (opacity = 1) => COLORS.textMuted,
            style: { borderRadius: 16 },
            barPercentage: 0.7,
            propsForBackgroundLines: {
              strokeWidth: 1,
              stroke: COLORS.border,
              strokeDasharray: "0",
            },
          }}
          style={styles.chartStyle}
        />
      </View>

      {/* ÚLTIMOS MOVIMIENTOS */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Últimos Movimientos</Text>
          <Ionicons name="list-outline" size={20} color={COLORS.secondary} />
        </View>

        {historial.length === 0 ? (
          <Text style={styles.emptyText}>
            Aún no hay transacciones en el sistema.
          </Text>
        ) : (
          historial.map((item, index) => {
            const isIngreso = item.tipo === "Ingreso";
            return (
              <View
                key={item.id}
                style={[
                  styles.historyRow,
                  index === historial.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.historyLeft}>
                  <View
                    style={[
                      styles.historyIconBox,
                      { backgroundColor: isIngreso ? "#ECFDF5" : "#FEF2F2" },
                    ]}
                  >
                    <Ionicons
                      name={isIngreso ? "trending-up" : "trending-down"}
                      size={18}
                      color={isIngreso ? COLORS.success : COLORS.danger}
                    />
                  </View>
                  <View>
                    <Text style={styles.historyClient} numberOfLines={1}>
                      {item.cliente || item.tipo}
                    </Text>
                    <Text style={styles.historyDate}>
                      {item.fecha} • {item.metodo_pago}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.historyAmount,
                    { color: isIngreso ? COLORS.text : COLORS.danger },
                  ]}
                >
                  {isIngreso ? "+" : "-"}${item.monto.toFixed(2)}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* Espaciador para la barra de navegación */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 20,
    letterSpacing: -0.5,
  },

  /* Tarjeta de Balance Estilo VIP */
  mainBalanceCard: {
    backgroundColor: COLORS.primary, // Fondo Azul Noche
    padding: 24,
    borderRadius: 20,
    marginBottom: 25,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  balanceSubtitle: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  balanceNeto: {
    fontSize: 40,
    fontWeight: "800",
    color: COLORS.surface,
    marginBottom: 20,
    letterSpacing: -1,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 20,
  },
  balanceMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  metricLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  metricValueIngreso: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.success,
    marginTop: 2,
  },
  metricValueEgreso: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FCA5A5", // Rojo un poco más claro para fondos oscuros
    marginTop: 2,
  },

  /* Tarjetas Generales */
  card: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 15,
  },

  /* Presupuesto */
  budgetDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  budgetInfo: { flex: 1, paddingRight: 15 },
  budgetText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  budgetSub: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 8,
    fontStyle: "italic",
  },

  /* Inputs Modernos */
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
  },
  btnSave: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  btnSaveText: {
    color: COLORS.surface,
    fontWeight: "600",
  },

  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
    alignSelf: "center",
  },

  /* Historial de Movimientos */
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  historyIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  historyClient: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontStyle: "italic",
    paddingVertical: 10,
  },
});
