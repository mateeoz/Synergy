// src/screens/cleaning/ChecklistLimpieza.js
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import SignatureScreen from "react-native-signature-canvas";
import { useAuthStore } from "../../store/useAuthStore";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

const TAREAS_BASE = [
  { id: "1", nombre: "Baños", completado: false },
  { id: "2", nombre: "Cocina", completado: false },
  { id: "3", nombre: "Sala de reuniones", completado: false },
  { id: "4", nombre: "Escritorios", completado: false },
  { id: "5", nombre: "Pisos", completado: false },
  { id: "6", nombre: "Vidrios", completado: false },
  { id: "7", nombre: "Basura", completado: false },
  { id: "8", nombre: "Desinfección", completado: false },
];

export default function ChecklistLimpieza() {
  const user = useAuthStore((state) => state.user);
  const [tareas, setTareas] = useState(TAREAS_BASE);
  const [mostrarFirma, setMostrarFirma] = useState(false);
  const signatureRef = useRef();

  const toggleTarea = (id) => {
    setTareas(
      tareas.map((t) =>
        t.id === id ? { ...t, completado: !t.completado } : t,
      ),
    );
  };

  // Esta función se dispara automáticamente cuando presionamos nuestro botón "Guardar Reporte"
  const handleGuardarReporte = (firmaBase64) => {
    const tareasCompletadas = tareas
      .filter((t) => t.completado)
      .map((t) => t.nombre)
      .join(", ");

    if (!tareasCompletadas) {
      Alert.alert("Error", "Debes marcar al menos una tarea antes de firmar.");
      setMostrarFirma(false);
      return;
    }

    try {
      const fecha = new Date().toLocaleDateString();
      const hora = new Date().toLocaleTimeString();

      db.runSync(
        "INSERT INTO tareas_limpieza (id_usuario, sector, fecha, hora_fin, firma_uri, estado) VALUES (?, ?, ?, ?, ?, ?)",
        [user.id, tareasCompletadas, fecha, hora, firmaBase64, "Completado"],
      );

      Alert.alert("Éxito", "Reporte de limpieza guardado correctamente.");
      setTareas(TAREAS_BASE);
      setMostrarFirma(false);
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el reporte.");
    }
  };

  return (
    <View style={styles.container}>
      {mostrarFirma ? (
        <View style={styles.firmaContainer}>
          <Text style={styles.headerTitle}>Firma del responsable</Text>

          <View style={styles.canvasContainer}>
            <SignatureScreen
              ref={signatureRef}
              onOK={handleGuardarReporte}
              onEmpty={() =>
                Alert.alert(
                  "Aviso",
                  "Por favor, dibuja tu firma antes de guardar.",
                )
              }
              // Ocultamos los botones web nativos de la librería con CSS
              webStyle={`.m-signature-pad--footer {display: none; margin: 0px;} 
                         .m-signature-pad {box-shadow: none; border: none; margin: 0px;}`}
            />
          </View>

          {/* Botones Nativos de React Native */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.btnAction, styles.btnClear]}
              onPress={() => signatureRef.current.clearSignature()}
            >
              <Text style={styles.btnText}>Borrar Firma</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnAction, styles.btnSave]}
              onPress={() => signatureRef.current.readSignature()}
            >
              <Text style={styles.btnText}>Guardar Reporte</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.btnCancel}
            onPress={() => setMostrarFirma(false)}
          >
            <Text style={styles.btnTextCancel}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.headerTitle}>Checklist Diario</Text>
          <Text style={styles.subtitle}>Marca las áreas que ya limpiaste:</Text>

          {tareas.map((tarea) => (
            <TouchableOpacity
              key={tarea.id}
              style={[
                styles.checkboxContainer,
                tarea.completado && styles.checkboxActive,
              ]}
              onPress={() => toggleTarea(tarea.id)}
            >
              <Text
                style={[
                  styles.checkboxText,
                  tarea.completado && styles.checkboxTextActive,
                ]}
              >
                {tarea.completado ? "☑" : "☐"} {tarea.nombre}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.btnSubmit}
            onPress={() => setMostrarFirma(true)}
          >
            <Text style={styles.btnText}>Firmar y Enviar Reporte</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 10,
  },
  subtitle: { fontSize: 16, color: COLORS.secondary, marginBottom: 20 },
  checkboxContainer: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  checkboxActive: { backgroundColor: "#E0F2FE", borderColor: COLORS.primary },
  checkboxText: { fontSize: 18, color: COLORS.textMuted },
  checkboxTextActive: { color: COLORS.primary, fontWeight: "bold" },
  btnSubmit: {
    backgroundColor: COLORS.success,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: COLORS.surface, fontWeight: "bold", fontSize: 16 },

  // Estilos Firma
  firmaContainer: { flex: 1, padding: 20 },
  canvasContainer: {
    height: 300,
    backgroundColor: "#FFF",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  btnAction: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  btnClear: { backgroundColor: COLORS.secondary },
  btnSave: { backgroundColor: COLORS.success },
  btnCancel: { padding: 15, alignItems: "center" },
  btnTextCancel: { color: COLORS.danger, fontWeight: "bold", fontSize: 16 },
});
