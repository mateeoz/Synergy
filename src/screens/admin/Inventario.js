// src/screens/admin/Inventario.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../../store/useAuthStore";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function Inventario() {
  const user = useAuthStore((state) => state.user);
  const isJefe = user?.rol === "jefe";

  const [productos, setProductos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Nuevo estado para saber si estamos editando o creando
  const [editId, setEditId] = useState(null);
  const [nombre, setNombre] = useState("");
  const [stock, setStock] = useState("");
  const [costo, setCosto] = useState("");
  const [venta, setVenta] = useState("");

  useFocusEffect(
    useCallback(() => {
      cargarInventario();
    }, []),
  );

  const cargarInventario = () => {
    const res = db.getAllSync("SELECT * FROM inventario ORDER BY id DESC");
    setProductos(res);
  };

  const abrirModalNuevo = () => {
    setEditId(null);
    setNombre("");
    setStock("");
    setCosto("");
    setVenta("");
    setModalVisible(true);
  };

  const abrirModalEdicion = (item) => {
    setEditId(item.id);
    setNombre(item.nombre);
    setStock(item.stock.toString());
    setCosto(item.precio_costo.toString());
    setVenta(item.precio_venta.toString());
    setModalVisible(true);
  };

  const guardarProducto = () => {
    if (!nombre || stock === "" || costo === "" || venta === "") {
      return Alert.alert("Error", "Por favor completa todos los campos.");
    }

    try {
      if (editId) {
        // ACTUALIZAR PRODUCTO EXISTENTE
        db.runSync(
          "UPDATE inventario SET nombre = ?, stock = ?, precio_costo = ?, precio_venta = ? WHERE id = ?",
          [
            nombre,
            parseInt(stock),
            parseFloat(costo),
            parseFloat(venta),
            editId,
          ],
        );
        Alert.alert("Éxito", "Producto actualizado correctamente.");
      } else {
        // CREAR NUEVO PRODUCTO
        db.runSync(
          "INSERT INTO inventario (nombre, stock, precio_costo, precio_venta) VALUES (?, ?, ?, ?)",
          [nombre, parseInt(stock), parseFloat(costo), parseFloat(venta)],
        );
        Alert.alert("Éxito", "Producto agregado al inventario.");
      }

      // Verificación de stock bajo (Menor o igual a 5) para notificar al Jefe
      if (parseInt(stock) <= 5) {
        const mensaje = `El producto "${nombre}" tiene stock crítico (${stock} unidades). Requiere renovación.`;
        const fecha = new Date().toLocaleDateString();
        db.runSync(
          "INSERT INTO notificaciones (id_usuario_destino, titulo, mensaje, fecha, leido) VALUES (?, ?, ?, ?, ?)",
          [user.id, "⚠️ Stock Crítico", mensaje, fecha, 0],
        );
      }

      setModalVisible(false);
      cargarInventario();
    } catch (error) {
      console.error("DETALLE DEL ERROR EN SQLITE:", error);
      Alert.alert(
        "Error de Base de Datos",
        error.message || "No se pudo guardar el producto.",
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Inventario</Text>
        {isJefe && (
          <TouchableOpacity style={styles.btnNew} onPress={abrirModalNuevo}>
            <Text style={styles.btnNewText}>+ Nuevo</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={productos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, item.stock <= 5 && styles.cardCritico]}
            onPress={() => (isJefe ? abrirModalEdicion(item) : null)}
            activeOpacity={isJefe ? 0.7 : 1}
          >
            <View>
              <Text style={styles.prodName}>{item.nombre}</Text>
              <Text style={styles.prodPrices}>
                Costo: ${item.precio_costo} | Venta: ${item.precio_venta}
              </Text>
              {isJefe && (
                <Text style={styles.editHint}>✏️ Toca para editar</Text>
              )}
            </View>
            <View style={styles.stockBox}>
              <Text
                style={[styles.stockText, item.stock <= 5 && styles.textDanger]}
              >
                Stock: {item.stock}
              </Text>
              {item.stock <= 5 && (
                <Text style={styles.criticoText}>¡Bajo!</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No hay productos en el inventario.
          </Text>
        }
      />

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editId ? "Editar Producto" : "Agregar al Inventario"}
            </Text>

            <Text style={styles.label}>Nombre del producto:</Text>
            <TextInput
              style={styles.inputDark}
              placeholderTextColor="#9CA3AF"
              placeholder="Ej: Memoria RAM 8GB"
              value={nombre}
              onChangeText={setNombre}
            />

            <Text style={styles.label}>Cantidad en stock:</Text>
            <TextInput
              style={styles.inputDark}
              placeholderTextColor="#9CA3AF"
              placeholder="Stock actual"
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />

            <Text style={styles.label}>Precio de costo ($):</Text>
            <TextInput
              style={styles.inputDark}
              placeholderTextColor="#9CA3AF"
              placeholder="Lo que te costó"
              keyboardType="numeric"
              value={costo}
              onChangeText={setCosto}
            />

            <Text style={styles.label}>Precio de venta ($):</Text>
            <TextInput
              style={styles.inputDark}
              placeholderTextColor="#9CA3AF"
              placeholder="A cuánto lo vendes"
              keyboardType="numeric"
              value={venta}
              onChangeText={setVenta}
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
                onPress={guardarProducto}
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
  btnNew: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnNewText: { color: COLORS.surface, fontWeight: "bold" },
  card: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 1,
  },
  cardCritico: {
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: "#FEF2F2",
  },
  prodName: { fontSize: 16, fontWeight: "bold", color: COLORS.text },
  prodPrices: { fontSize: 13, color: COLORS.secondary, marginTop: 4 },
  editHint: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 6,
    fontStyle: "italic",
  },
  stockBox: { alignItems: "flex-end" },
  stockText: { fontSize: 16, fontWeight: "bold", color: COLORS.primary },
  textDanger: { color: COLORS.danger },
  criticoText: { fontSize: 10, color: COLORS.danger, fontWeight: "bold" },
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
  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.textMuted,
    marginBottom: 5,
  },
  inputDark: {
    backgroundColor: "#1F2937",
    color: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
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
