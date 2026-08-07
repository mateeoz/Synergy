// src/database/initDB.js
import * as SQLite from "expo-sqlite";

// Abre o crea la base de datos local
const db = SQLite.openDatabaseSync("synergy.db");

export const initDB = () => {
  try {
    // PRAGMA journal_mode = WAL mejora muchísimo el rendimiento de lectura/escritura en SQLite
    db.execSync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        rol TEXT DEFAULT 'empleado',
        nombre TEXT,
        salario REAL DEFAULT 0,
        hora_entrada TEXT,
        horas_cumplir INTEGER DEFAULT 8
      );

      CREATE TABLE IF NOT EXISTS asistencia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER,
        fecha_hora TEXT NOT NULL,
        tipo TEXT NOT NULL,
        FOREIGN KEY(id_usuario) REFERENCES usuarios(id)
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario_creador INTEGER,
        titulo TEXT NOT NULL,
        descripcion TEXT,
        prioridad TEXT DEFAULT 'Normal',
        ubicacion TEXT,
        estado TEXT DEFAULT 'Pendiente',
        foto_uri TEXT,
        comentarios TEXT,
        FOREIGN KEY(id_usuario_creador) REFERENCES usuarios(id)
      );

      CREATE TABLE IF NOT EXISTS inventario (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        stock INTEGER DEFAULT 0,
        precio_costo REAL DEFAULT 0,
        precio_venta REAL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS tareas_limpieza (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER,
        sector TEXT,
        fecha TEXT,
        hora_inicio TEXT,
        hora_fin TEXT,
        firma_uri TEXT,
        estado TEXT DEFAULT 'Pendiente',
        FOREIGN KEY(id_usuario) REFERENCES usuarios(id)
      );

      CREATE TABLE IF NOT EXISTS notificaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario_destino INTEGER,
        titulo TEXT NOT NULL,
        mensaje TEXT,
        fecha TEXT,
        leido INTEGER DEFAULT 0,
        FOREIGN KEY(id_usuario_destino) REFERENCES usuarios(id)
      );

      CREATE TABLE IF NOT EXISTS transacciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL, 
        id_usuario INTEGER,
        cliente TEXT,
        producto_id INTEGER,
        cantidad INTEGER DEFAULT 1,
        monto REAL, 
        iva REAL,
        ganancia REAL,
        metodo_pago TEXT,
        factura TEXT,
        estado TEXT, 
        fecha TEXT
      );

      CREATE TABLE IF NOT EXISTS presupuestos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mes TEXT NOT NULL UNIQUE, 
        monto REAL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS anuncios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        fecha TEXT NOT NULL,
        autor TEXT NOT NULL
      );
    
      INSERT OR IGNORE INTO usuarios (username, password, rol, nombre, salario, horas_cumplir)
      VALUES ('admin', 'admin123', 'jefe', 'Administrador Global', 0, 8);

      CREATE TABLE IF NOT EXISTS eventos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        fecha TEXT NOT NULL, 
        tipo TEXT NOT NULL,
        visibilidad TEXT DEFAULT 'global',
        usuarios_permitidos TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS documentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT,
        categoria TEXT,
        uri TEXT,
        fecha TEXT
      );

      CREATE TABLE IF NOT EXISTS categorias_documentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE
      );

      INSERT OR IGNORE INTO categorias_documentos (nombre) VALUES ('Actas'), ('Recibos'), ('Normativas');
    `);

    console.log("Base de datos Synergy inicializada correctamente 🚀");
  } catch (error) {
    console.error("Error al inicializar la base de datos:", error);
  }
};

export default db;
