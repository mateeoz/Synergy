// src/screens/admin/GestionUsuarios.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Estados para el formulario de edición
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [rol, setRol] = useState("");
  const [salario, setSalario] = useState("");
  const [horaEntrada, setHoraEntrada] = useState("");
  const [horasCumplir, setHorasCumplir] = useState("");

  // Cargar usuarios de SQLite (useFocusEffect hace que se recargue cada vez que entras a la pestaña)
  useFocusEffect(
    useCallback(() => {
      cargarUsuarios();
    }, []),
  );

  const cargarUsuarios = () => {
    try {
      // Traemos a todos menos al admin actual
      const resultado = db.getAllSync(
        'SELECT * FROM usuarios WHERE username != "admin"',
      );
      setUsuarios(resultado);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    }
  };

  const abrirModalEdicion = (usuario) => {
    setUsuarioEditando(usuario);
    setRol(usuario.rol);
    setSalario(usuario.salario ? usuario.salario.toString() : "0");
    setHoraEntrada(usuario.hora_entrada || "08:00");
    setHorasCumplir(
      usuario.horas_cumplir ? usuario.horas_cumplir.toString() : "8",
    );
    setModalVisible(true);
  };

  const guardarCambios = () => {
    try {
      db.runSync(
        "UPDATE usuarios SET rol = ?, salario = ?, hora_entrada = ?, horas_cumplir = ? WHERE id = ?",
        [
          rol,
          parseFloat(salario) || 0,
          horaEntrada,
          parseInt(horasCumplir) || 8,
          usuarioEditando.id,
        ],
      );
      Alert.alert("Éxito", "Datos del empleado actualizados");
      setModalVisible(false);
      cargarUsuarios(); // Recargar la lista
    } catch (error) {
      Alert.alert("Error", "No se pudieron guardar los cambios");
      console.error(error);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => abrirModalEdicion(item)}
    >
      <View>
        <Text style={styles.cardTitle}>{item.nombre}</Text>
        <Text style={styles.cardSubtitle}>
          @{item.username} - Rol: {item.rol.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.editHint}>Editar ➔</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Personal Registrado</Text>

      <FlatList
        data={usuarios}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No hay empleados registrados aún.
          </Text>
        }
      />

      {/* MODAL DE EDICIÓN */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Empleado</Text>

            <Text style={styles.label}>Rol en la empresa:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={rol}
                onValueChange={(itemValue) => setRol(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Empleado" value="empleado" />
                <Picker.Item label="Técnico" value="tecnico" />
                <Picker.Item label="Limpieza" value="limpieza" />
                <Picker.Item label="Jefe" value="jefe" />
              </Picker>
            </View>

            <Text style={styles.label}>Salario (Mensual):</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={salario}
              onChangeText={setSalario}
              placeholder="Ej: 500000"
            />

            <Text style={styles.label}>Hora de Entrada:</Text>
            <TextInput
              style={styles.input}
              value={horaEntrada}
              onChangeText={setHoraEntrada}
              placeholder="Ej: 08:00"
            />

            <Text style={styles.label}>Horas de Jornada:</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={horasCumplir}
              onChangeText={setHorasCumplir}
              placeholder="Ej: 8"
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
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text },
  cardSubtitle: { fontSize: 14, color: COLORS.secondary, marginTop: 4 },
  editHint: { color: COLORS.primary, fontWeight: "bold" },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    marginTop: 20,
    fontSize: 16,
  },

  // Estilos del Modal
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
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 15,
    textAlign: "center",
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pickerContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  picker: { height: 50 },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
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
  btnText: { color: COLORS.surface, fontWeight: "bold", fontSize: 16 },
});
