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

  const guardarProducto = () => {
    if (!nombre || !stock || !costo || !venta) {
      return Alert.alert("Error", "Por favor completa todos los campos.");
    }

    try {
      db.runSync(
        "INSERT INTO inventario (nombre, stock, precio_costo, precio_venta) VALUES (?, ?, ?, ?)",
        [nombre, parseInt(stock), parseFloat(costo), parseFloat(venta)],
      );

      // Verificación de stock bajo (Menor o igual a 5)
      if (parseInt(stock) <= 5) {
        const mensaje = `El producto "${nombre}" tiene stock crítico (${stock} unidades). Requiere renovación.`;
        const fecha = new Date().toLocaleDateString();
        db.runSync(
          "INSERT INTO notificaciones (id_usuario_destino, titulo, mensaje, fecha, leido) VALUES (?, ?, ?, ?, ?)",
          [user.id, "⚠️ Stock Crítico", mensaje, fecha, 0],
        );
      }

      Alert.alert("Éxito", "Producto agregado al inventario.");
      setModalVisible(false);
      setNombre("");
      setStock("");
      setCosto("");
      setVenta("");
      cargarInventario();
    } catch (error) {
      // AQUÍ ESTÁ EL CAMBIO: Imprimimos el error real en la consola de tu terminal
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
        <Text style={styles.headerTitle}>Inventario de Productos</Text>
        {isJefe && (
          <TouchableOpacity
            style={styles.btnNew}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.btnNewText}>+ Nuevo Producto</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={productos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.card, item.stock <= 5 && styles.cardCritico]}>
            <View>
              <Text style={styles.prodName}>{item.nombre}</Text>
              <Text style={styles.prodPrices}>
                Costo: ${item.precio_costo} | Venta: ${item.precio_venta}
              </Text>
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
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No hay productos en el inventario.
          </Text>
        }
      />

      {/* MODAL NUEVO PRODUCTO */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar al Inventario</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre del producto"
              value={nombre}
              onChangeText={setNombre}
            />
            <TextInput
              style={styles.input}
              placeholder="Stock inicial"
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />
            <TextInput
              style={styles.input}
              placeholder="Precio de costo ($)"
              keyboardType="numeric"
              value={costo}
              onChangeText={setCosto}
            />
            <TextInput
              style={styles.input}
              placeholder="Precio de venta ($)"
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
  input: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
