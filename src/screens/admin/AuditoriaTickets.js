// src/screens/admin/AuditoriaTickets.js
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import db from "../../database/initDB";
import { COLORS } from "../../theme/colors";

export default function AuditoriaTickets() {
  const [tickets, setTickets] = useState([]);

  useFocusEffect(
    useCallback(() => {
      // Hacemos un JOIN para saber quién lo reportó
      const query = `
        SELECT t.*, u.nombre as creador 
        FROM tickets t 
        JOIN usuarios u ON t.id_usuario_creador = u.id 
        ORDER BY t.id DESC
      `;
      setTickets(db.getAllSync(query));
    }, []),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Auditoría de Soporte Técnico</Text>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          let badgeColor = COLORS.danger;
          if (item.estado === "En proceso") badgeColor = COLORS.primary;
          if (item.estado === "Esperando repuestos") badgeColor = "#F59E0B";
          if (item.estado === "Solucionado") badgeColor = COLORS.success;

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.titulo}</Text>
                <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                  <Text style={styles.badgeText}>{item.estado}</Text>
                </View>
              </View>

              <Text style={styles.creatorText}>
                Reportado por: {item.creador}
              </Text>
              <Text style={styles.descText}>"{item.descripcion}"</Text>

              <View style={styles.techData}>
                <Text style={styles.techLabel}>
                  Diagnóstico / Progreso del Técnico:
                </Text>
                <Text style={styles.techNotes}>
                  {item.comentarios || "Sin actualizaciones"}
                </Text>
              </View>

              {item.foto_uri && (
                <View style={styles.imgContainer}>
                  <Text style={styles.techLabel}>Evidencia adjunta:</Text>
                  <Image source={{ uri: item.foto_uri }} style={styles.image} />
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay tickets registrados.</Text>
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
    alignItems: "center",
    marginBottom: 5,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  badgeText: { color: COLORS.surface, fontSize: 12, fontWeight: "bold" },
  creatorText: { fontSize: 12, color: COLORS.secondary, marginBottom: 10 },
  descText: {
    fontSize: 14,
    fontStyle: "italic",
    color: COLORS.textMuted,
    marginBottom: 15,
  },
  techData: {
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  techLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.textMuted,
    marginBottom: 5,
  },
  techNotes: { fontSize: 14, color: COLORS.text },
  imgContainer: { marginTop: 10 },
  image: { width: "100%", height: 120, borderRadius: 8, resizeMode: "cover" },
  emptyText: { textAlign: "center", color: COLORS.textMuted, marginTop: 20 },
});
