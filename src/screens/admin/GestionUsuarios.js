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
import { Ionicons } from "@expo/vector-icons";
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

    const parseDateSafe = (str) => {
      if (!str) return new Date();
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
        return new Date(y, m - 1, d, h, min, s);
      }
      return new Date();
    };

    const metricas = users.map((u) => {
      const asisUser = asistencias.filter((a) => a.id_usuario === u.id);
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
        const primerIngreso = parseDateSafe(entradas[0].fecha_hora);
        horaIngreso = `${String(primerIngreso.getHours()).padStart(2, "0")}:${String(primerIngreso.getMinutes()).padStart(2, "0")}`;

        for (let i = 0; i < entradas.length; i++) {
          const tEntrada = parseDateSafe(entradas[i].fecha_hora).getTime();
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
      <Text style={styles.headerTitle}>Equipo y Personal</Text>

      {/* Segmented Control Moderno */}
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
            Directorio
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
            Asistencia (Hoy)
          </Text>
        </TouchableOpacity>
      </View>

      {vista === "plantilla" && (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.userCard}
              onPress={() => abrirEdicion(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.nombre.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.userName}>{item.nombre}</Text>
                  <Text style={styles.userSub}>
                    @{item.username} • {item.rol.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.userSalary}>${item.salario}</Text>
                <Text style={styles.userHours}>
                  {item.horas_cumplir} hs/día
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
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={[
                      styles.avatarpeq,
                      { backgroundColor: "rgba(11, 29, 51, 0.1)" },
                    ]}
                  >
                    <Text style={styles.avatarTextPeq}>
                      {item.nombre.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.metricName}>{item.nombre}</Text>
                </View>
                <View style={styles.badgeTarget}>
                  <Text style={styles.badgeTargetText}>
                    Meta: {item.horas_cumplir}hs
                  </Text>
                </View>
              </View>

              <View style={styles.metricGrid}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>INGRESO</Text>
                  <Text style={styles.metricValueBase}>{item.horaIngreso}</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>TIEMPO ACTIVO</Text>
                  <Text style={styles.metricValuePrimary}>
                    {item.tiempoServicio}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>EXTRAS</Text>
                  <Text style={styles.metricValueSuccess}>
                    {item.horasExtras}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>DEUDA</Text>
                  <Text style={styles.metricValueDanger}>
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

      {/* Modal de Edición Modernizado */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Empleado</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Rol en la empresa</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={rol} onValueChange={setRol}>
                <Picker.Item label="Empleado (Caja/Ventas)" value="empleado" />
                <Picker.Item label="Técnico (Mantenimiento)" value="tecnico" />
                <Picker.Item label="Limpieza" value="limpieza" />
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Salario Base ($)</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={salario}
              onChangeText={setSalario}
            />

            <Text style={styles.inputLabel}>Horas a cumplir por día</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={horasCumplir}
              onChangeText={setHorasCumplir}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={guardarCambios}>
              <Text style={styles.btnText}>Guardar Cambios</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

  // Segmented Control
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10 },
  tabActive: {
    backgroundColor: COLORS.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { color: COLORS.textMuted, fontWeight: "600", fontSize: 14 },
  tabTextActive: { color: COLORS.primary, fontWeight: "700" },

  // User Cards
  userCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLeft: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(11, 29, 51, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: "bold", color: COLORS.primary },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  userSub: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 2,
    fontWeight: "500",
  },
  cardRight: { alignItems: "flex-end" },
  userSalary: { fontSize: 15, fontWeight: "700", color: COLORS.success },
  userHours: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  // Metric Cards
  metricCard: {
    backgroundColor: COLORS.surface,
    padding: 18,
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
    marginBottom: 15,
  },
  avatarpeq: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarTextPeq: { fontSize: 14, fontWeight: "bold", color: COLORS.primary },
  metricName: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  badgeTarget: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeTargetText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  metricBox: {
    width: "48%",
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  metricValueBase: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  metricValuePrimary: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.primary,
  },
  metricValueSuccess: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.success,
  },
  metricValueDanger: { fontSize: 16, fontWeight: "800", color: COLORS.danger },

  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    marginTop: 20,
    fontStyle: "italic",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(11, 29, 51, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 25,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: COLORS.primary },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    marginBottom: 16,
    fontSize: 15,
  },
  pickerWrapper: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    overflow: "hidden",
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: COLORS.surface, fontWeight: "600", fontSize: 16 },
});
