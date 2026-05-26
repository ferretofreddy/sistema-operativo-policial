// frontend/src/hooks/usePerfilUsuario.js
//
// Resuelve los IDs de userData en nombres legibles para dashboards.
// v2 — agrega resolución de condición y recurso activo para agente.

import { useState, useEffect } from "react";
import {
  DelegationRepository,
  RegionRepository,
  SquadRepository,
  RankRepository,
  ConditionRepository,
  ResourceRepository,
} from "../core";

export function usePerfilUsuario(userData) {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.id) {
      setPerfil(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function resolver() {
      setLoading(true);
      try {
        // Paso 1 — queries en paralelo: delegación, escuadra, rango, condición
        const [delegacion, escuadra, rango, condicion] = await Promise.all([
          userData.delegation_id
            ? DelegationRepository.getById(userData.delegation_id).catch(() => null)
            : Promise.resolve(null),

          userData.squad_id
            ? SquadRepository.getById(userData.squad_id).catch(() => null)
            : Promise.resolve(null),

          userData.rank_id
            ? RankRepository.getById(userData.rank_id).catch(() => null)
            : Promise.resolve(null),

          userData.condition_id
            ? ConditionRepository.getById(userData.condition_id).catch(() => null)
            : Promise.resolve(null),
        ]);

        // Paso 2 — región (requiere region_id de la delegación)
        const region = delegacion?.region_id
          ? await RegionRepository.getById(delegacion.region_id).catch(() => null)
          : null;

        // Paso 3 — recurso activo (solo para agente, via resource_assignments)
        // No existe recurso_id en users — la asignación está en resource_assignments.
        // Se usa supabase directo porque fetchCollection ordena por "creado" por defecto
        // y resource_assignments no tiene esa columna.
        let recursoNombre = null;
        if (userData.rol === "agente" || userData.squad_id) {
          try {
            const { supabase } = await import("../core/providers/supabase/SupabaseProvider");
            const { data: assignments } = await supabase
              .from("resource_assignments")
              .select("resource_id")
              .eq("user_id", userData.id)
              .is("liberado_en", null)
              .limit(1);
            const activa = assignments?.[0];
            if (activa?.resource_id) {
              const recurso = await ResourceRepository.getById(activa.resource_id).catch(() => null);
              recursoNombre = recurso?.nombre_recurso
                ?? recurso?.indicativo
                ?? null;
            }
          } catch {
            recursoNombre = null;
          }
        }

        if (cancelled) return;

        setPerfil({
          nombreCompleto: [
            userData.nombre,
            userData.apellido1,
            userData.apellido2,
          ]
            .filter(Boolean)
            .join(" ") || "—",

          regionNombre:     region?.nombre       ?? "—",
          delegacionNombre: delegacion?.nombre   ?? "—",

          // null → rol sin escuadra (jefatura, unidad_operativa, admin)
          escuadraNombre: userData.squad_id
            ? (escuadra?.nombre ?? "—")
            : null,

          rangoSiglas:     rango?.siglas         ?? null,
          condicionNombre: condicion?.nombre     ?? null,
          recursoActivo:   recursoNombre,

          // Último acceso — null es dato de prueba vacío, no error
          ultimoAcceso:    userData.ultimo_login ?? null,

          rol: userData.rol ?? "—",
        });
      } catch (err) {
        console.error("[usePerfilUsuario] Error resolviendo perfil:", err.message);
        if (!cancelled) {
          setPerfil({
            nombreCompleto:   userData.nombre ?? "—",
            regionNombre:     "—",
            delegacionNombre: "—",
            escuadraNombre:   null,
            rangoSiglas:      null,
            condicionNombre:  null,
            recursoActivo:    null,
            ultimoAcceso:     null,
            rol:              userData.rol ?? "—",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolver();
    return () => { cancelled = true; };

  }, [userData?.id, userData?.delegation_id, userData?.squad_id, userData?.rank_id, userData?.condition_id]);

  return { perfil, loadingPerfil: loading };
}
