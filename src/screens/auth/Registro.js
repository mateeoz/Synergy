// src/screens/auth/Registro.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function Registro({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");

  const handleRegistro = () => {
    if (!username || !password || !nombre) {
      Alert.alert("Error", "Por favor completa todos los campos.");
      return;
    }

    try {
      // El rol 'empleado' se inserta directamente, el usuario no lo elige
      db.runSync(
        "INSERT INTO usuarios (username, password, nombre, rol) VALUES (?, ?, ?, ?)",
        [username.toLowerCase(), password, nombre, "empleado"],
      );

      Alert.alert(
        "Éxito",
        "Cuenta creada correctamente. Por favor, inicia sesión.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "El nombre de usuario ya existe o hubo un problema.",
      );
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear Cuenta</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre completo (Ej: Juan Pérez)"
        value={nombre}
        onChangeText={setNombre}
      />

      <TextInput
        style={styles.input}
        placeholder="Usuario"
        value={username}
        autoCapitalize="none"
        onChangeText={setUsername}
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleRegistro}>
        <Text style={styles.buttonText}>Registrarse</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonText: { color: COLORS.surface, fontWeight: "bold", fontSize: 16 },
  linkButton: { alignItems: "center" },
  linkText: { color: COLORS.secondary, fontSize: 14 },
});
