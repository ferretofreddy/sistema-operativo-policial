// frontend/src/hooks/usePerfilUsuario.js
// V2.1E fix2 — estado separado para recurso evita race condition
// entre useEffect territorial y useEffect de recurso

import { useState, useEffect } from "react";
import {
  DelegationRepository,
  RegionRepository,
  SquadRepository,
  RankRepository,
  ConditionRepository,
} from "../core";

export function usePerfilUsuario(userData) {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  // Estado separado para recurso — evita que Paso 1 sobreescriba Paso 2
  const [recursoActivo, setRecursoActivo] = useState(null);

  // ── Paso 1: datos territoriales y estáticos ───────────────
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

        const region = delegacion?.region_id
          ? await RegionRepository.getById(delegacion.region_id).catch(() => null)
          : null;

        const tipo = delegacion?.delegation_type;
        let cantonalNombre = null;
        let subdelegacionNombre = null;

        if (tipo === "central" || tipo === "distrital") {
          subdelegacionNombre = delegacion?.nombre ?? null;
          if (delegacion?.parent_delegation_id) {
            const cantonal = await DelegationRepository
              .getById(delegacion.parent_delegation_id).catch(() => null);
            cantonalNombre = cantonal?.nombre ?? null;
          }
        }

        if (cancelled) return;

        setPerfil({
          // recursoActivo viene del estado separado — no lo tocamos aquí
          nombreCompleto: [
            userData.nombre,
            userData.apellido1,
            userData.apellido2,
          ].filter(Boolean).join(" ") || "—",

          regionNombre: region?.nombre ?? "—",

          delegacionNombre: (tipo === "central" || tipo === "distrital")
            ? (cantonalNombre ?? delegacion?.nombre ?? "—")
            : (delegacion?.nombre ?? "—"),

          subdelegacionNombre,
          delegacionTipo: tipo ?? "cantonal",
          esDistrital: tipo === "distrital",

          escuadraNombre: userData.squad_id
            ? (escuadra?.nombre ?? "—")
            : null,

          rangoSiglas: rango?.siglas ?? null,
          condicionNombre: condicion?.nombre ?? null,
          ultimoAcceso: userData.ultimo_login ?? null,
          rol: userData.rol ?? "—",
        });
      } catch (err) {
        console.error("[usePerfilUsuario] Error:", err.message);
        if (!cancelled) {
          setPerfil({
            nombreCompleto: userData.nombre ?? "—",
            regionNombre: "—",
            delegacionNombre: "—",
            subdelegacionNombre: null,
            escuadraNombre: null,
            rangoSiglas: null,
            condicionNombre: null,
            ultimoAcceso: null,
            rol: userData.rol ?? "—",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolver();
    return () => { cancelled = true; };

  }, [
    userData?.id,
    userData?.delegation_id,
    userData?.squad_id,
    userData?.rank_id,
    userData?.condition_id,
  ]);

  // ── Paso 2: recurso activo — estado independiente ─────────
  // Estado separado evita que setPerfil del Paso 1 sobreescriba
  // el recurso ya resuelto (race condition).
  // Polling cada 30s para agente y supervisor.
  useEffect(() => {
    if (!userData?.id) return;

    const rolesConRecurso = ["agente", "supervisor"];
    if (!rolesConRecurso.includes(userData?.rol) && !userData?.squad_id) return;

    let cancelled = false;

    async function resolverRecurso() {
      try {
        const { supabase } = await import(
          "../core/providers/supabase/SupabaseProvider"
        );

        const { data: assignments } = await supabase
          .from("resource_assignments")
          .select("resource_id")
          .eq("user_id", userData.id)
          .is("liberado_en", null)
          .limit(1);

        const resourceId = assignments?.[0]?.resource_id ?? null;
        let nombre = null;

        if (resourceId) {
          const { data: recursos } = await supabase
            .from("resources")
            .select("nombre_recurso, indicativo")
            .eq("id", resourceId)
            .limit(1);

          const r = recursos?.[0];
          nombre = r?.nombre_recurso ?? r?.indicativo ?? null;
        }

        if (!cancelled) setRecursoActivo(nombre);

      } catch (err) {
        console.error("[usePerfilUsuario] recurso:", err.message);
      }
    }

    resolverRecurso();
    const intervalo = setInterval(resolverRecurso, 30_000);
    return () => { cancelled = true; clearInterval(intervalo); };

  }, [userData?.id, userData?.rol, userData?.squad_id]);

  // ── Combinar perfil + recurso para el consumidor ──────────
  // Se recalcula cuando cambia cualquiera de los dos estados
  const perfilCompleto = perfil
    ? { ...perfil, recursoActivo }
    : null;

  return { perfil: perfilCompleto, loadingPerfil: loading };
}