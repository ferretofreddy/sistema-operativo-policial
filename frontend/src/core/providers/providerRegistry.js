// src/core/providers/providerRegistry.js
//
// PUNTO ÚNICO DE CONFIGURACIÓN DEL PROVIDER DE DATOS.
//
// PARA ACTIVAR SUPABASE:
//   1. Comentar la línea FirebaseProvider (import + instancia)
//   2. Descomentar las líneas SupabaseProvider
//   3. Agregar en .env:
//        VITE_SUPABASE_URL=https://<project-ref>.supabase.co
//        VITE_SUPABASE_ANON_KEY=<anon-key>
//   4. Nada más cambia en el proyecto.
//
// EN AUTHadapter.js: cambiar ACTIVE_PROVIDER = "supabase"

import { FirebaseProvider }  from "./firebase/FirebaseProvider";
// import { SupabaseProvider } from "./supabase/SupabaseProvider";

let _providerInstance = null;

export function getProvider() {
  if (!_providerInstance) {
    _providerInstance = new FirebaseProvider();
    // _providerInstance = new SupabaseProvider();
  }
  return _providerInstance;
}

export function setProviderForTesting(mockProvider) {
  _providerInstance = mockProvider;
}

export function resetProvider() {
  _providerInstance = null;
}
