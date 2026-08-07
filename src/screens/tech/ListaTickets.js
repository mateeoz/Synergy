// src/screens/tech/ListaTickets.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Image,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../../store/useAuthStore";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function ListaTickets() {
  const user = useAuthStore((state) => state.user);
  const [tickets, setTickets] = useState([]);

  // Estados para el Modal de Resolución
  const [modalVisible, setModalVisible] = useState(false);
  const [ticketActual, setTicketActual] = useState(null);
  const [estado, setEstado] = useState("");
  const [comentario, setComentario] = useState("");
  const [materiales, setMateriales] = useState("");
  const [tiempo, setTiempo] = useState("");
  const [fotoUri, setFotoUri] = useState(null);

  useFocusEffect(
    useCallback(() => {
      cargarTickets();
    }, []),
  );

  const cargarTickets = () => {
    try {
      const resultado = db.getAllSync("SELECT * FROM tickets ORDER BY id DESC");
      setTickets(resultado);
    } catch (error) {
      console.error("Error al cargar tickets:", error);
    }
  };

  const abrirTicket = (ticket) => {
    setTicketActual(ticket);
    setEstado(ticket.estado);
    setComentario(ticket.comentarios || "");
    setFotoUri(ticket.foto_uri || null);
    // Limpiamos los campos auxiliares al abrir
    setMateriales("");
    setTiempo("");
    setModalVisible(true);
  };

  const tomarFoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permiso denegado",
        "Se necesita acceso a la cámara para adjuntar fotos.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) {
      setFotoUri(result.assets[0].uri);
    }
  };

  const guardarResolucion = () => {
    try {
      // Unimos los datos extra en el comentario principal si existen
      let comentarioFinal = comentario;
      if (materiales) comentarioFinal += `\nRepuestos: ${materiales}`;
      if (tiempo) comentarioFinal += `\nTiempo empleado: ${tiempo}`;

      // Actualizamos el ticket
      db.runSync(
        "UPDATE tickets SET estado = ?, comentarios = ?, foto_uri = ? WHERE id = ?",
        [estado, comentarioFinal, fotoUri, ticketActual.id],
      );

      // Automatización: Si se soluciona, avisar al creador
      if (estado === "Solucionado") {
        const mensaje = `El problema "${ticketActual.titulo}" en ${ticketActual.ubicacion} ha sido resuelto.`;
        const fecha = new Date().toLocaleDateString();
        db.runSync(
          "INSERT INTO notificaciones (id_usuario_destino, titulo, mensaje, fecha, leido) VALUES (?, ?, ?, ?, ?)",
          [
            ticketActual.id_usuario_creador,
            "Ticket Solucionado ✅",
            mensaje,
            fecha,
            0,
          ],
        );
      }

      Alert.alert("Éxito", "Orden de trabajo actualizada.");
      setModalVisible(false);
      cargarTickets();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo guardar la actualización.");
    }
  };

  const renderItem = ({ item }) => {
    let badgeColor = COLORS.danger;
    if (item.estado === "En proceso") badgeColor = COLORS.primary;
    if (item.estado === "Esperando repuestos") badgeColor = "#F59E0B";
    if (item.estado === "Solucionado") badgeColor = COLORS.success;

    return (
      <TouchableOpacity style={styles.card} onPress={() => abrirTicket(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.titulo}</Text>
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{item.estado}</Text>
          </View>
        </View>
        <Text style={styles.cardDesc}>{item.descripcion}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>📍 {item.ubicacion}</Text>
          <Text style={styles.footerText}>🔥 Prioridad: {item.prioridad}</Text>
        </View>
        <Text style={styles.editHint}>Ver / Actualizar ➔</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Módulo de Mantenimiento</Text>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay tickets asignados.</Text>
        }
      />

      {/* MODAL DE ACTUALIZACIÓN DEL TÉCNICO */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gestionar Orden</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {ticketActual && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    Falla: {ticketActual.descripcion}
                  </Text>
                </View>
              )}

              <Text style={styles.label}>Estado del trabajo:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={estado}
                  onValueChange={(itemValue) => setEstado(itemValue)}
                >
                  <Picker.Item label="Pendiente" value="Pendiente" />
                  <Picker.Item label="En proceso" value="En proceso" />
                  <Picker.Item
                    label="Esperando repuestos"
                    value="Esperando repuestos"
                  />
                  <Picker.Item label="Solucionado" value="Solucionado" />
                </Picker>
              </View>

              <Text style={styles.label}>Notas de diagnóstico:</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                placeholder="Ej: Clonación de disco terminada mediante software..."
                value={comentario}
                onChangeText={setComentario}
                multiline
              />

              <Text style={styles.label}>Repuestos o Hardware utilizado:</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Unidad SSD 500GB SATA3"
                value={materiales}
                onChangeText={setMateriales}
              />

              <Text style={styles.label}>Tiempo estimado empleado:</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 2 horas"
                value={tiempo}
                onChangeText={setTiempo}
              />

              <TouchableOpacity style={styles.btnCamera} onPress={tomarFoto}>
                <Text style={styles.btnCameraText}>
                  📷{" "}
                  {fotoUri
                    ? "Cambiar Foto Adjunta"
                    : "Adjuntar Foto del Trabajo"}
                </Text>
              </TouchableOpacity>

              {fotoUri && (
                <Image source={{ uri: fotoUri }} style={styles.previewImage} />
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.btnCancel]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.btnText}>Cerrar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.btnSave]}
                  onPress={guardarResolucion}
                >
                  <Text style={styles.btnText}>Actualizar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    marginBottom: 15,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  badgeText: { color: COLORS.surface, fontSize: 12, fontWeight: "bold" },
  cardDesc: { fontSize: 14, color: COLORS.textMuted, marginBottom: 15 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
    paddingBottom: 10,
  },
  footerText: { fontSize: 13, color: COLORS.secondary, fontWeight: "bold" },
  editHint: {
    color: COLORS.primary,
    fontWeight: "bold",
    textAlign: "right",
    marginTop: 5,
  },
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
    padding: 10,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 20,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 15,
  },
  infoBox: {
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  infoText: { fontStyle: "italic", color: COLORS.textMuted },
  label: { color: COLORS.textMuted, fontSize: 14, marginBottom: 5 },
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
    marginBottom: 15,
  },
  btnCamera: {
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  btnCameraText: { color: COLORS.surface, fontWeight: "bold" },
  previewImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    resizeMode: "cover",
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalBtn: {
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
