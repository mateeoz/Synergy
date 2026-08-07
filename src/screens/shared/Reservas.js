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
import { Ionicons } from "@expo/vector-icons";
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
        "Campos incompletos",
        "Por favor completa todos los datos y firma la solicitud.",
      );
    }

    try {
      db.runSync(
        "INSERT INTO reservas (id_usuario, espacio, fecha, hora, razon, firma_empleado) VALUES (?, ?, ?, ?, ?, ?)",
        [user.id, espacio, fechaReserva, horaReserva, razon, firma],
      );
      Alert.alert("Éxito", "Espacio reservado y agendado correctamente.");

      setFechaReserva("");
      setHoraReserva("");
      setRazon("");
      setFirma("");
      cargarReservas();
    } catch (error) {
      Alert.alert("Error", "No se pudo procesar la reserva.");
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.headerTitle}>Reserva de Espacios</Text>

      {/* Formulario */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Agendar Espacio</Text>

        <Text style={styles.inputLabel}>Seleccionar Instalación</Text>
        <View style={styles.pickerWrapper}>
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
              label="Auditorio / Conferencia"
              value="Auditorio / Conferencia"
            />
            <Picker.Item
              label="Sala de entrevistas"
              value="Sala de entrevistas"
            />
            <Picker.Item
              label="Sala de juntas del directorio"
              value="Sala de juntas del directorio"
            />
          </Picker>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.inputLabel}>Fecha (DD/MM)</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.textMuted}
              placeholder="Ej: 15/08"
              value={fechaReserva}
              onChangeText={setFechaReserva}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.inputLabel}>Hora Inicio</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.textMuted}
              placeholder="Ej: 14:00"
              value={horaReserva}
              onChangeText={setHoraReserva}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>Motivo de uso</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.textMuted}
          placeholder="Ej: Presentación de proyecto"
          value={razon}
          onChangeText={setRazon}
        />

        <Text style={styles.inputLabel}>Firma Electrónica (Nombre)</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.textMuted}
          placeholder="Escribe tu nombre completo"
          value={firma}
          onChangeText={setFirma}
        />

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={hacerReserva}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>Confirmar Reserva</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
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
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <Ionicons
                  name="business"
                  size={18}
                  color={COLORS.primary}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.reservaEspacio} numberOfLines={1}>
                  {item.espacio}
                </Text>
              </View>
              <View style={styles.badgeDate}>
                <Ionicons
                  name="time-outline"
                  size={12}
                  color="#D97706"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.badgeText}>
                  {item.fecha} • {item.hora}
                </Text>
              </View>
            </View>
            <Text style={styles.reservaMotivo}>"{item.razon}"</Text>
            <View style={styles.reservaFooter}>
              <Ionicons
                name="person-circle-outline"
                size={14}
                color={COLORS.secondary}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.reservaAutor}>{item.nombre_usuario}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Las instalaciones están libres actualmente.
          </Text>
        }
      />

      <View style={{ height: 100 }} />
    </ScrollView>
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

  card: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  col: { width: "48%" },

  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  btnText: { color: COLORS.surface, fontWeight: "600", fontSize: 16 },

  reservaCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.warning,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  reservaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  reservaEspacio: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  badgeDate: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: { color: "#D97706", fontSize: 11, fontWeight: "700" },
  reservaMotivo: {
    fontSize: 14,
    color: COLORS.text,
    fontStyle: "italic",
    marginBottom: 10,
  },
  reservaFooter: { flexDirection: "row", alignItems: "center" },
  reservaAutor: { fontSize: 12, color: COLORS.secondary, fontWeight: "600" },

  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    marginTop: 10,
    fontStyle: "italic",
  },
});
