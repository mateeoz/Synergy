// src/screens/admin/GestionUsuarios.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function GestionUsuarios() {
  const [vista, setVista] = useState("plantilla");
  const [usuarios, setUsuarios] = useState([]);
  const [metricasHorarios, setMetricasHorarios] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [usuarioEdit, setUsuarioEdit] = useState(null);
  const [rol, setRol] = useState("empleado");
  const [salario, setSalario] = useState("0");
  const [horasCumplir, setHorasCumplir] = useState("8");

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, []),
  );

  const cargarDatos = () => {
    const users = db.getAllSync(
      'SELECT * FROM usuarios WHERE rol != "jefe" ORDER BY id DESC',
    );
    setUsuarios(users);
    calcularHorariosHoy(users);
  };

  // Convertidor de horas decimales a texto legible (Ej: 1.5 horas -> "1h 30m")
  const formatHM = (horasDecimales) => {
    if (horasDecimales <= 0) return "0h 0m";
    const h = Math.floor(horasDecimales);
    const m = Math.round((horasDecimales - h) * 60);
    return `${h}h ${m}m`;
  };

  const calcularHorariosHoy = (users) => {
    const hoy = new Date();
    const asistencias = db.getAllSync(
      "SELECT * FROM asistencia ORDER BY id ASC",
    );

    // Traductor de fechas a prueba de balas para React Native / SQLite
    const parseDateSafe = (str) => {
      if (!str) return new Date();
      // Intentar extraer números (Día, Mes, Año, Hora, Minuto)
      const nums = str.match(/\d+/g);
      if (nums && nums.length >= 3) {
        let y,
          m,
          d,
          h = 0,
          min = 0,
          s = 0;
        if (nums[0].length === 4) {
          y = nums[0];
          m = nums[1];
          d = nums[2];
          if (nums.length >= 5) {
            h = nums[3];
            min = nums[4];
          }
        } else {
          d = nums[0];
          m = nums[1];
          y = nums[2];
          if (nums.length >= 5) {
            h = nums[3];
            min = nums[4];
          }
        }
        // El mes en JS empieza en 0 (Enero = 0)
        return new Date(y, m - 1, d, h, min, s);
      }
      return new Date();
    };

    const metricas = users.map((u) => {
      // 1. Filtrar las asistencias de este empleado
      const asisUser = asistencias.filter((a) => a.id_usuario === u.id);

      // 2. Filtrar solo las de HOY comparando el día, mes y año real
      const asisHoy = asisUser.filter((a) => {
        const d = parseDateSafe(a.fecha_hora);
        return (
          d.getDate() === hoy.getDate() &&
          d.getMonth() === hoy.getMonth() &&
          d.getFullYear() === hoy.getFullYear()
        );
      });

      const entradas = asisHoy.filter((a) => a.tipo === "Entrada");
      const salidas = asisHoy.filter((a) => a.tipo === "Salida");

      let horaIngreso = "No fichó";
      let tiempoServicioHoras = 0;

      if (entradas.length > 0) {
        // Obtenemos la hora de la primera entrada
        const primerIngreso = parseDateSafe(entradas[0].fecha_hora);
        horaIngreso = `${String(primerIngreso.getHours()).padStart(2, "0")}:${String(primerIngreso.getMinutes()).padStart(2, "0")}`;

        // Sumamos el tiempo (incluso los minutos y segundos)
        for (let i = 0; i < entradas.length; i++) {
          const tEntrada = parseDateSafe(entradas[i].fecha_hora).getTime();
          // Si no tiene salida, usamos la hora actual (sigue trabajando)
          const tSalida = salidas[i]
            ? parseDateSafe(salidas[i].fecha_hora).getTime()
            : hoy.getTime();

          tiempoServicioHoras += (tSalida - tEntrada) / (1000 * 60 * 60);
        }
      }

      const horasTarget = u.horas_cumplir || 8;
      let horasExtras = 0;
      let horasAdeudadas = 0;

      if (tiempoServicioHoras > 0) {
        if (tiempoServicioHoras > horasTarget) {
          horasExtras = tiempoServicioHoras - horasTarget;
        } else {
          horasAdeudadas = horasTarget - tiempoServicioHoras;
        }
      } else {
        horasAdeudadas = horasTarget;
      }

      return {
        ...u,
        horaIngreso,
        tiempoServicio: formatHM(tiempoServicioHoras),
        horasExtras: formatHM(horasExtras),
        horasAdeudadas: formatHM(horasAdeudadas),
      };
    });

    setMetricasHorarios(metricas);
  };

  const abrirEdicion = (user) => {
    setUsuarioEdit(user);
    setRol(user.rol);
    setSalario(user.salario.toString());
    setHorasCumplir(user.horas_cumplir.toString());
    setModalVisible(true);
  };

  const guardarCambios = () => {
    try {
      db.runSync(
        "UPDATE usuarios SET rol = ?, salario = ?, horas_cumplir = ? WHERE id = ?",
        [rol, parseFloat(salario), parseInt(horasCumplir), usuarioEdit.id],
      );
      Alert.alert("Éxito", "Datos del usuario actualizados.");
      setModalVisible(false);
      cargarDatos();
    } catch (error) {
      Alert.alert("Error", "No se pudieron guardar los cambios.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Gestión de Personal</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, vista === "plantilla" && styles.tabActive]}
          onPress={() => setVista("plantilla")}
        >
          <Text
            style={[
              styles.tabText,
              vista === "plantilla" && styles.tabTextActive,
            ]}
          >
            Plantilla / Roles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, vista === "horarios" && styles.tabActive]}
          onPress={() => setVista("horarios")}
        >
          <Text
            style={[
              styles.tabText,
              vista === "horarios" && styles.tabTextActive,
            ]}
          >
            Control Horarios (Hoy)
          </Text>
        </TouchableOpacity>
      </View>

      {vista === "plantilla" && (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => abrirEdicion(item)}
            >
              <View>
                <Text style={styles.userName}>
                  {item.nombre} (@{item.username})
                </Text>
                <Text style={styles.userRole}>
                  Rol: {item.rol.toUpperCase()}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.userSalary}>Salario: ${item.salario}</Text>
                <Text style={styles.userHours}>
                  Turno: {item.horas_cumplir} hs/día
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay empleados registrados.</Text>
          }
        />
      )}

      {vista === "horarios" && (
        <FlatList
          data={metricasHorarios}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.cardMetrics}>
              <View style={styles.metricHeader}>
                <Text style={styles.userName}>{item.nombre}</Text>
                <Text style={styles.metricTarget}>
                  Meta: {item.horas_cumplir}hs
                </Text>
              </View>

              <View style={styles.metricRow}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Ingreso</Text>
                  <Text style={styles.metricValue}>{item.horaIngreso}</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>En Servicio</Text>
                  <Text style={[styles.metricValue, { color: COLORS.primary }]}>
                    {item.tiempoServicio}
                  </Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Extras (+)</Text>
                  <Text style={[styles.metricValue, { color: COLORS.success }]}>
                    {item.horasExtras}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Adeudadas (-)</Text>
                  <Text style={[styles.metricValue, { color: COLORS.danger }]}>
                    {item.horasAdeudadas}
                  </Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay empleados para medir.</Text>
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar {usuarioEdit?.nombre}</Text>

            <Text style={styles.label}>Rol en la empresa:</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={rol} onValueChange={setRol}>
                <Picker.Item label="Empleado (Caja/Ventas)" value="empleado" />
                <Picker.Item label="Técnico (Mantenimiento)" value="tecnico" />
                <Picker.Item label="Limpieza" value="limpieza" />
              </Picker>
            </View>

            <Text style={styles.label}>Salario Base ($):</Text>
            <TextInput
              style={styles.inputDark}
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={salario}
              onChangeText={setSalario}
            />

            <Text style={styles.label}>Horas a cumplir por día:</Text>
            <TextInput
              style={styles.inputDark}
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={horasCumplir}
              onChangeText={setHorasCumplir}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSave]}
                onPress={guardarCambios}
              >
                <Text style={styles.btnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 15,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 6 },
  tabActive: { backgroundColor: COLORS.surface, elevation: 1 },
  tabText: { color: COLORS.textMuted, fontWeight: "bold", fontSize: 13 },
  tabTextActive: { color: COLORS.primary },
  card: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 1,
  },
  userName: { fontSize: 16, fontWeight: "bold", color: COLORS.text },
  userRole: { fontSize: 13, color: COLORS.secondary, marginTop: 4 },
  userSalary: { fontSize: 14, fontWeight: "bold", color: COLORS.success },
  userHours: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  cardMetrics: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 1,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 10,
    marginBottom: 10,
  },
  metricTarget: { fontSize: 13, color: COLORS.secondary, fontWeight: "bold" },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  metricBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  metricValue: { fontSize: 18, fontWeight: "bold", color: COLORS.text },
  emptyText: { textAlign: "center", color: COLORS.textMuted, marginTop: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.textMuted,
    marginBottom: 5,
  },
  pickerContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  inputDark: {
    backgroundColor: "#1F2937",
    color: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  btn: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  btnCancel: { backgroundColor: COLORS.danger },
  btnSave: { backgroundColor: COLORS.success },
  btnText: { color: COLORS.surface, fontWeight: "bold" },
});
