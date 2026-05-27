// frontend/src/modules/administracion/escuadras/GestionEscuadra.jsx
//
// Asignación de personal a escuadras.
// Personal disponible = usuarios de la delegación con squad_id IS NULL
// Personal ocupado = usuarios con squad_id de otra escuadra → no aparece
// Asignar = UserRepository.update(userId, { squad_id })
// Remover  = UserRepository.update(userId, { squad_id: null })
// Supervisor = SquadRepository.update(squadId, { supervisor_id })

import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { AuthContext } from "../../../context/AuthContext";
import {
  UserRepository,
  SquadRepository,
  RegionRepository,
  DelegationRepository,
} from "../../../core";

function GestionEscuadra() {
  const { userData } = useContext(AuthContext);
  const esAdmin = userData?.rol === "admin";

  // ── DATA ────────────────────────────────────────────────
  const [usuarios,             setUsuarios]             = useState([]);
  const [escuadras,            setEscuadras]            = useState([]);
  const [regiones,             setRegiones]             = useState([]);
  const [delegaciones,         setDelegaciones]         = useState([]);
  const [escuadraSeleccionada, setEscuadraSeleccionada] = useState(null);

  // ── UI ──────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtros,  setFiltros]  = useState({ region_id: "", delegation_id: "" });

  // ── CATÁLOGOS ────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        const [regs, delegs] = await Promise.all([
          RegionRepository.getActivas(),
          DelegationRepository.getActivas(),
        ]);
        setRegiones(regs);
        setDelegaciones(delegs);
      } catch (err) {
        setError("Error cargando catálogos: " + err.message);
      }
    };
    cargar();
  }, []);

  // ── CARGAR DATOS ─────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    if (!userData) return;
    setLoading(true);
    setError("");
    try {
      const filtrosQuery = esAdmin
        ? {
            ...(filtros.delegation_id && { delegation_id: filtros.delegation_id }),
          }
        : { delegation_id: userData.delegation_id };

      const [usuariosData, escuadrasData] = await Promise.all([
        UserRepository.getAll({ ...filtrosQuery, estado_usuario: "activo" }),
        SquadRepository.getAll({ ...filtrosQuery, estado: "activo" }),
      ]);

      setUsuarios(usuariosData);
      setEscuadras(escuadrasData);

      // Actualizar escuadra seleccionada si sigue activa
      if (escuadraSeleccionada) {
        const actualizada = escuadrasData.find(e => e.id === escuadraSeleccionada.id);
        setEscuadraSeleccionada(actualizada ?? null);
      }
    } catch (err) {
      setError("Error cargando datos: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [userData, esAdmin, filtros, escuadraSeleccionada?.id]);

  useEffect(() => { cargarDatos(); }, [userData, filtros]);

  // ── DERIVADOS ────────────────────────────────────────────

  const delegacionesFiltradas = useMemo(() =>
    !filtros.region_id ? delegaciones : delegaciones.filter(d => d.region_id === filtros.region_id),
  [delegaciones, filtros.region_id]);

  const oficialesAsignados = useMemo(() => {
    if (!escuadraSeleccionada) return [];
    return usuarios.filter(u => u.squad_id === escuadraSeleccionada.id);
  }, [usuarios, escuadraSeleccionada]);

  const usuariosDisponibles = useMemo(() => {
    if (!escuadraSeleccionada) return [];
    const texto = busqueda.toLowerCase().trim();
    return usuarios.filter(u => {
      const mismaDelegacion = u.delegation_id === escuadraSeleccionada.delegation_id;
      const sinEscuadra     = !u.squad_id;
      const coincideBusq    = !texto ||
        `${u.nombre ?? ""} ${u.apellido1 ?? ""} ${u.apellido2 ?? ""} ${u.cedula ?? ""}`.toLowerCase().includes(texto);
      return mismaDelegacion && sinEscuadra && coincideBusq;
    });
  }, [usuarios, escuadraSeleccionada, busqueda]);

  const supervisoresDisponibles = useMemo(() =>
    oficialesAsignados.filter(u => u.rol === "supervisor"),
  [oficialesAsignados]);

  const escuadrasFiltradas = useMemo(() => {
    return escuadras.filter(e => {
      if (filtros.delegation_id) return e.delegation_id === filtros.delegation_id;
      if (filtros.region_id) {
        const delegsDeRegion = delegaciones
          .filter(d => d.region_id === filtros.region_id)
          .map(d => d.id);
        return delegsDeRegion.includes(e.delegation_id);
      }
      return true;
    });
  }, [escuadras, filtros, delegaciones]);

  // JOIN local helpers
  const getNombreDeleg = (id) => delegaciones.find(d => d.id === id)?.nombre ?? "—";

  // ── ASIGNAR OFICIAL ──────────────────────────────────────
  const agregarOficial = async (usuario) => {
    if (!escuadraSeleccionada) return;
    setLoading(true);
    setError("");
    try {
      await UserRepository.update(usuario.id, { squad_id: escuadraSeleccionada.id });
      await cargarDatos();
    } catch (err) {
      setError("Error asignando funcionario: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── REMOVER OFICIAL ──────────────────────────────────────
  const removerOficial = async (usuario) => {
    if (!escuadraSeleccionada) return;
    if (!confirm(`¿Remover a ${usuario.nombre} ${usuario.apellido1} de la escuadra?`)) return;
    setLoading(true);
    setError("");
    try {
      if (escuadraSeleccionada.supervisor_id === usuario.id) {
        await SquadRepository.update(escuadraSeleccionada.id, { supervisor_id: null });
      }
      await UserRepository.update(usuario.id, { squad_id: null });
      await cargarDatos();
    } catch (err) {
      setError("Error removiendo funcionario: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── GUARDAR SUPERVISOR ───────────────────────────────────
  const guardarSupervisor = async (supervisorId) => {
    if (!escuadraSeleccionada) return;
    setLoading(true);
    setError("");
    try {
      await SquadRepository.update(escuadraSeleccionada.id, {
        supervisor_id: supervisorId || null,
      });
      await cargarDatos();
    } catch (err) {
      setError("Error actualizando supervisor: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── RENDER ───────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: 0 }}>Gestión Operativa de Escuadras</h1>
        <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>Asignación de personal y supervisor</p>
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

      {/* Layout principal: sidebar + contenido */}
      <div style={mainLayoutStyle}>

        {/* SIDEBAR — Lista de escuadras */}
        <div style={sidebarStyle}>
          <h3 style={sidebarTitleStyle}>Escuadras</h3>
          {escuadrasFiltradas.length === 0 ? (
            <p style={emptyStyle}>No hay escuadras disponibles</p>
          ) : escuadrasFiltradas.map(e => (
            <div
              key={e.id}
              onClick={() => { setEscuadraSeleccionada(e); setBusqueda(""); }}
              style={{
                ...sidebarItemStyle,
                ...(escuadraSeleccionada?.id === e.id ? sidebarItemActiveStyle : {}),
              }}
            >
              <strong>{e.codigo}</strong>
              <div style={{ fontSize: "13px" }}>{e.nombre}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                {getNombreDeleg(e.delegation_id)}
              </div>
              <div style={{ fontSize: "11px", marginTop: "4px" }}>
                <span style={badgeMiniStyle}>
                  {usuarios.filter(u => u.squad_id === e.id).length} oficiales
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CONTENIDO — tres columnas */}
        {!escuadraSeleccionada ? (
          <div style={emptyContentStyle}>
            <p style={{ color: "#94a3b8" }}>Seleccione una escuadra de la lista</p>
          </div>
        ) : (
          <div style={contentGridStyle}>

            {/* COLUMNA 1 — Disponibles */}
            <div style={columnStyle}>
              <h3 style={columnTitleStyle}>Disponibles</h3>
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar funcionario..."
                style={inputStyle}
              />
              <div style={{ marginTop: "12px" }}>
                {usuariosDisponibles.length === 0 ? (
                  <p style={emptyStyle}>No hay funcionarios disponibles</p>
                ) : usuariosDisponibles.map(u => (
                  <div key={u.id} style={userCardStyle}>
                    <div>
                      <strong style={{ fontSize: "13px" }}>{u.nombre} {u.apellido1}</strong>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{u.rol}</div>
                    </div>
                    <button onClick={() => agregarOficial(u)} style={btnAddStyle}>
                      Agregar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUMNA 2 — Asignados */}
            <div style={columnStyle}>
              <h3 style={columnTitleStyle}>Asignados ({oficialesAsignados.length})</h3>
              {oficialesAsignados.length === 0 ? (
                <p style={emptyStyle}>Sin personal asignado</p>
              ) : oficialesAsignados.map(u => (
                <div key={u.id} style={userCardStyle}>
                  <div>
                    <strong style={{ fontSize: "13px" }}>{u.nombre} {u.apellido1}</strong>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{u.rol}</div>
                    {escuadraSeleccionada.supervisor_id === u.id && (
                      <span style={supervisorBadgeStyle}>SUPERVISOR</span>
                    )}
                  </div>
                  <button onClick={() => removerOficial(u)} style={btnRemoveStyle}>
                    Remover
                  </button>
                </div>
              ))}
            </div>

            {/* COLUMNA 3 — Supervisor */}
            <div style={columnStyle}>
              <h3 style={columnTitleStyle}>Supervisor</h3>
              {supervisoresDisponibles.length === 0 ? (
                <p style={emptyStyle}>No hay supervisores asignados a esta escuadra</p>
              ) : (
                <>
                  <select
                    value={escuadraSeleccionada.supervisor_id ?? ""}
                    onChange={e => setEscuadraSeleccionada(prev => ({ ...prev, supervisor_id: e.target.value || null }))}
                    style={inputStyle}
                  >
                    <option value="">Sin supervisor</option>
                    {supervisoresDisponibles.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} {u.apellido1}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => guardarSupervisor(escuadraSeleccionada.supervisor_id)}
                    style={btnPrimaryStyle}
                    disabled={loading}
                  >
                    {loading ? "Guardando..." : "Guardar Supervisor"}
                  </button>
                </>
              )}

              {/* Info escuadra seleccionada */}
              <div style={infoBoxStyle}>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px", fontWeight: "600" }}>
                  INFORMACIÓN
                </div>
                <div style={infoRowStyle}><span>Escuadra</span><strong>{escuadraSeleccionada.nombre}</strong></div>
                <div style={infoRowStyle}><span>Código</span><strong>{escuadraSeleccionada.codigo}</strong></div>
                <div style={infoRowStyle}><span>Delegación</span><strong>{getNombreDeleg(escuadraSeleccionada.delegation_id)}</strong></div>
                <div style={infoRowStyle}><span>Total personal</span><strong>{oficialesAsignados.length}</strong></div>
              </div>
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
const sidebarItemStyle     = { padding: "14px 16px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" };
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
const badgeMiniStyle       = { background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "10px", fontSize: "11px" };
const supervisorBadgeStyle = { background: "#dbeafe", color: "#1e40af", padding: "1px 6px", borderRadius: "8px", fontSize: "10px", fontWeight: "600", marginLeft: "6px" };
const infoBoxStyle         = { marginTop: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" };
const infoRowStyle         = { display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "4px 0", borderBottom: "1px solid #f1f5f9" };
const btnAddStyle          = { padding: "5px 12px", background: "#1e293b", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" };
const btnRemoveStyle       = { padding: "5px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" };
const btnPrimaryStyle      = { padding: "10px", background: "#1e293b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "500", fontSize: "14px", marginTop: "8px" };

export default GestionEscuadra;
