// frontend/src/modules/supervisor/recursos/GestionRecurso.jsx
// Migrado de Firebase a Supabase — Mayo 2026
//
// Asignación de personal a recursos operativos.
// Usa la vista resources_con_oficiales para cargar recursos con sus oficiales activos.
// Operaciones privilegiadas via supabase.rpc():
//   - asignar_oficial_a_recurso(p_resource_id, p_user_id, p_squad_id)
//   - remover_oficial_de_recurso(p_resource_id, p_user_id)
//   - liberar_recurso(p_resource_id)
//
// Personal disponible = usuarios de la delegación sin resource_assignment activo.
// Un recurso puede pertenecer a cualquier escuadra de la delegación dinámicamente.

import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { AuthContext } from "../../../context/AuthContext";
import {
  UserRepository,
  SquadRepository,
  ResourceTypeRepository,
  RegionRepository,
  DelegationRepository,
} from "../../../core";
import { supabase } from "../../../core/providers/supabase/SupabaseProvider";

function GestionRecurso() {
  const { userData } = useContext(AuthContext);
  const esAdmin      = userData?.rol === "admin";
  const esSupervisor = userData?.rol === "supervisor";

  // ── DATA ────────────────────────────────────────────────
  const [recursos,            setRecursos]            = useState([]);
  const [usuarios,            setUsuarios]            = useState([]);
  const [escuadras,           setEscuadras]           = useState([]);
  const [regiones,            setRegiones]            = useState([]);
  const [delegaciones,        setDelegaciones]        = useState([]);
  const [tiposRecurso,        setTiposRecurso]        = useState([]);
  const [recursoSeleccionado, setRecursoSeleccionado] = useState(null);
  const [escuadraId,          setEscuadraId]          = useState("");

  // ── UI ──────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtros,  setFiltros]  = useState({ region_id: "", delegation_id: "" });

  // ── CATÁLOGOS ────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        const [regs, delegs, tipos] = await Promise.all([
          RegionRepository.getActivas(),
          DelegationRepository.getActivas(),
          ResourceTypeRepository.getActivos(),
        ]);
        setRegiones(regs);
        setDelegaciones(delegs);
        setTiposRecurso(tipos);
      } catch (err) {
        setError("Error cargando catálogos: " + err.message);
      }
    };
    cargar();
  }, []);

  // ── CARGAR DATOS ─────────────────────────────────────────
  // Recursos: usa la vista resources_con_oficiales que incluye oficiales activos
  // Usuarios: filtra por delegación para mostrar disponibles
  // Escuadras: de la delegación para asignar al recurso

  const cargarDatos = useCallback(async () => {
    if (!userData) return;
    setLoading(true);
    setError("");
    try {
      const delegId = esAdmin ? (filtros.delegation_id || null) : userData.delegation_id;

      // Cargar recursos con oficiales desde la vista
      let recursosQuery = supabase.from("resources_con_oficiales").select("*");
      if (delegId) recursosQuery = recursosQuery.eq("delegation_id", delegId);
      const { data: recursosData, error: recursosError } = await recursosQuery;
      if (recursosError) throw new Error(recursosError.message);

      // Usuarios activos de la delegación (para mostrar disponibles)
      const filtrosUsuarios = delegId
        ? { delegation_id: delegId, estado_usuario: "activo" }
        : { estado_usuario: "activo" };
      // Supervisor solo ve usuarios de su escuadra
      if (esSupervisor && userData.squad_id) {
        filtrosUsuarios.squad_id = userData.squad_id;
      }
      const usuariosData = await UserRepository.getAll(filtrosUsuarios);

      // Escuadras activas de la delegación
      const escuadrasData = delegId
        ? await SquadRepository.getByDelegation(delegId)
        : await SquadRepository.getAll({ estado: "activo" });

      setRecursos(recursosData ?? []);
      setUsuarios(usuariosData);
      setEscuadras(escuadrasData);

      // Refrescar recurso seleccionado
      if (recursoSeleccionado) {
        const actualizado = recursosData?.find(r => r.id === recursoSeleccionado.id);
        setRecursoSeleccionado(actualizado ?? null);
      }
    } catch (err) {
      setError("Error cargando datos: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [userData, esAdmin, esSupervisor, filtros, recursoSeleccionado?.id]);

  useEffect(() => { cargarDatos(); }, [userData, filtros]);

  // ── DERIVADOS ────────────────────────────────────────────

  const delegacionesFiltradas = useMemo(() =>
    !filtros.region_id ? delegaciones : delegaciones.filter(d => d.region_id === filtros.region_id),
  [delegaciones, filtros.region_id]);

  const recursosFiltrados = useMemo(() => {
    return recursos.filter(r => {
      if (filtros.delegation_id) return r.delegation_id === filtros.delegation_id;
      if (filtros.region_id) {
        const delegsDeRegion = delegaciones
          .filter(d => d.region_id === filtros.region_id)
          .map(d => d.id);
        return delegsDeRegion.includes(r.delegation_id);
      }
      return true;
    });
  }, [recursos, filtros, delegaciones]);

  // IDs de usuarios con resource_assignment activo
  const usuariosConRecurso = useMemo(() => {
    const ids = new Set();
    recursos.forEach(r => {
      (r.oficiales ?? []).forEach(o => ids.add(o.user_id));
    });
    return ids;
  }, [recursos]);

  // Usuarios disponibles = misma delegación, sin recurso activo, filtro búsqueda
  const usuariosDisponibles = useMemo(() => {
    if (!recursoSeleccionado) return [];
    const texto = busqueda.toLowerCase().trim();
    return usuarios.filter(u => {
      const sinRecurso   = !usuariosConRecurso.has(u.id);
      const mismaDeleg   = u.delegation_id === recursoSeleccionado.delegation_id;
      const coincideBusq = !texto ||
        `${u.nombre ?? ""} ${u.apellido1 ?? ""} ${u.apellido2 ?? ""}`.toLowerCase().includes(texto) ||
        u.cedula?.toLowerCase().includes(texto);
      return sinRecurso && mismaDeleg && coincideBusq;
    });
  }, [usuarios, recursoSeleccionado, usuariosConRecurso, busqueda]);

  // JOIN helpers
  const getNombreDeleg  = (id) => delegaciones.find(d => d.id === id)?.nombre ?? "—";
  const getNombreTipo   = (id) => tiposRecurso.find(t => t.id === id)?.nombre ?? "—";
  const getNombreEscuad = (id) => escuadras.find(e => e.id === id)?.nombre ?? "Sin escuadra";

  // ── SELECCIONAR RECURSO ──────────────────────────────────
  const seleccionarRecurso = (recurso) => {
    setRecursoSeleccionado(recurso);
    setEscuadraId(recurso.squad_id ?? "");
    setBusqueda("");
    setError("");
  };

  // ── ASIGNAR OFICIAL ──────────────────────────────────────
  const agregarOficial = async (usuario) => {
    if (!recursoSeleccionado) return;
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.rpc("asignar_oficial_a_recurso", {
        p_resource_id: recursoSeleccionado.id,
        p_user_id:     usuario.id,
        p_squad_id:    escuadraId || null,
      });
      if (error) throw new Error(error.message);
      await cargarDatos();
    } catch (err) {
      setError("Error asignando funcionario: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── REMOVER OFICIAL ──────────────────────────────────────
  const removerOficial = async (oficial) => {
    if (!recursoSeleccionado) return;
    if (!confirm(`¿Remover a ${oficial.nombre} ${oficial.apellido1} del recurso?`)) return;
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.rpc("remover_oficial_de_recurso", {
        p_resource_id: recursoSeleccionado.id,
        p_user_id:     oficial.user_id,
      });
      if (error) throw new Error(error.message);
      await cargarDatos();
    } catch (err) {
      setError("Error removiendo funcionario: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── GUARDAR ESCUADRA EN RECURSO ──────────────────────────
  const guardarEscuadra = async () => {
    if (!recursoSeleccionado) return;
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase
        .from("resources")
        .update({ squad_id: escuadraId || null, actualizado: new Date().toISOString() })
        .eq("id", recursoSeleccionado.id);
      if (error) throw new Error(error.message);
      await cargarDatos();
    } catch (err) {
      setError("Error guardando escuadra: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── LIBERAR RECURSO COMPLETO ─────────────────────────────
  const liberarRecurso = async () => {
    if (!recursoSeleccionado) return;
    if (!confirm(`¿Liberar ${recursoSeleccionado.nombre_recurso}? Se desasignarán todos los funcionarios.`)) return;
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.rpc("liberar_recurso", {
        p_resource_id: recursoSeleccionado.id,
      });
      if (error) throw new Error(error.message);
      setRecursoSeleccionado(null);
      setEscuadraId("");
      await cargarDatos();
    } catch (err) {
      setError("Error liberando recurso: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── RENDER ───────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: 0 }}>Gestión Operativa de Recursos</h1>
        <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>Asignación de personal y escuadra a recursos operativos</p>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {/* Filtros admin */}
      {esAdmin && (
        <div style={filtrosGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Región</label>
            <select
              value={filtros.region_id}
              onChange={e => setFiltros(p => ({ ...p, region_id: e.target.value, delegation_id: "" }))}
              style={inputStyle}
            >
              <option value="">Todas las regiones</option>
              {regiones.map(r => <option key={r.id} value={r.id}>{r.codigo} - {r.nombre}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Delegación</label>
            <select
              value={filtros.delegation_id}
              onChange={e => setFiltros(p => ({ ...p, delegation_id: e.target.value }))}
              disabled={!filtros.region_id}
              style={inputStyle}
            >
              <option value="">Todas las delegaciones</option>
              {delegacionesFiltradas.map(d => <option key={d.id} value={d.id}>{d.codigo} - {d.nombre}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Layout principal */}
      <div style={mainLayoutStyle}>

        {/* SIDEBAR — Lista de recursos */}
        <div style={sidebarStyle}>
          <h3 style={sidebarTitleStyle}>Recursos</h3>
          {recursosFiltrados.length === 0 ? (
            <p style={emptyStyle}>No hay recursos disponibles</p>
          ) : recursosFiltrados.map(r => (
            <div
              key={r.id}
              onClick={() => seleccionarRecurso(r)}
              style={{
                ...sidebarItemStyle,
                ...(recursoSeleccionado?.id === r.id ? sidebarItemActiveStyle : {}),
              }}
            >
              <strong style={{ fontSize: "13px" }}>{r.nombre_recurso || r.indicativo}</strong>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                {getNombreTipo(r.resource_type_id)} | {r.unidad}
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                {getNombreEscuad(r.squad_id)}
              </div>
              <span style={{
                ...badgeMiniStyle,
                background: r.estado === "activo" ? "#dcfce7" : r.estado === "mantenimiento" ? "#fef9c3" : "#fee2e2",
                color: r.estado === "activo" ? "#166534" : r.estado === "mantenimiento" ? "#854d0e" : "#991b1b",
              }}>
                {r.estado}
              </span>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                {(r.oficiales ?? []).length} oficial(es)
              </div>
            </div>
          ))}
        </div>

        {/* CONTENIDO */}
        {!recursoSeleccionado ? (
          <div style={emptyContentStyle}>
            <p style={{ color: "#94a3b8" }}>Seleccione un recurso de la lista</p>
          </div>
        ) : (
          <div style={contentGridStyle}>

            {/* COLUMNA 1 — Disponibles */}
            <div style={columnStyle}>
              <h3 style={columnTitleStyle}>Disponibles para asignar</h3>
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar funcionario..."
                style={inputStyle}
              />
              <div style={{ marginTop: "10px" }}>
                {usuariosDisponibles.length === 0 ? (
                  <p style={emptyStyle}>No hay funcionarios disponibles</p>
                ) : usuariosDisponibles.map(u => (
                  <div key={u.id} style={userCardStyle}>
                    <div>
                      <strong style={{ fontSize: "13px" }}>{u.nombre} {u.apellido1}</strong>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{u.rol}</div>
                    </div>
                    <button onClick={() => agregarOficial(u)} style={btnAddStyle} disabled={loading}>
                      Asignar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUMNA 2 — Personal asignado */}
            <div style={columnStyle}>
              <h3 style={columnTitleStyle}>
                Personal asignado ({(recursoSeleccionado.oficiales ?? []).length})
              </h3>
              {(recursoSeleccionado.oficiales ?? []).length === 0 ? (
                <p style={emptyStyle}>Sin personal asignado</p>
              ) : (recursoSeleccionado.oficiales ?? []).map(o => (
                <div key={o.user_id} style={userCardStyle}>
                  <div>
                    <strong style={{ fontSize: "13px" }}>{o.nombre} {o.apellido1}</strong>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{o.rol}</div>
                  </div>
                  <button onClick={() => removerOficial(o)} style={btnRemoveStyle} disabled={loading}>
                    Remover
                  </button>
                </div>
              ))}
            </div>

            {/* COLUMNA 3 — Configuración */}
            <div style={columnStyle}>
              <h3 style={columnTitleStyle}>Configuración del recurso</h3>

              <div style={infoBoxStyle}>
                <div style={infoRowStyle}><span>Recurso</span><strong>{recursoSeleccionado.nombre_recurso}</strong></div>
                <div style={infoRowStyle}><span>Tipo</span><strong>{getNombreTipo(recursoSeleccionado.resource_type_id)}</strong></div>
                <div style={infoRowStyle}><span>Unidad</span><strong>{recursoSeleccionado.unidad}</strong></div>
                <div style={infoRowStyle}><span>Indicativo</span><strong>{recursoSeleccionado.indicativo}</strong></div>
                <div style={infoRowStyle}><span>Delegación</span><strong>{getNombreDeleg(recursoSeleccionado.delegation_id)}</strong></div>
                <div style={infoRowStyle}><span>Estado</span><strong>{recursoSeleccionado.estado}</strong></div>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Asignar escuadra</label>
                <select value={escuadraId} onChange={e => setEscuadraId(e.target.value)} style={inputStyle}>
                  <option value="">Sin escuadra</option>
                  {escuadras.map(e => <option key={e.id} value={e.id}>{e.codigo} - {e.nombre}</option>)}
                </select>
              </div>

              <button onClick={guardarEscuadra} disabled={loading} style={btnPrimaryStyle}>
                Guardar escuadra
              </button>

              <button onClick={liberarRecurso} disabled={loading} style={btnDangerStyle}>
                Liberar recurso completo
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ── ESTILOS ──────────────────────────────────────────────────────────────────
const pageStyle            = { padding: "20px", fontFamily: "system-ui, sans-serif" };
const headerStyle          = { marginBottom: "20px" };
const errorStyle           = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", color: "#dc2626", marginBottom: "16px" };
const filtrosGridStyle     = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px", background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.06)" };
const mainLayoutStyle      = { display: "grid", gridTemplateColumns: "240px 1fr", gap: "20px", alignItems: "start" };
const sidebarStyle         = { background: "white", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.06)", overflow: "hidden" };
const sidebarTitleStyle    = { margin: 0, padding: "16px", fontSize: "14px", fontWeight: "600", color: "#1e293b", borderBottom: "1px solid #f1f5f9" };
const sidebarItemStyle     = { padding: "14px 16px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: "3px" };
const sidebarItemActiveStyle = { background: "#f0f9ff", borderLeft: "3px solid #3b82f6" };
const contentGridStyle     = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" };
const emptyContentStyle    = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px", background: "white", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.06)" };
const columnStyle          = { background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: "12px" };
const columnTitleStyle     = { margin: 0, fontSize: "14px", fontWeight: "600", color: "#1e293b" };
const fieldStyle           = { display: "flex", flexDirection: "column", gap: "5px" };
const labelStyle           = { fontSize: "13px", fontWeight: "500", color: "#374151" };
const inputStyle           = { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none", width: "100%", boxSizing: "border-box" };
const userCardStyle        = { border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa" };
const emptyStyle           = { color: "#94a3b8", fontSize: "13px", textAlign: "center", padding: "20px 0" };
const infoBoxStyle         = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "6px" };
const infoRowStyle         = { display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "3px 0", borderBottom: "1px solid #f1f5f9" };
const badgeMiniStyle       = { display: "inline-block", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "500", marginTop: "4px" };
const btnAddStyle          = { padding: "5px 12px", background: "#1e293b", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" };
const btnRemoveStyle       = { padding: "5px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" };
const btnPrimaryStyle      = { padding: "10px", background: "#1e293b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "500", fontSize: "14px" };
const btnDangerStyle       = { padding: "10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "8px", cursor: "pointer", fontWeight: "500", fontSize: "14px" };

export default GestionRecurso;
