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
import { Ionicons } from "@expo/vector-icons";
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
    const query = isJefe
      ? "SELECT * FROM documentos ORDER BY id DESC"
      : "SELECT * FROM documentos WHERE visibilidad = 'Publico' OR visibilidad IS NULL ORDER BY id DESC";

    setDocumentos(db.getAllSync(query));
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
    Alert.alert(
      "Gestión de Carpeta",
      `¿Qué deseas hacer con "${cat.nombre}"?`,
      [
        {
          text: "Editar Nombre",
          onPress: () => {
            setCarpetaEditando(cat);
            setNombreCarpeta(cat.nombre);
            setModalCarpeta(true);
          },
        },
        {
          text: "Eliminar Carpeta",
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
      ],
    );
  };

  const subirDocumento = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const doc = result.assets[0];
        const catFrescas = db.getAllSync("SELECT * FROM categorias_documentos");

        Alert.alert(
          "Nivel de Acceso",
          "¿Quién podrá visualizar este documento?",
          [
            {
              text: "Solo yo (Privado)",
              onPress: () => elegirCarpeta(doc, catFrescas, "Privado"),
            },
            {
              text: "Toda la empresa (Público)",
              onPress: () => elegirCarpeta(doc, catFrescas, "Publico"),
            },
            { text: "Cancelar", style: "cancel" },
          ],
        );
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo adjuntar el archivo.");
    }
  };

  const elegirCarpeta = (doc, categorias, visibilidad) => {
    const opciones = categorias.map((c) => ({
      text: c.nombre,
      onPress: () => {
        const fecha = new Date().toLocaleDateString();
        db.runSync(
          "INSERT INTO documentos (titulo, categoria, uri, fecha, visibilidad) VALUES (?, ?, ?, ?, ?)",
          [doc.name, c.nombre, doc.uri, fecha, visibilidad],
        );
        Alert.alert("Éxito", "Documento almacenado correctamente.");
        cargarDatos();
      },
    }));
    opciones.push({ text: "Cancelar", style: "cancel" });
    Alert.alert("Directorio", "Selecciona la carpeta de destino:", opciones);
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
      `Selecciona el nuevo destino para "${doc.titulo}":`,
      opciones,
    );
  };

  const abrirDocumento = async (uri) => {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) await Sharing.shareAsync(uri);
    else
      Alert.alert(
        "Error",
        "El dispositivo no soporta la visualización de este formato.",
      );
  };

  const docsFiltrados =
    filtro === "Todos"
      ? documentos
      : documentos.filter((d) => d.categoria === filtro);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Documentos</Text>
        {isJefe && (
          <TouchableOpacity
            style={styles.btnUpload}
            onPress={subirDocumento}
            activeOpacity={0.8}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={18}
              color={COLORS.surface}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.btnUploadText}>Subir Archivo</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
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
              <Ionicons
                name="add"
                size={14}
                color={COLORS.secondary}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.filterTextAdd}>Carpeta</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <FlatList
        data={docsFiltrados}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isPrivado = item.visibilidad === "Privado";
          return (
            <TouchableOpacity
              style={styles.docCard}
              onPress={() => abrirDocumento(item.uri)}
              onLongPress={() => moverDocumento(item)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: isPrivado ? "#FEF2F2" : "#F1F5F9" },
                ]}
              >
                <Ionicons
                  name={isPrivado ? "lock-closed" : "document-text"}
                  size={24}
                  color={isPrivado ? COLORS.danger : COLORS.primary}
                />
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.docTitle} numberOfLines={1}>
                  {item.titulo}
                </Text>
                <Text style={styles.docSub}>
                  {item.categoria} • {item.fecha}
                </Text>
              </View>
              <Ionicons
                name="share-outline"
                size={20}
                color={COLORS.secondary}
              />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No hay documentos en esta carpeta.
          </Text>
        }
      />

      {/* Modal Modernizado */}
      <Modal visible={modalCarpeta} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {carpetaEditando ? "Editar Carpeta" : "Nueva Carpeta"}
              </Text>
              <TouchableOpacity onPress={() => setModalCarpeta(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Nombre del directorio</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.textMuted}
              placeholder="Ej: Contratos 2026"
              value={nombreCarpeta}
              onChangeText={setNombreCarpeta}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={guardarCarpeta}>
              <Text style={styles.btnText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  btnUpload: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  btnUploadText: {
    color: COLORS.surface,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.5,
  },

  filterContainer: { marginBottom: 20 },
  filterScroll: { paddingVertical: 5 },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillAdd: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "transparent",
    marginRight: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.secondary,
  },
  filterText: { color: COLORS.textMuted, fontWeight: "600" },
  filterTextActive: { color: COLORS.surface, fontWeight: "700" },
  filterTextAdd: { color: COLORS.secondary, fontWeight: "600" },

  docCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  docInfo: { flex: 1, paddingRight: 10 },
  docTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  docSub: { fontSize: 12, color: COLORS.secondary, fontWeight: "500" },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    marginTop: 30,
    fontStyle: "italic",
  },

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
    marginBottom: 20,
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: COLORS.surface, fontWeight: "600", fontSize: 16 },
});
