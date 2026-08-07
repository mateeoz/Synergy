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
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/useAuthStore";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function Inventario() {
  const user = useAuthStore((state) => state.user);
  const isJefe = user?.rol === "jefe";

  const [productos, setProductos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

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
      } else {
        db.runSync(
          "INSERT INTO inventario (nombre, stock, precio_costo, precio_venta) VALUES (?, ?, ?, ?)",
          [nombre, parseInt(stock), parseFloat(costo), parseFloat(venta)],
        );
      }

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
          <TouchableOpacity
            style={styles.btnNew}
            onPress={abrirModalNuevo}
            activeOpacity={0.8}
          >
            <Ionicons
              name="add"
              size={18}
              color={COLORS.surface}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.btnNewText}>Nuevo</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={productos}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isCritico = item.stock <= 5;
          return (
            <TouchableOpacity
              style={[styles.card, isCritico && styles.cardCritico]}
              onPress={() => (isJefe ? abrirModalEdicion(item) : null)}
              activeOpacity={isJefe ? 0.7 : 1}
            >
              <View style={styles.cardInfo}>
                <Text style={styles.prodName}>{item.nombre}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.prodCost}>
                    Costo: ${item.precio_costo}
                  </Text>
                  <View style={styles.dotSeparator} />
                  <Text style={styles.prodSale}>
                    Venta: ${item.precio_venta}
                  </Text>
                </View>
                {isJefe && (
                  <View style={styles.editHintRow}>
                    <Ionicons
                      name="pencil"
                      size={12}
                      color={COLORS.secondary}
                    />
                    <Text style={styles.editHint}> Toca para editar</Text>
                  </View>
                )}
              </View>

              <View style={styles.stockBox}>
                <View
                  style={[
                    styles.stockBadge,
                    isCritico && styles.stockBadgeCritico,
                  ]}
                >
                  <Text
                    style={[
                      styles.stockText,
                      isCritico && styles.stockTextCritico,
                    ]}
                  >
                    {item.stock}
                  </Text>
                  <Text
                    style={[
                      styles.stockLabel,
                      isCritico && styles.stockTextCritico,
                    ]}
                  >
                    UNID.
                  </Text>
                </View>
                {isCritico && (
                  <Text style={styles.criticoAlert}>¡Reabastecer!</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No hay productos en el inventario.
          </Text>
        }
      />

      {/* Modal de Creación / Edición Moderno */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editId ? "Editar Producto" : "Agregar Producto"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nombre del producto</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.textMuted}
              placeholder="Ej: Memoria RAM 8GB"
              value={nombre}
              onChangeText={setNombre}
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>Cantidad (Stock)</Text>
                <TextInput
                  style={styles.input}
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="0"
                  keyboardType="numeric"
                  value={stock}
                  onChangeText={setStock}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>Costo de compra</Text>
                <TextInput
                  style={styles.input}
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="$"
                  keyboardType="numeric"
                  value={costo}
                  onChangeText={setCosto}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Precio final de venta</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.textMuted}
              placeholder="$"
              keyboardType="numeric"
              value={venta}
              onChangeText={setVenta}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={guardarProducto}
            >
              <Text style={styles.btnText}>Guardar en Inventario</Text>
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
    marginBottom: 25,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: -0.5,
  },

  btnNew: {
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
  btnNewText: {
    color: COLORS.surface,
    fontWeight: "700",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    padding: 18,
    borderRadius: 16,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardCritico: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  cardInfo: { flex: 1 },
  prodName: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  priceRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  prodCost: { fontSize: 13, color: COLORS.textMuted, fontWeight: "500" },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  prodSale: { fontSize: 13, color: COLORS.success, fontWeight: "700" },
  editHintRow: { flexDirection: "row", alignItems: "center" },
  editHint: { fontSize: 11, color: COLORS.secondary, fontWeight: "500" },

  stockBox: {
    alignItems: "flex-end",
    justifyContent: "center",
    paddingLeft: 15,
  },
  stockBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 60,
  },
  stockBadgeCritico: { backgroundColor: "#FEE2E2" },
  stockText: { fontSize: 18, fontWeight: "800", color: COLORS.primary },
  stockTextCritico: { color: COLORS.danger },
  stockLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginTop: 2,
  },
  criticoAlert: {
    fontSize: 10,
    color: COLORS.danger,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 6,
    letterSpacing: 0.5,
  },

  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    marginTop: 20,
    fontStyle: "italic",
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
  row: { flexDirection: "row", justifyContent: "space-between" },
  col: { width: "48%" },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: COLORS.surface, fontWeight: "600", fontSize: 16 },
});
