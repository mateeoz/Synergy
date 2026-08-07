// src/screens/shared/CalendarioGlobal.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
  ScrollView,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/useAuthStore";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

LocaleConfig.locales["es"] = {
  monthNames: [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ],
  monthNamesShort: [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ],
  dayNames: [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ],
  dayNamesShort: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  today: "Hoy",
};
LocaleConfig.defaultLocale = "es";

export default function CalendarioGlobal() {
  const user = useAuthStore((state) => state.user);
  const isJefe = user?.rol === "jefe";
  const insets = useSafeAreaInsets();

  const [eventos, setEventos] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("reunion");
  const [visibilidad, setVisibilidad] = useState("global");

  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState([]);

  useFocusEffect(
    useCallback(() => {
      cargarEventos();
      if (isJefe) cargarUsuarios();
    }, []),
  );

  const cargarUsuarios = () => {
    const res = db.getAllSync(
      'SELECT id, nombre, rol FROM usuarios WHERE rol != "jefe"',
    );
    setListaUsuarios(res);
  };

  const cargarEventos = () => {
    try {
      const resultado = db.getAllSync("SELECT * FROM eventos");
      const eventosPermitidos = resultado.filter((ev) => {
        if (ev.visibilidad === "global") return true;
        if (ev.visibilidad === "privado" && isJefe) return true;
        if (ev.visibilidad === "especifico") {
          if (isJefe) return true;
          const permitidos = ev.usuarios_permitidos.split(",");
          return permitidos.includes(user.id.toString());
        }
        return false;
      });

      setEventos(eventosPermitidos);

      let marks = {};
      eventosPermitidos.forEach((ev) => {
        let dotColor = COLORS.primary;
        if (ev.tipo === "impuesto") dotColor = COLORS.danger;
        if (ev.tipo === "sueldo") dotColor = COLORS.success;
        if (marks[ev.fecha]) marks[ev.fecha].dots.push({ color: dotColor });
        else marks[ev.fecha] = { dots: [{ color: dotColor }] };
      });
      setMarkedDates(marks);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleUsuario = (id) => {
    if (usuariosSeleccionados.includes(id)) {
      setUsuariosSeleccionados(
        usuariosSeleccionados.filter((uid) => uid !== id),
      );
    } else {
      setUsuariosSeleccionados([...usuariosSeleccionados, id]);
    }
  };

  const agregarEvento = () => {
    if (!titulo || !fechaSeleccionada)
      return Alert.alert("Error", "El título es obligatorio.");
    if (visibilidad === "especifico" && usuariosSeleccionados.length === 0)
      return Alert.alert("Error", "Selecciona al menos un invitado.");

    try {
      const idsPermitidos = usuariosSeleccionados.join(",");
      db.runSync(
        "INSERT INTO eventos (titulo, fecha, tipo, visibilidad, usuarios_permitidos) VALUES (?, ?, ?, ?, ?)",
        [titulo, fechaSeleccionada, tipo, visibilidad, idsPermitidos],
      );
      setModalVisible(false);
      setTitulo("");
      setUsuariosSeleccionados([]);
      setVisibilidad("global");
      cargarEventos();
    } catch (error) {
      Alert.alert("Error", "No se pudo registrar el evento.");
    }
  };

  const getMarkedDates = () => {
    if (!fechaSeleccionada) return markedDates;
    return {
      ...markedDates,
      [fechaSeleccionada]: {
        ...(markedDates[fechaSeleccionada] || {}),
        selected: true,
        selectedColor: COLORS.secondary,
      },
    };
  };

  const eventosDelDia = eventos.filter((ev) => ev.fecha === fechaSeleccionada);

  return (
    <View style={[styles.container, { paddingBottom: 85 + insets.bottom }]}>
      <Text style={styles.headerTitle}>Calendario Global</Text>

      <View style={styles.calendarContainer}>
        <Calendar
          markingType={"multi-dot"}
          markedDates={getMarkedDates()}
          onDayPress={(day) => setFechaSeleccionada(day.dateString)}
          theme={{
            backgroundColor: COLORS.surface,
            calendarBackground: COLORS.surface,
            todayTextColor: COLORS.primary,
            arrowColor: COLORS.primary,
            monthTextColor: COLORS.primary,
            textMonthFontWeight: "bold",
            textDayHeaderFontWeight: "600",
          }}
        />
      </View>

      <View style={styles.eventListContainer}>
        <Text style={styles.subtitle}>
          {fechaSeleccionada
            ? `Eventos del ${fechaSeleccionada}`
            : "Selecciona una fecha en el calendario"}
        </Text>
        <FlatList
          data={eventosDelDia}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isDanger = item.tipo === "impuesto";
            const isSuccess = item.tipo === "sueldo";
            const accentColor = isDanger
              ? COLORS.danger
              : isSuccess
                ? COLORS.success
                : COLORS.primary;

            return (
              <View
                style={[styles.eventCard, { borderLeftColor: accentColor }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{item.titulo}</Text>
                  <Text style={styles.eventType}>
                    {item.tipo.toUpperCase()} • {item.visibilidad.toUpperCase()}
                  </Text>
                </View>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={accentColor}
                />
              </View>
            );
          }}
        />
      </View>

      {isJefe && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 100 + insets.bottom }]}
          onPress={() => {
            if (!fechaSeleccionada)
              Alert.alert("Aviso", "Primero toca un día en el calendario.");
            else setModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color={COLORS.surface} />
        </TouchableOpacity>
      )}

      {/* Modal Modernizado */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agendar Evento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Título del evento</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.textMuted}
              placeholder="Ej: Presentación Anual"
              value={titulo}
              onChangeText={setTitulo}
            />

            <Text style={styles.inputLabel}>Clasificación</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={tipo} onValueChange={setTipo}>
                <Picker.Item label="Reunión Corporativa" value="reunion" />
                <Picker.Item label="Vencimiento / Impuesto" value="impuesto" />
                <Picker.Item label="Pago de Sueldos" value="sueldo" />
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Privacidad</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={visibilidad}
                onValueChange={setVisibilidad}
              >
                <Picker.Item label="Público (Toda la empresa)" value="global" />
                <Picker.Item label="Privado (Solo Dirección)" value="privado" />
                <Picker.Item
                  label="Restringido (Seleccionar asistentes)"
                  value="especifico"
                />
              </Picker>
            </View>

            {visibilidad === "especifico" && (
              <View style={styles.userList}>
                <Text style={[styles.inputLabel, { marginBottom: 10 }]}>
                  Seleccionar invitados:
                </Text>
                <ScrollView
                  style={{ maxHeight: 130 }}
                  showsVerticalScrollIndicator={false}
                >
                  {listaUsuarios.map((u) => {
                    const isSelected = usuariosSeleccionados.includes(u.id);
                    return (
                      <TouchableOpacity
                        key={u.id}
                        style={styles.userRow}
                        onPress={() => toggleUsuario(u.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={22}
                          color={isSelected ? COLORS.primary : COLORS.textMuted}
                          style={{ marginRight: 10 }}
                        />
                        <Text
                          style={[
                            styles.userText,
                            isSelected && {
                              fontWeight: "700",
                              color: COLORS.primary,
                            },
                          ]}
                        >
                          {u.nombre}{" "}
                          <Text
                            style={{
                              fontWeight: "400",
                              fontSize: 12,
                              color: COLORS.secondary,
                            }}
                          >
                            ({u.rol})
                          </Text>
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={agregarEvento}>
              <Text style={styles.btnText}>Guardar Evento</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 15,
    letterSpacing: -0.5,
  },

  calendarContainer: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  eventListContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  subtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  eventType: { fontSize: 11, color: COLORS.secondary, fontWeight: "600" },

  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },

  // Modal
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
    marginBottom: 16,
    overflow: "hidden",
  },
  userList: {
    marginBottom: 15,
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  userText: { fontSize: 15, color: COLORS.text },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: COLORS.surface, fontWeight: "600", fontSize: 16 },
});
