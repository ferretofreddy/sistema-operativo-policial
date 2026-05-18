// src/core/providers/providerRegistry.js
//
// PUNTO ÚNICO DE CONFIGURACIÓN DEL PROVIDER.
//
// HOY: FirebaseProvider
// MAÑANA: SupabaseProvider (solo cambiar el import de abajo)
//
// Ningún repository, service ni componente importa Firebase o Supabase
// directamente — todos usan getProvider() de este archivo.
//
// Cuando llegue la migración:
// 1. Crear SupabaseProvider implementando BaseProvider
// 2. Cambiar el import de abajo
// 3. Nada más cambia en el proyecto

import { FirebaseProvider } from "./firebase/FirebaseProvider";
// import { SupabaseProvider } from "./supabase/SupabaseProvider"; // FUTURO

// =========================================
// INSTANCIA SINGLETON DEL PROVIDER ACTIVO
// =========================================

let _providerInstance = null;

export function getProvider() {
  if (!_providerInstance) {
    _providerInstance = new FirebaseProvider();
    // _providerInstance = new SupabaseProvider(); // FUTURO
  }
  return _providerInstance;
}

/**
 * Solo para tests — permite inyectar un provider mock.
 * @param {BaseProvider} mockProvider
 */
export function setProviderForTesting(mockProvider) {
  _providerInstance = mockProvider;
}

/**
 * Reset del singleton — útil entre tests.
 */
export function resetProvider() {
  _providerInstance = null;
}
