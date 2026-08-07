// src/screens/shared/Perfil.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  TextInput,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as LocalAuthentication from "expo-local-authentication";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/useAuthStore";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function Perfil() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [fichaje, setFichaje] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [prioridad, setPrioridad] = useState("Normal");

  useFocusEffect(
    useCallback(() => {
      try {
        const res = db.getAllSync(
          "SELECT tipo FROM asistencia WHERE id_usuario = ? ORDER BY id DESC LIMIT 1",
          [user.id],
        );
        if (res.length > 0) {
          setFichaje(res[0].tipo);
        } else {
          setFichaje("Salida");
        }
      } catch (error) {
        console.error(error);
      }
    }, [user.id]),
  );

  const handleAsistencia = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert("Aviso", "Dispositivo sin biometría.");
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Fichar",
      });

      if (result.success) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");

        const fechaLocalDB = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        const fechaLocalAlerta = now.toLocaleString();

        const tipoNuevo = fichaje === "Entrada" ? "Salida" : "Entrada";

        db.runSync(
          "INSERT INTO asistencia (id_usuario, fecha_hora, tipo) VALUES (?, ?, ?)",
          [user.id, fechaLocalDB, tipoNuevo],
        );

        setFichaje(tipoNuevo);
        Alert.alert(
          "Fichaje Exitoso",
          `Registraste tu ${tipoNuevo} a las ${fechaLocalAlerta}`,
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const enviarTicket = () => {
    if (!titulo || !descripcion || !ubicacion) {
      Alert.alert(
        "Campos incompletos",
        "Por favor, detalla la falla y ubicación.",
      );
      return;
    }
    try {
      db.runSync(
        "INSERT INTO tickets (id_usuario_creador, titulo, descripcion, prioridad, ubicacion, estado) VALUES (?, ?, ?, ?, ?, ?)",
        [user.id, titulo, descripcion, prioridad, ubicacion, "Pendiente"],
      );
      Alert.alert("Ticket Enviado", "El equipo de soporte ha sido notificado.");
      setModalVisible(false);
      setTitulo("");
      setDescripcion("");
      setUbicacion("");
      setPrioridad("Normal");
    } catch (error) {
      Alert.alert("Error", "Hubo un problema al crear el ticket.");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Profile */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user.nombre?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user.nombre}</Text>
        <Text style={styles.role}>{user.rol.toUpperCase()}</Text>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="wallet-outline" size={24} color={COLORS.secondary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Salario Base</Text>
            <Text style={styles.infoValue}>${user.salario}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={24} color={COLORS.secondary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Horas a cumplir</Text>
            <Text style={styles.infoValue}>
              {user.horas_cumplir} hs diarias
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <Text style={styles.sectionTitle}>Acciones Rápidas</Text>

      <TouchableOpacity
        style={[
          styles.actionBtn,
          fichaje === "Entrada" ? styles.btnSalida : styles.btnEntrada,
        ]}
        onPress={handleAsistencia}
        activeOpacity={0.8}
      >
        <Ionicons
          name="finger-print-outline"
          size={22}
          color={COLORS.surface}
          style={styles.btnIcon}
        />
        <Text style={styles.btnText}>
          {fichaje === "Entrada" ? "Registrar Salida" : "Registrar Entrada"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, styles.btnWarning]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons
          name="warning-outline"
          size={22}
          color={COLORS.surface}
          style={styles.btnIcon}
        />
        <Text style={styles.btnText}>Reportar Falla Técnica</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={logout}
        activeOpacity={0.6}
      >
        <Ionicons
          name="log-out-outline"
          size={20}
          color={COLORS.danger}
          style={styles.btnIcon}
        />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* Margen para la barra de navegación */}
      <View style={{ height: 100 }} />

      {/* Modal de Ticket (Diseño Moderno) */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Ticket</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Asunto</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Lentitud en equipo"
              placeholderTextColor={COLORS.textMuted}
              value={titulo}
              onChangeText={setTitulo}
            />

            <Text style={styles.inputLabel}>Detalles de la falla</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe el problema..."
              placeholderTextColor={COLORS.textMuted}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
            />

            <Text style={styles.inputLabel}>Ubicación</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Oficina de Ventas"
              placeholderTextColor={COLORS.textMuted}
              value={ubicacion}
              onChangeText={setUbicacion}
            />

            <Text style={styles.inputLabel}>Nivel de Prioridad</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={prioridad}
                onValueChange={(itemValue) => setPrioridad(itemValue)}
              >
                <Picker.Item label="Baja" value="Baja" />
                <Picker.Item label="Normal" value="Normal" />
                <Picker.Item label="Alta" value="Alta" />
                <Picker.Item label="Urgente" value="Urgente" />
              </Picker>
            </View>

            <TouchableOpacity
              style={styles.submitTicketBtn}
              onPress={enviarTicket}
            >
              <Text style={styles.btnText}>Enviar Reporte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.surface,
  },
  name: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  role: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
    marginTop: 4,
    letterSpacing: 1,
  },

  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoTextContainer: {
    marginLeft: 15,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 15,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 15,
    marginLeft: 5,
  },
  actionBtn: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  btnIcon: {
    marginRight: 10,
  },
  btnEntrada: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
  },
  btnSalida: {
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
  },
  btnWarning: {
    backgroundColor: COLORS.warning,
    shadowColor: COLORS.warning,
  },
  btnText: {
    color: COLORS.surface,
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: 0.3,
  },

  logoutBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
    marginTop: 10,
  },
  logoutText: {
    color: COLORS.danger,
    fontWeight: "600",
    fontSize: 15,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(11, 29, 51, 0.6)", // Azul noche transparente
    justifyContent: "flex-end", // Aparece desde abajo
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
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
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
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  pickerWrapper: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 25,
    overflow: "hidden",
  },
  submitTicketBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
});
