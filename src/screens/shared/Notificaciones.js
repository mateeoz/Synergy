// src/screens/shared/Notificaciones.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../../store/useAuthStore";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function Notificaciones() {
  const user = useAuthStore((state) => state.user);
  const isJefe = user?.rol === "jefe";

  const [notificaciones, setNotificaciones] = useState([]);
  const [eventosProximos, setEventosProximos] = useState([]);
  const [anuncios, setAnuncios] = useState([]);

  // Modal de Anuncios
  const [modalAnuncio, setModalAnuncio] = useState(false);
  const [tituloAnuncio, setTituloAnuncio] = useState("");
  const [mensajeAnuncio, setMensajeAnuncio] = useState("");

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, []),
  );

  const cargarDatos = () => {
    setNotificaciones(
      db.getAllSync(
        "SELECT * FROM notificaciones WHERE id_usuario_destino = ? ORDER BY id DESC",
        [user.id],
      ),
    );
    setAnuncios(db.getAllSync("SELECT * FROM anuncios ORDER BY id DESC"));

    // Carga de eventos de la semana (Lógica que ya teníamos)
    const resEventos = db.getAllSync("SELECT * FROM eventos");
    const hoy = new Date();
    const limite = new Date();
    limite.setDate(hoy.getDate() + 7);
    const formatISO = (d) => d.toISOString().split("T")[0];

    const proximos = resEventos.filter((ev) => {
      if (!(ev.fecha >= formatISO(hoy) && ev.fecha <= formatISO(limite)))
        return false;
      if (ev.visibilidad === "global") return true;
      if (ev.visibilidad === "privado" && isJefe) return true;
      if (ev.visibilidad === "especifico") {
        if (isJefe) return true;
        return ev.usuarios_permitidos.split(",").includes(user.id.toString());
      }
      return false;
    });
    setEventosProximos(proximos.sort((a, b) => a.fecha.localeCompare(b.fecha)));
  };

  const publicarAnuncio = () => {
    if (!tituloAnuncio || !mensajeAnuncio)
      return Alert.alert("Error", "Completa los campos.");
    const fecha = new Date().toLocaleDateString();
    db.runSync(
      "INSERT INTO anuncios (titulo, mensaje, fecha, autor) VALUES (?, ?, ?, ?)",
      [tituloAnuncio, mensajeAnuncio, fecha, user.nombre],
    );
    setModalAnuncio(false);
    setTituloAnuncio("");
    setMensajeAnuncio("");
    cargarDatos();
  };

  const marcarComoLeida = (id, leido) => {
    if (leido === 1) return;
    db.runSync("UPDATE notificaciones SET leido = 1 WHERE id = ?", [id]);
    cargarDatos();
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* PANEL DE ANUNCIOS */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>📢 Tablón de Anuncios</Text>
          {isJefe && (
            <TouchableOpacity
              style={styles.btnAdd}
              onPress={() => setModalAnuncio(true)}
            >
              <Text style={styles.btnAddText}>+ Publicar</Text>
            </TouchableOpacity>
          )}
        </View>

        {anuncios.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
          >
            {anuncios.map((an) => (
              <View key={an.id} style={styles.anuncioCard}>
                <Text style={styles.anuncioTitle}>{an.titulo}</Text>
                <Text style={styles.anuncioMessage}>{an.mensaje}</Text>
                <Text style={styles.anuncioAuthor}>
                  Por {an.autor} • {an.fecha}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>No hay comunicados oficiales.</Text>
        )}

        {/* AGENDA SEMANAL */}
        <Text style={[styles.headerTitle, { marginTop: 20 }]}>
          🗓️ Agenda de la Semana
        </Text>
        {eventosProximos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
          >
            {eventosProximos.map((ev) => (
              <View key={ev.id} style={styles.eventBadge}>
                <Text style={styles.eventBadgeDate}>{ev.fecha}</Text>
                <Text style={styles.eventBadgeTitle}>{ev.titulo}</Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>Semana libre de eventos.</Text>
        )}

        {/* BUZÓN PERSONAL */}
        <Text style={[styles.headerTitle, { marginTop: 20 }]}>📬 Tu Buzón</Text>
        {notificaciones.length === 0 && (
          <Text style={styles.emptyText}>No tienes notificaciones.</Text>
        )}
        {notificaciones.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.card,
              item.leido === 0 ? styles.unreadCard : styles.readCard,
            ]}
            onPress={() => marcarComoLeida(item.id, item.leido)}
          >
            <View style={styles.cardHeader}>
              <Text
                style={[styles.title, item.leido === 0 && styles.unreadText]}
              >
                {item.titulo}
              </Text>
              <Text style={styles.date}>{item.fecha}</Text>
            </View>
            <Text style={styles.message}>{item.mensaje}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* MODAL CREAR ANUNCIO */}
      <Modal visible={modalAnuncio} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuevo Comunicado</Text>
            <TextInput
              style={styles.input}
              placeholder="Asunto"
              value={tituloAnuncio}
              onChangeText={setTituloAnuncio}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Mensaje..."
              multiline
              value={mensajeAnuncio}
              onChangeText={setMensajeAnuncio}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={() => setModalAnuncio(false)}
              >
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSave]}
                onPress={publicarAnuncio}
              >
                <Text style={styles.btnText}>Publicar</Text>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.primary },
  btnAdd: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  btnAddText: { color: COLORS.surface, fontWeight: "bold", fontSize: 12 },
  horizontalScroll: { marginBottom: 10 },
  anuncioCard: {
    backgroundColor: "#FEF3C7",
    padding: 15,
    borderRadius: 10,
    marginRight: 15,
    width: 250,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  anuncioTitle: { fontWeight: "bold", color: "#92400E", fontSize: 16 },
  anuncioMessage: { color: "#B45309", marginTop: 5, fontSize: 14 },
  anuncioAuthor: {
    color: "#D97706",
    fontSize: 10,
    marginTop: 10,
    fontWeight: "bold",
  },
  eventBadge: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    marginRight: 15,
    width: 200,
  },
  eventBadgeDate: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
  },
  eventBadgeTitle: { color: COLORS.surface, fontSize: 16, fontWeight: "bold" },
  card: { padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1 },
  unreadCard: {
    backgroundColor: "#E0F2FE",
    borderColor: COLORS.primary,
    elevation: 2,
  },
  readCard: { backgroundColor: COLORS.surface, borderColor: "#E5E7EB" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { fontSize: 16, fontWeight: "600", color: COLORS.textMuted },
  unreadText: { fontWeight: "bold", color: COLORS.primary },
  date: { fontSize: 12, color: COLORS.secondary },
  message: { fontSize: 14, color: COLORS.text },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 15,
  },

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
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
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
