// src/store/useAuthStore.js
import { create } from "zustand";

export const useAuthStore = create((set) => ({
  // Estado inicial: no hay usuario logueado
  user: null,

  // Función para guardar el usuario cuando hace login
  login: (userData) => set({ user: userData }),

  // Función para borrar los datos al cerrar sesión
  logout: () => set({ user: null }),
}));
