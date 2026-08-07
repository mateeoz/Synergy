// src/screens/shared/Reservas.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../../store/useAuthStore";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function Reservas() {
  const user = useAuthStore((state) => state.user);

  const [espacio, setEspacio] = useState("Sala de reuniones");
  const [fechaReserva, setFechaReserva] = useState("");
  const [horaReserva, setHoraReserva] = useState("");
  const [razon, setRazon] = useState("");
  const [firma, setFirma] = useState("");

  const [reservasActivas, setReservasActivas] = useState([]);

  useFocusEffect(
    useCallback(() => {
      cargarReservas();
    }, []),
  );

  const cargarReservas = () => {
    // Unimos con la tabla usuarios para mostrar el nombre del que reservó
    const query = `
      SELECT r.*, u.nombre as nombre_usuario 
      FROM reservas r 
      JOIN usuarios u ON r.id_usuario = u.id 
      ORDER BY r.id DESC
    `;
    setReservasActivas(db.getAllSync(query));
  };

  const hacerReserva = () => {
    if (!fechaReserva || !horaReserva || !razon || !firma) {
      return Alert.alert(
        "Error",
        "Completa todos los campos y firma tu reserva.",
      );
    }

    try {
      db.runSync(
        "INSERT INTO reservas (id_usuario, espacio, fecha, hora, razon, firma_empleado) VALUES (?, ?, ?, ?, ?, ?)",
        [user.id, espacio, fechaReserva, horaReserva, razon, firma],
      );
      Alert.alert("Éxito", "Espacio reservado correctamente.");

      setFechaReserva("");
      setHoraReserva("");
      setRazon("");
      setFirma("");
      cargarReservas();
    } catch (error) {
      Alert.alert("Error", "No se pudo completar la reserva.");
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.headerTitle}>Reservas de Espacios</Text>

      {/* FORMULARIO DE RESERVA */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Agendar Nueva Reserva</Text>

        <Text style={styles.label}>Seleccionar Espacio:</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={espacio} onValueChange={setEspacio}>
            <Picker.Item label="Sala de reuniones" value="Sala de reuniones" />
            <Picker.Item
              label="Sala de videoconferencias"
              value="Sala de videoconferencias"
            />
            <Picker.Item
              label="Sala de capacitación"
              value="Sala de capacitación"
            />
            <Picker.Item
              label="Auditorio / Sala de conferencias"
              value="Auditorio"
            />
            <Picker.Item
              label="Sala de entrevistas"
              value="Sala de entrevistas"
            />
            <Picker.Item
              label="Sala de juntas del directorio"
              value="Sala de juntas"
            />
          </Picker>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Fecha (Ej: 15/08):</Text>
            <TextInput
              style={styles.inputDark}
              placeholderTextColor="#9CA3AF"
              placeholder="DD/MM"
              value={fechaReserva}
              onChangeText={setFechaReserva}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Hora (Ej: 14:00):</Text>
            <TextInput
              style={styles.inputDark}
              placeholderTextColor="#9CA3AF"
              placeholder="HH:MM"
              value={horaReserva}
              onChangeText={setHoraReserva}
            />
          </View>
        </View>

        <Text style={styles.label}>Motivo / Razón:</Text>
        <TextInput
          style={styles.inputDark}
          placeholderTextColor="#9CA3AF"
          placeholder="Ej: Entrevista con cliente"
          value={razon}
          onChangeText={setRazon}
        />

        <Text style={styles.label}>Firma Digital (Tu nombre completo):</Text>
        <TextInput
          style={styles.inputDark}
          placeholderTextColor="#9CA3AF"
          placeholder="Escribe tu nombre"
          value={firma}
          onChangeText={setFirma}
        />

        <TouchableOpacity style={styles.btnSubmit} onPress={hacerReserva}>
          <Text style={styles.btnText}>Confirmar Reserva</Text>
        </TouchableOpacity>
      </View>

      {/* LISTA DE RESERVAS */}
      <Text style={[styles.headerTitle, { fontSize: 20, marginTop: 10 }]}>
        Agenda de Ocupación
      </Text>

      <FlatList
        data={reservasActivas}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.reservaCard}>
            <View style={styles.reservaHeader}>
              <Text style={styles.reservaEspacio}>{item.espacio}</Text>
              <View style={styles.badgeDate}>
                <Text style={styles.badgeText}>
                  {item.fecha} - {item.hora}
                </Text>
              </View>
            </View>
            <Text style={styles.reservaMotivo}>"{item.razon}"</Text>
            <Text style={styles.reservaAutor}>
              Reservado por: {item.nombre_usuario}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No hay espacios reservados actualmente.
          </Text>
        }
      />

      {/* Margen final para no chocar con la barra inferior */}
      <View style={{ height: 100 }} />
    </ScrollView>
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
  card: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
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
  row: { flexDirection: "row", justifyContent: "space-between" },
  col: { flex: 0.48 },
  btnSubmit: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5,
  },
  btnText: { color: COLORS.surface, fontWeight: "bold", fontSize: 16 },

  reservaCard: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: "#F59E0B",
    elevation: 1,
  },
  reservaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reservaEspacio: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    flex: 1,
  },
  badgeDate: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: "#D97706", fontSize: 12, fontWeight: "bold" },
  reservaMotivo: {
    fontSize: 14,
    color: COLORS.text,
    fontStyle: "italic",
    marginBottom: 8,
  },
  reservaAutor: { fontSize: 12, color: COLORS.secondary },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    marginTop: 10,
    fontStyle: "italic",
  },
});
