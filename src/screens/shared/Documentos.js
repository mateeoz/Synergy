// src/screens/shared/Documentos.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../../store/useAuthStore";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function Documentos() {
  const user = useAuthStore((state) => state.user);
  const isJefe = user?.rol === "jefe";

  const [documentos, setDocumentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtro, setFiltro] = useState("Todos");

  const [modalCarpeta, setModalCarpeta] = useState(false);
  const [nombreCarpeta, setNombreCarpeta] = useState("");
  const [carpetaEditando, setCarpetaEditando] = useState(null);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, []),
  );

  const cargarDatos = () => {
    // Si es jefe, ve todo. Si es empleado, solo ve los públicos.
    const queryDocs = isJefe
      ? "SELECT * FROM documentos ORDER BY id DESC"
      : "SELECT * FROM documentos WHERE visibilidad = 'Publico' OR visibilidad IS NULL ORDER BY id DESC";

    setDocumentos(db.getAllSync(queryDocs));
    setCategorias(db.getAllSync("SELECT * FROM categorias_documentos"));
  };

  const guardarCarpeta = () => {
    if (!nombreCarpeta) return;
    try {
      if (carpetaEditando) {
        db.runSync("UPDATE categorias_documentos SET nombre = ? WHERE id = ?", [
          nombreCarpeta,
          carpetaEditando.id,
        ]);
        db.runSync("UPDATE documentos SET categoria = ? WHERE categoria = ?", [
          nombreCarpeta,
          carpetaEditando.nombre,
        ]);
      } else {
        db.runSync("INSERT INTO categorias_documentos (nombre) VALUES (?)", [
          nombreCarpeta,
        ]);
      }
      setModalCarpeta(false);
      setNombreCarpeta("");
      setCarpetaEditando(null);
      cargarDatos();
    } catch (error) {
      Alert.alert("Error", "El nombre de la carpeta ya existe.");
    }
  };

  const opcionesCarpeta = (cat) => {
    if (!isJefe) return;
    Alert.alert("Opciones", `¿Qué deseas hacer con "${cat.nombre}"?`, [
      {
        text: "Editar",
        onPress: () => {
          setCarpetaEditando(cat);
          setNombreCarpeta(cat.nombre);
          setModalCarpeta(true);
        },
      },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          db.runSync("DELETE FROM categorias_documentos WHERE id = ?", [
            cat.id,
          ]);
          db.runSync("DELETE FROM documentos WHERE categoria = ?", [
            cat.nombre,
          ]);
          if (filtro === cat.nombre) setFiltro("Todos");
          cargarDatos();
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const subirDocumento = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const doc = result.assets[0];
        const catFrescas = db.getAllSync("SELECT * FROM categorias_documentos");

        // Primero preguntamos la visibilidad
        Alert.alert(
          "Visibilidad del Documento",
          "¿Quién podrá ver este archivo?",
          [
            {
              text: "Solo yo (Privado)",
              onPress: () => elegirCarpetaYGuardar(doc, catFrescas, "Privado"),
            },
            {
              text: "Todos (Público)",
              onPress: () => elegirCarpetaYGuardar(doc, catFrescas, "Publico"),
            },
            { text: "Cancelar", style: "cancel" },
          ],
        );
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo adjuntar.");
    }
  };

  const elegirCarpetaYGuardar = (doc, categorias, visibilidad) => {
    const opciones = categorias.map((c) => ({
      text: c.nombre,
      onPress: () => {
        const fecha = new Date().toLocaleDateString();
        db.runSync(
          "INSERT INTO documentos (titulo, categoria, uri, fecha, visibilidad) VALUES (?, ?, ?, ?, ?)",
          [doc.name, c.nombre, doc.uri, fecha, visibilidad],
        );
        Alert.alert("Éxito", `Documento guardado como ${visibilidad}`);
        cargarDatos();
      },
    }));
    opciones.push({ text: "Cancelar", style: "cancel" });
    Alert.alert("Ubicación", "Selecciona la carpeta:", opciones);
  };

  const moverDocumento = (doc) => {
    if (!isJefe) return;
    const catFrescas = db.getAllSync("SELECT * FROM categorias_documentos");
    const opciones = catFrescas.map((c) => ({
      text: c.nombre,
      onPress: () => {
        db.runSync("UPDATE documentos SET categoria = ? WHERE id = ?", [
          c.nombre,
          doc.id,
        ]);
        cargarDatos();
      },
    }));
    opciones.push({ text: "Cancelar", style: "cancel" });
    Alert.alert(
      "Mover Archivo",
      `Elige la nueva carpeta para "${doc.titulo}":`,
      opciones,
    );
  };

  const abrirDocumento = async (uri) => {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) await Sharing.shareAsync(uri);
    else
      Alert.alert("Error", "Tu dispositivo no permite compartir este archivo.");
  };

  const docsFiltrados =
    filtro === "Todos"
      ? documentos
      : documentos.filter((d) => d.categoria === filtro);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Archivero</Text>
        {isJefe && (
          <TouchableOpacity style={styles.btnUpload} onPress={subirDocumento}>
            <Text style={styles.btnUploadText}>+ Subir Doc</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              filtro === "Todos" && styles.filterPillActive,
            ]}
            onPress={() => setFiltro("Todos")}
          >
            <Text
              style={[
                styles.filterText,
                filtro === "Todos" && styles.filterTextActive,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>

          {categorias.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.filterPill,
                filtro === cat.nombre && styles.filterPillActive,
              ]}
              onPress={() => setFiltro(cat.nombre)}
              onLongPress={() => opcionesCarpeta(cat)}
            >
              <Text
                style={[
                  styles.filterText,
                  filtro === cat.nombre && styles.filterTextActive,
                ]}
              >
                {cat.nombre}
              </Text>
            </TouchableOpacity>
          ))}

          {isJefe && (
            <TouchableOpacity
              style={styles.filterPillAdd}
              onPress={() => {
                setCarpetaEditando(null);
                setNombreCarpeta("");
                setModalCarpeta(true);
              }}
            >
              <Text style={styles.filterTextAdd}>+ Carpeta</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <FlatList
        data={docsFiltrados}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.docCard}
            onPress={() => abrirDocumento(item.uri)}
            onLongPress={() => moverDocumento(item)}
          >
            <Text style={styles.docIcon}>
              {item.visibilidad === "Privado" ? "🔒" : "📄"}
            </Text>
            <View style={styles.docInfo}>
              <Text style={styles.docTitle}>{item.titulo}</Text>
              <Text style={styles.docSub}>
                {item.categoria} • {item.fecha}
              </Text>
            </View>
            <Text style={styles.openHint}>Abrir</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Carpeta vacía.</Text>
        }
      />

      {/* Modal de Carpeta (Mismo de antes) */}
      <Modal visible={modalCarpeta} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {carpetaEditando ? "Editar Carpeta" : "Nueva Carpeta"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre de la carpeta"
              value={nombreCarpeta}
              onChangeText={setNombreCarpeta}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: COLORS.danger }]}
                onPress={() => setModalCarpeta(false)}
              >
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: COLORS.success }]}
                onPress={guardarCarpeta}
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.primary },
  btnUpload: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnUploadText: { color: COLORS.surface, fontWeight: "bold" },
  filterRow: { marginBottom: 20, flexDirection: "row" },
  filterPill: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillAdd: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "transparent",
    marginRight: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.secondary,
  },
  filterText: { color: COLORS.textMuted },
  filterTextActive: { color: COLORS.surface, fontWeight: "bold" },
  filterTextAdd: { color: COLORS.secondary, fontWeight: "bold" },
  docCard: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
  },
  docIcon: { fontSize: 24, marginRight: 15 },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.text },
  docSub: { fontSize: 12, color: COLORS.secondary, marginTop: 4 },
  openHint: { color: COLORS.primary, fontSize: 12, fontWeight: "bold" },
  emptyText: { textAlign: "center", color: COLORS.textMuted, marginTop: 20 },
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
  btnText: { color: COLORS.surface, fontWeight: "bold" },
});
