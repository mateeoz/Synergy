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

  const [tipo, setTipo] = useState("Ingreso"); // Ingreso (Venta) o Egreso (Compra)
  const [inventario, setInventario] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  // Campos avanzados de venta
  const [cliente, setCliente] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [factura, setFactura] = useState("Factura A");
  const [estadoPago, setEstadoPago] = useState("Pagado");
  const [conceptoManual, setConceptoManual] = useState(""); // Por si es un egreso general sin producto

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
    if (tipo === "Ingreso" && !productoSeleccionado) {
      return Alert.alert(
        "Error",
        "Selecciona un producto del inventario para la venta.",
      );
    }
    if (tipo === "Egreso" && !conceptoManual) {
      return Alert.alert("Error", "Indica el concepto del egreso/gasto.");
    }

    try {
      const fecha = new Date().toLocaleDateString();
      let montoTotal = 0;
      let ivaCalculado = 0;
      let gananciaNeta = 0;
      let conceptoFinal = "";
      let prodId = null;
      let cant = parseInt(cantidad) || 1;

      if (tipo === "Ingreso") {
        const prod = inventario.find(
          (p) => p.id === parseInt(productoSeleccionado),
        );
        if (!prod) return Alert.alert("Error", "Producto no encontrado.");

        if (prod.stock < cant) {
          return Alert.alert(
            "Stock insuficiente",
            `Solo quedan ${prod.stock} unidades de ${prod.nombre}.`,
          );
        }

        montoTotal = prod.precio_venta * cant;
        ivaCalculado = montoTotal * 0.21; // 21% IVA estimado
        gananciaNeta = (prod.precio_venta - prod.precio_costo) * cant;
        conceptoFinal = `Venta de ${cant}x ${prod.nombre}`;
        prodId = prod.id;

        // Descontar stock
        const nuevoStock = prod.stock - cant;
        db.runSync("UPDATE inventario SET stock = ? WHERE id = ?", [
          nuevoStock,
          prod.id,
        ]);

        // Alerta de stock crítico si baja a 5 o menos
        if (nuevoStock <= 5) {
          const mensajeAlerta = `El producto "${prod.nombre}" tiene stock bajo (${nuevoStock} unidades).`;
          db.runSync(
            "INSERT INTO notificaciones (id_usuario_destino, titulo, mensaje, fecha, leido) VALUES (?, ?, ?, ?, ?)",
            [user.id, "⚠️ Stock Crítico", mensajeAlerta, fecha, 0],
          );
        }
      } else {
        // Egreso manual
        montoTotal = parseFloat(conceptoManual.split(" ").pop()) || 0; // O un campo de monto separado si prefieres, lo simplificaremos pidiendo monto
      }

      // Si es egreso, podemos pedir monto en un prompt o usar un campo específico. Hagámoslo limpio:
      db.runSync(
        "INSERT INTO transacciones (tipo, id_usuario, cliente, producto_id, cantidad, monto, iva, ganancia, metodo_pago, factura, estado, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          tipo,
          user.id,
          cliente || "Consumidor Final",
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
      setProductoSeleccionado(null);
      setCliente("");
      setCantidad("1");
      setConceptoManual("");
      cargarDatos();
    } catch (error) {
      console.error(error);
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
              style={styles.input}
              placeholder="Cliente / Empresa"
              value={cliente}
              onChangeText={setCliente}
            />
            <TextInput
              style={styles.input}
              placeholder="Cantidad"
              keyboardType="numeric"
              value={cantidad}
              onChangeText={setCantidad}
            />

            <Text style={styles.label}>Método de Pago:</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={metodoPago} onValueChange={setMetodoPago}>
                <Picker.Item label="Efectivo" value="Efectivo" />
                <Picker.Item
                  label="Tarjeta de Crédito/Débito"
                  value="Tarjeta"
                />
                <Picker.Item
                  label="Transferencia Bancaria"
                  value="Transferencia"
                />
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
              style={styles.input}
              placeholder="Concepto del Egreso (Ej: Compra de insumos)"
              value={cliente}
              onChangeText={setCliente}
            />
            <TextInput
              style={styles.input}
              placeholder="Monto Total ($)"
              keyboardType="numeric"
              value={cantidad}
              onChangeText={setCantidad}
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
                {item.cliente} ({item.factura})
              </Text>
              <Text style={styles.cardDate}>
                {item.fecha} • {item.metodo_pago} • [{item.estado}]
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
                {item.tipo === "Ingreso" ? "+" : "-"}${item.monto}
              </Text>
              {item.tipo === "Ingreso" && (
                <Text style={styles.gananciaSub}>
                  Ganancia: ${item.ganancia}
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
  input: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
