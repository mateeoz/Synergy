// src/screens/shared/Perfil.js
import React, { useState } from "react";
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
import { useAuthStore } from "../../store/useAuthStore";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function Perfil() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [fichaje, setFichaje] = useState(null);

  // Estados para el Modal de Tickets
  const [modalVisible, setModalVisible] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [prioridad, setPrioridad] = useState("Normal");

  const handleAsistencia = async () => {
    // ... (El código de la huella queda igual que antes)
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
        const fechaActual = new Date().toLocaleString();
        const tipo = fichaje === "entrada" ? "salida" : "entrada";
        db.runSync(
          "INSERT INTO asistencia (id_usuario, fecha_hora, tipo) VALUES (?, ?, ?)",
          [user.id, fechaActual, tipo],
        );
        setFichaje(tipo);
        Alert.alert("Éxito", `Fichaste tu ${tipo} a las ${fechaActual}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const enviarTicket = () => {
    if (!titulo || !descripcion || !ubicacion) {
      Alert.alert("Error", "Completa todos los campos para reportar la falla.");
      return;
    }
    try {
      db.runSync(
        "INSERT INTO tickets (id_usuario_creador, titulo, descripcion, prioridad, ubicacion, estado) VALUES (?, ?, ?, ?, ?, ?)",
        [user.id, titulo, descripcion, prioridad, ubicacion, "Pendiente"],
      );
      Alert.alert("Enviado", "El técnico recibió tu solicitud de soporte.");
      setModalVisible(false);
      setTitulo("");
      setDescripcion("");
      setUbicacion("");
      setPrioridad("Normal");
    } catch (error) {
      Alert.alert("Error", "No se pudo crear el ticket.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{user.nombre}</Text>
        <Text style={styles.role}>Rol: {user.rol.toUpperCase()}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tus Datos Laborales</Text>
        <Text style={styles.cardText}>💰 Salario: ${user.salario}</Text>
        <Text style={styles.cardText}>⏰ Entrada: {user.hora_entrada}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.btn,
          fichaje === "entrada" ? styles.btnSalida : styles.btnEntrada,
        ]}
        onPress={handleAsistencia}
      >
        <Text style={styles.btnText}>
          {fichaje === "entrada"
            ? "Fichar Salida (Huella)"
            : "Fichar Entrada (Huella)"}
        </Text>
      </TouchableOpacity>

      {/* Botón para reportar fallas (NUEVO) */}
      <TouchableOpacity
        style={[styles.btn, styles.btnWarning]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.btnText}>⚠️ Reportar Inconveniente</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.btnLogout]} onPress={logout}>
        <Text style={styles.btnText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* MODAL DE TICKET */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear Ticket de Soporte</Text>

            <TextInput
              style={styles.input}
              placeholder="Falla (Ej: Lentitud extrema en equipo)"
              value={titulo}
              onChangeText={setTitulo}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Detalle (Ej: El sistema operativo tarda mucho en iniciar, el disco rígido está al 100%. Requiere clonación a SSD.)"
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Ubicación (Ej: Oficina de Ventas, PC 3)"
              value={ubicacion}
              onChangeText={setUbicacion}
            />

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={prioridad}
                onValueChange={(itemValue) => setPrioridad(itemValue)}
                style={{ height: 50 }}
              >
                <Picker.Item label="Prioridad: Baja" value="Baja" />
                <Picker.Item label="Prioridad: Normal" value="Normal" />
                <Picker.Item label="Prioridad: Alta" value="Alta" />
                <Picker.Item label="Prioridad: Urgente" value="Urgente" />
              </Picker>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnLogout]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnEntrada]}
                onPress={enviarTicket}
              >
                <Text style={styles.btnText}>Enviar Falla</Text>
              </TouchableOpacity>
            </View>
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
    padding: 20,
    alignItems: "center",
  },
  header: { alignItems: "center", marginBottom: 20, marginTop: 10 },
  name: { fontSize: 28, fontWeight: "bold", color: COLORS.primary },
  role: { fontSize: 16, color: COLORS.secondary, marginTop: 5 },
  card: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 15,
    width: "100%",
    marginBottom: 20,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  cardText: { fontSize: 16, color: COLORS.text, marginBottom: 10 },
  btn: {
    width: "100%",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },
  btnEntrada: { backgroundColor: COLORS.primary },
  btnSalida: { backgroundColor: COLORS.secondary },
  btnWarning: { backgroundColor: "#F59E0B" },
  btnLogout: { backgroundColor: COLORS.danger },
  btnText: { color: COLORS.surface, fontWeight: "bold", fontSize: 16 },

  // Modal
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
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 15,
  },
  input: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  pickerContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 15,
  },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
  modalBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
});
