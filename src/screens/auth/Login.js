// src/screens/auth/Login.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useAuthStore } from "../../store/useAuthStore";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function Login({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useAuthStore((state) => state.login); // Traemos la función de Zustand

  const handleLogin = () => {
    if (!username || !password) {
      Alert.alert("Error", "Ingresa usuario y contraseña");
      return;
    }

    try {
      // Buscamos al usuario en la base de datos
      const user = db.getFirstSync(
        "SELECT * FROM usuarios WHERE username = ? AND password = ?",
        [username.toLowerCase(), password],
      );

      if (user) {
        // ¡Login exitoso! Guardamos el usuario en el estado global
        login(user);
      } else {
        Alert.alert("Error", "Credenciales incorrectas");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Hubo un problema al iniciar sesión");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Synergy</Text>
      <Text style={styles.subtitle}>Gestión Empresarial</Text>

      <TextInput
        style={styles.input}
        placeholder="Usuario"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Ingresar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate("Registro")}
      >
        <Text style={styles.linkText}>
          ¿No tienes cuenta? Regístrate para la demo
        </Text>
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
    fontSize: 40,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.secondary,
    textAlign: "center",
    marginBottom: 40,
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
    marginTop: 10,
    marginBottom: 15,
  },
  buttonText: { color: COLORS.surface, fontWeight: "bold", fontSize: 16 },
  linkButton: { alignItems: "center" },
  linkText: { color: COLORS.secondary, fontSize: 14 },
});
