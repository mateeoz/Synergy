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

  const [eventos, setEventos] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");

  // Modal de Evento
  const [modalVisible, setModalVisible] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("reunion");
  const [visibilidad, setVisibilidad] = useState("global");

  // Selección de empleados
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

      // Filtrar según los permisos del usuario actual
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
      return Alert.alert("Error", "Faltan datos.");
    if (visibilidad === "especifico" && usuariosSeleccionados.length === 0)
      return Alert.alert("Error", "Selecciona al menos un usuario.");

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
      Alert.alert("Error", "No se pudo agendar.");
    }
  };

  // Función segura para combinar las marcas y la selección
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
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Calendario</Text>
      <Calendar
        markingType={"multi-dot"}
        markedDates={getMarkedDates()}
        onDayPress={(day) => setFechaSeleccionada(day.dateString)}
        theme={{
          todayTextColor: COLORS.primary,
          arrowColor: COLORS.primary,
        }}
      />

      <View style={styles.eventListContainer}>
        <Text style={styles.subtitle}>
          {fechaSeleccionada
            ? `Eventos del ${fechaSeleccionada}`
            : "Selecciona un día"}
        </Text>
        <FlatList
          data={eventosDelDia}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.eventCard}>
              <Text style={styles.eventTitle}>{item.titulo}</Text>
              <Text style={styles.eventType}>
                {item.tipo.toUpperCase()} • {item.visibilidad.toUpperCase()}
              </Text>
            </View>
          )}
        />
      </View>

      {isJefe && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            if (!fechaSeleccionada) Alert.alert("Aviso", "Toca un día.");
            else setModalVisible(true);
          }}
        >
          <Text style={styles.fabText}>+ Nuevo</Text>
        </TouchableOpacity>
      )}

      {/* Modal de Creación */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agendar Evento</Text>
            <TextInput
              style={styles.input}
              placeholder="Título"
              value={titulo}
              onChangeText={setTitulo}
            />

            <View style={styles.pickerContainer}>
              <Picker selectedValue={tipo} onValueChange={setTipo}>
                <Picker.Item label="Reunión" value="reunion" />
                <Picker.Item label="Vencimiento" value="impuesto" />
              </Picker>
            </View>

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={visibilidad}
                onValueChange={setVisibilidad}
              >
                <Picker.Item
                  label="Visible para todos (Global)"
                  value="global"
                />
                <Picker.Item label="Solo para mí (Privado)" value="privado" />
                <Picker.Item label="Empleados específicos" value="especifico" />
              </Picker>
            </View>

            {visibilidad === "especifico" && (
              <View style={styles.userList}>
                <Text style={styles.label}>Seleccionar invitados:</Text>
                <ScrollView style={{ maxHeight: 120 }}>
                  {listaUsuarios.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={styles.userRow}
                      onPress={() => toggleUsuario(u.id)}
                    >
                      <Text style={styles.userText}>
                        {usuariosSeleccionados.includes(u.id) ? "☑" : "☐"}{" "}
                        {u.nombre} ({u.rol})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSave]}
                onPress={agregarEvento}
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
  container: { flex: 1, backgroundColor: COLORS.background },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    padding: 20,
    paddingBottom: 10,
  },
  eventListContainer: { flex: 1, padding: 20 },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textMuted,
    marginBottom: 15,
  },
  eventCard: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primary,
    elevation: 1,
  },
  eventTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.text },
  eventType: { fontSize: 12, color: COLORS.secondary, marginTop: 4 },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 5,
  },
  fabText: { color: COLORS.surface, fontWeight: "bold" },
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
  input: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 15,
  },
  pickerContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  userList: { marginBottom: 15 },
  label: { fontWeight: "bold", marginBottom: 5 },
  userRow: { paddingVertical: 5 },
  userText: { fontSize: 16, color: COLORS.text },
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
