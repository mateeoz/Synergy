// src/screens/shared/MiTrabajo.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../../store/useAuthStore";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function MiTrabajo() {
  const user = useAuthStore((state) => state.user);

  const [tipo, setTipo] = useState("Ingreso");
  const [inventario, setInventario] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  // Variables para Ingreso (Venta)
  const [cliente, setCliente] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [factura, setFactura] = useState("Factura A");
  const [estadoPago, setEstadoPago] = useState("Pagado");

  // Variables exclusivas para Egreso (Gasto)
  const [conceptoManual, setConceptoManual] = useState("");
  const [montoEgreso, setMontoEgreso] = useState("");

  const [misTransacciones, setMisTransacciones] = useState([]);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, []),
  );

  const cargarDatos = () => {
    setInventario(db.getAllSync("SELECT * FROM inventario"));
    setMisTransacciones(
      db.getAllSync(
        "SELECT * FROM transacciones WHERE id_usuario = ? ORDER BY id DESC LIMIT 10",
        [user.id],
      ),
    );
  };

  const registrarTransaccion = () => {
    // Validaciones estrictas por separado
    if (tipo === "Ingreso" && !productoSeleccionado) {
      return Alert.alert("Error", "Selecciona un producto del inventario.");
    }

    if (tipo === "Egreso") {
      if (!conceptoManual.trim())
        return Alert.alert("Error", "Indica el concepto del egreso/gasto.");
      if (!montoEgreso.trim())
        return Alert.alert("Error", "Indica el monto del egreso.");
    }

    try {
      const fecha = new Date().toLocaleDateString();
      let montoTotal = 0;
      let ivaCalculado = 0;
      let gananciaNeta = 0;
      let prodId = null;
      let cant = 1;
      let textoCliente = "";

      if (tipo === "Ingreso") {
        cant = parseInt(cantidad) || 1;
        const prod = inventario.find(
          (p) => p.id === parseInt(productoSeleccionado),
        );

        if (!prod) return Alert.alert("Error", "Producto no encontrado.");
        if (prod.stock < cant)
          return Alert.alert(
            "Stock insuficiente",
            `Solo quedan ${prod.stock} unidades.`,
          );

        montoTotal = prod.precio_venta * cant;
        ivaCalculado = montoTotal * 0.21;
        gananciaNeta = (prod.precio_venta - prod.precio_costo) * cant;
        prodId = prod.id;
        textoCliente = cliente || "Consumidor Final";

        // Descontar Stock
        const nuevoStock = prod.stock - cant;
        db.runSync("UPDATE inventario SET stock = ? WHERE id = ?", [
          nuevoStock,
          prod.id,
        ]);

        // Alerta de stock crítico
        if (nuevoStock <= 5) {
          db.runSync(
            "INSERT INTO notificaciones (id_usuario_destino, titulo, mensaje, fecha, leido) VALUES (?, ?, ?, ?, ?)",
            [
              user.id,
              "⚠️ Stock Crítico",
              `El producto "${prod.nombre}" tiene stock bajo (${nuevoStock} unidades).`,
              fecha,
              0,
            ],
          );
        }
      } else {
        // Lógica para el Egreso
        montoTotal = parseFloat(montoEgreso) || 0;
        textoCliente = conceptoManual; // Guardamos el concepto en la columna "cliente" para que aparezca en el historial
        cant = 1;
      }

      // Guardar en la base de datos
      db.runSync(
        "INSERT INTO transacciones (tipo, id_usuario, cliente, producto_id, cantidad, monto, iva, ganancia, metodo_pago, factura, estado, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          tipo,
          user.id,
          textoCliente,
          prodId,
          cant,
          montoTotal,
          ivaCalculado,
          gananciaNeta,
          metodoPago,
          factura,
          estadoPago,
          fecha,
        ],
      );

      Alert.alert("Éxito", "Movimiento registrado correctamente.");

      // Limpiar el formulario
      setProductoSeleccionado(null);
      setCliente("");
      setCantidad("1");
      setConceptoManual("");
      setMontoEgreso("");

      cargarDatos();
    } catch (error) {
      Alert.alert("Error", "No se pudo registrar la transacción.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>Registro de Caja y Ventas</Text>

      <View style={styles.formContainer}>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={tipo} onValueChange={setTipo}>
            <Picker.Item label="Ingreso (Venta de Producto)" value="Ingreso" />
            <Picker.Item label="Egreso (Gasto / Compra)" value="Egreso" />
          </Picker>
        </View>

        {tipo === "Ingreso" ? (
          <>
            <Text style={styles.label}>Seleccionar Producto:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={productoSeleccionado}
                onValueChange={setProductoSeleccionado}
              >
                <Picker.Item label="-- Elige un producto --" value={null} />
                {inventario.map((p) => (
                  <Picker.Item
                    key={p.id}
                    label={`${p.nombre} ($${p.precio_venta} - Stock: ${p.stock})`}
                    value={p.id}
                  />
                ))}
              </Picker>
            </View>
            <TextInput
              style={styles.inputDark}
              placeholderTextColor="#9CA3AF"
              placeholder="Cliente / Empresa"
              value={cliente}
              onChangeText={setCliente}
            />
            <TextInput
              style={styles.inputDark}
              placeholderTextColor="#9CA3AF"
              placeholder="Cantidad"
              keyboardType="numeric"
              value={cantidad}
              onChangeText={setCantidad}
            />

            <Text style={styles.label}>Método de Pago:</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={metodoPago} onValueChange={setMetodoPago}>
                <Picker.Item label="Efectivo" value="Efectivo" />
                <Picker.Item label="Tarjeta" value="Tarjeta" />
                <Picker.Item label="Transferencia" value="Transferencia" />
              </Picker>
            </View>

            <Text style={styles.label}>Tipo de Factura:</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={factura} onValueChange={setFactura}>
                <Picker.Item label="Factura A" value="Factura A" />
                <Picker.Item label="Factura B" value="Factura B" />
                <Picker.Item label="Ticket / Consumidor Final" value="Ticket" />
              </Picker>
            </View>

            <Text style={styles.label}>Estado del Cobro:</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={estadoPago} onValueChange={setEstadoPago}>
                <Picker.Item label="Pagado" value="Pagado" />
                <Picker.Item label="Pendiente" value="Pendiente" />
              </Picker>
            </View>
          </>
        ) : (
          <>
            <TextInput
              style={styles.inputDark}
              placeholderTextColor="#9CA3AF"
              placeholder="Concepto (Ej: Compra de insumos)"
              value={conceptoManual}
              onChangeText={setConceptoManual}
            />
            <TextInput
              style={styles.inputDark}
              placeholderTextColor="#9CA3AF"
              placeholder="Monto Total ($)"
              keyboardType="numeric"
              value={montoEgreso}
              onChangeText={setMontoEgreso}
            />
          </>
        )}

        <TouchableOpacity
          style={styles.btnSubmit}
          onPress={registrarTransaccion}
        >
          <Text style={styles.btnText}>Procesar Movimiento</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Tus últimos movimientos</Text>
      <FlatList
        data={misTransacciones}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.cardTitle}>
                {item.cliente} {item.tipo === "Ingreso" && `(${item.factura})`}
              </Text>
              <Text style={styles.cardDate}>
                {item.fecha} • {item.metodo_pago}{" "}
                {item.tipo === "Ingreso" && `• [${item.estado}]`}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={[
                  styles.amount,
                  item.tipo === "Ingreso"
                    ? styles.textSuccess
                    : styles.textDanger,
                ]}
              >
                {item.tipo === "Ingreso" ? "+" : "-"}${item.monto.toFixed(2)}
              </Text>
              {item.tipo === "Ingreso" && (
                <Text style={styles.gananciaSub}>
                  Ganancia: ${item.ganancia.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay movimientos registrados.</Text>
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.background, padding: 20 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 20,
  },
  formContainer: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  pickerContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  inputDark: {
    backgroundColor: "#1F2937",
    color: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.textMuted,
    marginBottom: 5,
  },
  btnSubmit: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: COLORS.surface, fontWeight: "bold", fontSize: 16 },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.text },
  cardDate: { fontSize: 11, color: COLORS.secondary, marginTop: 3 },
  amount: { fontSize: 16, fontWeight: "bold" },
  gananciaSub: { fontSize: 10, color: COLORS.success, fontWeight: "bold" },
  textSuccess: { color: COLORS.success },
  textDanger: { color: COLORS.danger },
  emptyText: { textAlign: "center", color: COLORS.textMuted, marginTop: 10 },
});
