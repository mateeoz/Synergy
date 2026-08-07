// src/screens/admin/AuditoriaLimpieza.js
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function AuditoriaLimpieza() {
  const [reportes, setReportes] = useState([]);

  useFocusEffect(
    useCallback(() => {
      // Traemos también el username para mayor precisión
      const query = `
        SELECT t.*, u.nombre, u.username 
        FROM tareas_limpieza t 
        JOIN usuarios u ON t.id_usuario = u.id 
        ORDER BY t.id DESC
      `;
      try {
        setReportes(db.getAllSync(query));
      } catch (error) {
        console.error(error);
      }
    }, []),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Auditoría de Limpieza</Text>

      <FlatList
        data={reportes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>👤 Responsable:</Text>
                <Text style={styles.nameText}>
                  {item.nombre} (@{item.username})
                </Text>
              </View>
              <Text style={styles.date}>
                {item.fecha} - {item.hora_fin}
              </Text>
            </View>
            <Text style={styles.sectorsLabel}>Sectores limpiados:</Text>
            <Text style={styles.sectorsText}>{item.sector}</Text>

            <View style={styles.signatureContainer}>
              <Text style={styles.signatureLabel}>Firma Digital:</Text>
              {item.firma_uri ? (
                <Image
                  source={{ uri: item.firma_uri }}
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.noSignature}>Sin firma</Text>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No hay reportes de limpieza registrados.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 14, color: COLORS.textMuted, fontWeight: "bold" },
  nameText: { fontSize: 16, color: COLORS.primary, fontWeight: "bold" },
  date: { fontSize: 12, color: COLORS.secondary, marginTop: 4 },
  sectorsLabel: { fontSize: 14, color: COLORS.textMuted, fontWeight: "bold" },
  sectorsText: { fontSize: 16, color: COLORS.primary, marginBottom: 15 },
  signatureContainer: {
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  signatureLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 5,
    alignSelf: "flex-start",
  },
  signatureImage: { width: "100%", height: 100 },
  noSignature: { fontStyle: "italic", color: COLORS.danger },
  emptyText: { textAlign: "center", color: COLORS.textMuted, marginTop: 20 },
});
