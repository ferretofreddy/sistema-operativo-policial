// frontend/src/modules/supervisor/recursos/GestionRecurso.jsx
// V2.1B fix — refresco correcto + reubicar recurso para supervisor
//
// Fix 1: recargar usa ref estable del delegId, no valor stale de useCallback
// Fix 2: supervisor puede reubicar recurso de otra delegación a la suya

import { useContext, useEffect, useMemo, useRef, useState } from "react";
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
  const rol          = userData?.rol ?? "";
  const esAdmin      = rol === "admin";
  const esCantonal   = ["jefatura","unidad_operativa"].includes(rol);
  const esDistrital  = ["jefatura_distrital","unidad_operativa_distrital"].includes(rol);
  const esSupervisor = rol === "supervisor";

  // Ref estable del delegId activo — evita stale closure en recargar
  const delegActivaRef = useRef("");

  // ── Catálogos ──────────────────────────────────────────
  const [regiones,        setRegiones]       = useState([]);
  const [cantonales,      setCantonales]      = useState([]);
  const [subdelegaciones, setSubdelegaciones] = useState([]);
  const [tiposRecurso,    setTiposRecurso]    = useState([]);

  // ── Filtros ────────────────────────────────────────────
  const [filtroRegion,   setFiltroRegion]   = useState("");
  const [filtroCantonal, setFiltroCantonal] = useState("");
  const [filtroSubdeleg, setFiltroSubdeleg] = useState("");

  // ── Datos operativos ───────────────────────────────────
  const [recursos,            setRecursos]            = useState([]);
  const [usuarios,            setUsuarios]            = useState([]);
  const [escuadras,           setEscuadras]           = useState([]);
  const [recursoSeleccionado, setRecursoSeleccionado] = useState(null);
  const [escuadraId,          setEscuadraId]          = useState("");

  // ── Reubicar recurso (supervisor) ─────────────────────
  const [busquedaRecurso,   setBusquedaRecurso]   = useState("");
  const [resultadosRecurso, setResultadosRecurso] = useState([]);
  const [buscandoRecurso,   setBuscandoRecurso]   = useState(false);
  const [errorReubicar,     setErrorReubicar]     = useState("");
  const [successReubicar,   setSuccessReubicar]   = useState("");

  // ── UI ─────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [busqueda, setBusqueda] = useState("");

  // ── Carga inicial ──────────────────────────────────────
  useEffect(() => {
    if (!userData) return;
    ResourceTypeRepository.getActivos().then(setTiposRecurso).catch(() => {});

    if (esAdmin) {
      Promise.all([
        RegionRepository.getActivas(),
        DelegationRepository.getCantonales(),
      ]).then(([regs, cants]) => {
        setRegiones(regs ?? []);
        setCantonales(cants ?? []);
      });
    } else if (esCantonal) {
      DelegationRepository.getSubdelegaciones(userData.delegation_id)
        .then(setSubdelegaciones).catch(() => {});
    } else if (esDistrital) {
      resolverCantonalDistrital();
    } else if (esSupervisor) {
      const delegId = userData.delegation_id;
      delegActivaRef.current = delegId;
      cargarDatosDelegacion(delegId);
    }
  }, [userData]);

  async function resolverCantonalDistrital() {
    try {
      const { data } = await supabase
        .from("delegations")
        .select("id, parent_delegation_id")
        .eq("id", userData.delegation_id).single();
      if (data?.parent_delegation_id) {
        const subs = await DelegationRepository.getSubdelegaciones(data.parent_delegation_id);
        setSubdelegaciones(subs ?? []);
      }
      const delegId = userData.delegation_id;
      delegActivaRef.current = delegId;
      setFiltroSubdeleg(delegId);
      await cargarDatosDelegacion(delegId);
    } catch (err) {
      setError("Error: " + err.message);
    }
  }

  // ── Admin: subdelegaciones al cambiar cantonal ─────────
  useEffect(() => {
    if (!esAdmin || !filtroCantonal) {
      if (esAdmin) {
        setSubdelegaciones([]);
        setFiltroSubdeleg("");
        delegActivaRef.current = "";
        setRecursos([]);
        setRecursoSeleccionado(null);
      }
      return;
    }
    DelegationRepository.getSubdelegaciones(filtroCantonal)
      .then(d => {
        setSubdelegaciones(d ?? []);
        setFiltroSubdeleg("");
        delegActivaRef.current = "";
        setRecursos([]);
        setRecursoSeleccionado(null);
      })
      .catch(err => setError("Error: " + err.message));
  }, [filtroCantonal]);

  // ── Datos al cambiar subdelegación ────────────────────
  useEffect(() => {
    if (!filtroSubdeleg) return;
    delegActivaRef.current = filtroSubdeleg;
    cargarDatosDelegacion(filtroSubdeleg);
  }, [filtroSubdeleg]);

  // FIX: recibe delegId explícito — no depende de closure stale
  async function cargarDatosDelegacion(delegId) {
    if (!delegId) return;
    setLoading(true);
    try {
      const { data: recs, error: rErr } = await supabase
        .from("resources_con_oficiales").select("*")
        .eq("delegation_id", delegId);
      if (rErr) throw rErr;

      const filtrosU = { delegation_id: delegId, estado_usuario: "activo" };
      if (esSupervisor && userData.squad_id) {
        filtrosU.squad_id = userData.squad_id;
      }

      const [usrs, escs] = await Promise.all([
        UserRepository.getAll(filtrosU),
        SquadRepository.getByDelegation(delegId),
      ]);

      setRecursos(recs ?? []);
      setUsuarios(usrs ?? []);
      setEscuadras(escs ?? []);

      // FIX: actualizar recurso seleccionado con datos frescos
      setRecursoSeleccionado(prev => {
        if (!prev) return null;
        return recs?.find(r => r.id === prev.id) ?? null;
      });
    } catch (err) {
      setError("Error cargando datos: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // FIX: recargar usa ref en lugar de closure
  function recargar() {
    const delegId = delegActivaRef.current;
    if (delegId) cargarDatosDelegacion(delegId);
  }

  // ── Derivados ──────────────────────────────────────────
  const usuariosConRecurso = useMemo(() => {
    const ids = new Set();
    recursos.forEach(r => (r.oficiales ?? []).forEach(o => ids.add(o.user_id)));
    return ids;
  }, [recursos]);

  const usuariosDisponibles = useMemo(() => {
    if (!recursoSeleccionado) return [];
    const txt = busqueda.toLowerCase().trim();
    return usuarios.filter(u => {
      const libre = !usuariosConRecurso.has(u.id);
      const misma = u.delegation_id === recursoSeleccionado.delegation_id;
      const busq  = !txt ||
        `${u.nombre ?? ""} ${u.apellido1 ?? ""} ${u.apellido2 ?? ""}`.toLowerCase().includes(txt) ||
        u.cedula?.toLowerCase().includes(txt);
      return libre && misma && busq;
    });
  }, [usuarios, recursoSeleccionado, usuariosConRecurso, busqueda]);

  // ── Helpers ────────────────────────────────────────────
  function getNombreTipo(id)   { return tiposRecurso.find(t => t.id === id)?.nombre ?? "—"; }
  function getNombreEscuad(id) { return escuadras.find(e => e.id === id)?.nombre ?? "Sin escuadra"; }
  function tipoIcono(id) {
    const d = subdelegaciones.find(d => d.id === id);
    return d?.delegation_type === "central" ? "🏛️" : "📍";
  }
  function nombreSubdeleg(id) {
    return subdelegaciones.find(d => d.id === id)?.nombre ?? "—";
  }

  // ── Operaciones ────────────────────────────────────────
  const seleccionar = (r) => {
    setRecursoSeleccionado(r);
    setEscuadraId(r.squad_id ?? "");
    setBusqueda("");
    setError("");
  };

  async function agregarOficial(u) {
    if (!recursoSeleccionado) return;
    setLoading(true); setError("");
    try {
      const { error: err } = await supabase.rpc("asignar_oficial_a_recurso", {
        p_resource_id: recursoSeleccionado.id,
        p_user_id:     u.id,
        p_squad_id:    escuadraId || null,
      });
      if (err) throw new Error(err.message);
      recargar(); // FIX: sin await — refresco directo por ref
    } catch (err) { setError("Error: " + err.message); }
    finally { setLoading(false); }
  }

  async function removerOficial(o) {
    if (!recursoSeleccionado) return;
    if (!confirm(`¿Remover a ${o.nombre} ${o.apellido1} del recurso?`)) return;
    setLoading(true); setError("");
    try {
      const { error: err } = await supabase.rpc("remover_oficial_de_recurso", {
        p_resource_id: recursoSeleccionado.id,
        p_user_id:     o.user_id,
      });
      if (err) throw new Error(err.message);
      recargar();
    } catch (err) { setError("Error: " + err.message); }
    finally { setLoading(false); }
  }

  async function guardarEscuadra() {
    if (!recursoSeleccionado) return;
    setLoading(true); setError("");
    try {
      const { error: err } = await supabase.from("resources")
        .update({ squad_id: escuadraId || null, actualizado: new Date().toISOString() })
        .eq("id", recursoSeleccionado.id);
      if (err) throw new Error(err.message);
      recargar();
    } catch (err) { setError("Error: " + err.message); }
    finally { setLoading(false); }
  }

  async function liberarRecurso() {
    if (!recursoSeleccionado) return;
    if (!confirm(
      `¿Liberar ${recursoSeleccionado.nombre_recurso}?\nSe removerán todos los funcionarios y el recurso quedará disponible.`
    )) return;
    setLoading(true); setError("");
    try {
      const { error: err } = await supabase.rpc("liberar_recurso", {
        p_resource_id: recursoSeleccionado.id,
      });
      if (err) throw new Error(err.message);
      setRecursoSeleccionado(null);
      setEscuadraId("");
      recargar();
    } catch (err) { setError("Error: " + err.message); }
    finally { setLoading(false); }
  }

  // ── Reubicar recurso (supervisor) ─────────────────────
  async function buscarRecursoParaReubicar() {
    const texto = busquedaRecurso.trim();
    if (texto.length < 3) { setErrorReubicar("Ingrese al menos 3 caracteres."); return; }
    setBuscandoRecurso(true);
    setErrorReubicar(""); setSuccessReubicar(""); setResultadosRecurso([]);
    try {
      // Buscar recursos por nombre, indicativo o unidad en toda la cantonal
      // La cantonal del supervisor se obtiene via parent_delegation_id de su delegación
      const { data: miDeleg } = await supabase
        .from("delegations")
        .select("parent_delegation_id")
        .eq("id", userData.delegation_id).single();

      const cantonalId = miDeleg?.parent_delegation_id;
      if (!cantonalId) { setErrorReubicar("No se pudo determinar la delegación cantonal."); return; }

      // Obtener scope cantonal completo
      const { data: scope } = await supabase
        .rpc("get_delegation_scope", { p_delegation_id: cantonalId });
      const scopeIds = (scope ?? []).map(d => d.id);

      // Buscar recursos en ese scope que no sean de la delegación actual
      const { data: recs, error: err } = await supabase
        .from("resources")
        .select("id, nombre_recurso, indicativo, unidad, delegation_id, estado")
        .in("delegation_id", scopeIds)
        .neq("delegation_id", userData.delegation_id)
        .eq("estado", "activo")
        .or(`nombre_recurso.ilike.%${texto}%,indicativo.ilike.%${texto}%,unidad.ilike.%${texto}%`);
      if (err) throw err;

      if (!recs?.length) {
        setErrorReubicar("No se encontraron recursos disponibles con ese criterio.");
      } else {
        setResultadosRecurso(recs);
      }
    } catch (err) {
      setErrorReubicar("Error: " + err.message);
    } finally {
      setBuscandoRecurso(false);
    }
  }

  async function reubicarRecurso(recurso) {
    if (!confirm(
      `¿Reubicar ${recurso.nombre_recurso} a tu delegación?\nEl recurso quedará disponible para asignar personal en tu unidad.`
    )) return;
    setLoading(true); setErrorReubicar("");
    try {
      const { error: err } = await supabase
        .from("resources")
        .update({ delegation_id: userData.delegation_id, actualizado: new Date().toISOString() })
        .eq("id", recurso.id);
      if (err) throw err;
      setSuccessReubicar(`${recurso.nombre_recurso} reubicado en tu delegación.`);
      setBusquedaRecurso(""); setResultadosRecurso([]);
      recargar();
    } catch (err) {
      setErrorReubicar("Error: " + err.message);
    } finally {
      setLoading(false); }
  }

  // ── Render ─────────────────────────────────────────────
  const delegActiva = delegActivaRef.current ||
    (esDistrital || esSupervisor ? userData?.delegation_id : "");

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: 0 }}>Gestión Operativa de Recursos</h1>
        <p style={{ margin: "5px 0 0", color: "#64748b" }}>
          Asignación de personal y escuadra a recursos operativos
        </p>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {/* Admin: 3 niveles */}
      {esAdmin && (
        <div style={filtrosCardStyle}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px" }}>
            <div style={filtroItemStyle}>
              <label style={labelStyle}>Región</label>
              <select value={filtroRegion}
                onChange={e => { setFiltroRegion(e.target.value); setFiltroCantonal(""); }}
                style={inputStyle}>
                <option value="">Seleccione región...</option>
                {regiones.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div style={filtroItemStyle}>
              <label style={labelStyle}>Delegación Cantonal</label>
              <select value={filtroCantonal}
                onChange={e => setFiltroCantonal(e.target.value)}
                disabled={!filtroRegion} style={inputStyle}>
                <option value="">Seleccione cantonal...</option>
                {cantonales.filter(c => c.region_id === filtroRegion).map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} ({c.codigo})</option>
                ))}
              </select>
            </div>
            <div style={filtroItemStyle}>
              <label style={labelStyle}>Central / Distrital</label>
              <select value={filtroSubdeleg}
                onChange={e => setFiltroSubdeleg(e.target.value)}
                disabled={!filtroCantonal} style={inputStyle}>
                <option value="">Seleccione...</option>
                {subdelegaciones.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.delegation_type === "central" ? "🏛️" : "📍"} {d.nombre} ({d.codigo})
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!filtroSubdeleg && <p style={hintStyle}>Seleccione región, cantonal y central o distrital.</p>}
        </div>
      )}

      {/* Cantonal: solo subdelegación */}
      {esCantonal && (
        <div style={filtrosCardStyle}>
          <div style={filtroItemStyle}>
            <label style={labelStyle}>Central / Delegación Distrital</label>
            <select value={filtroSubdeleg}
              onChange={e => setFiltroSubdeleg(e.target.value)}
              style={inputStyle}>
              <option value="">Seleccione central o distrital...</option>
              {subdelegaciones.map(d => (
                <option key={d.id} value={d.id}>
                  {d.delegation_type === "central" ? "🏛️" : "📍"} {d.nombre} ({d.codigo})
                </option>
              ))}
            </select>
          </div>
          {!filtroSubdeleg && <p style={hintStyle}>Seleccione la central o distrital para ver sus recursos.</p>}
        </div>
      )}

      {/* Distrital: badge fijo */}
      {esDistrital && (
        <div style={distritalbadgeStyle}>
          {tipoIcono(userData?.delegation_id)}{" "}
          {nombreSubdeleg(userData?.delegation_id)}
          <span style={{ fontSize:"12px", color:"#64748b", marginLeft:"8px" }}>— su delegación asignada</span>
        </div>
      )}

      {/* Supervisor: badge + reubicar recurso */}
      {esSupervisor && (
        <>
          <div style={supBadgeStyle}>
            Mostrando recursos de tu delegación
          </div>

          {/* Panel reubicar recurso */}
          <div style={reubicarPanelStyle}>
            <h3 style={{ margin:"0 0 4px", fontSize:"14px", fontWeight:"600", color:"#1e293b" }}>
              Reubicar Recurso
            </h3>
            <p style={{ margin:"0 0 10px", fontSize:"12px", color:"#64748b" }}>
              Busca un recurso de otra delegación de tu cantonal para traerlo a tu unidad
            </p>
            <div style={{ display:"flex", gap:"8px" }}>
              <input value={busquedaRecurso}
                onChange={e => { setBusquedaRecurso(e.target.value); setErrorReubicar(""); setSuccessReubicar(""); }}
                onKeyDown={e => e.key === "Enter" && buscarRecursoParaReubicar()}
                placeholder="Nombre, indicativo o unidad..."
                style={{ ...inputStyle, flex:1 }} />
              <button onClick={buscarRecursoParaReubicar} disabled={buscandoRecurso}
                style={btnSearchStyle}>
                {buscandoRecurso ? "..." : "Buscar"}
              </button>
            </div>
            {errorReubicar   && <div style={errStyle}>{errorReubicar}</div>}
            {successReubicar && <div style={okStyle}>{successReubicar}</div>}
            {resultadosRecurso.length > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginTop:"10px" }}>
                {resultadosRecurso.map(r => (
                  <div key={r.id} style={reubicarCardStyle}>
                    <div>
                      <strong style={{ fontSize:"13px" }}>{r.nombre_recurso}</strong>
                      <div style={{ fontSize:"12px", color:"#64748b" }}>
                        {r.indicativo} | {r.unidad}
                      </div>
                    </div>
                    <button onClick={() => reubicarRecurso(r)} disabled={loading}
                      style={btnReubicarStyle}>
                      Traer aquí
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Sin datos */}
      {delegActiva && recursos.length === 0 && !loading && (
        <div style={filtrosCardStyle}>
          <p style={{ color:"#64748b", margin:0, textAlign:"center" }}>
            No hay recursos en esta delegación.
          </p>
        </div>
      )}

      {!delegActiva && !esSupervisor && (
        <div style={filtrosCardStyle}>
          <p style={{ color:"#64748b", margin:0, textAlign:"center" }}>
            Seleccione una delegación para ver sus recursos.
          </p>
        </div>
      )}

      {/* Layout principal */}
      {recursos.length > 0 && (
        <div style={mainLayoutStyle}>

          {/* Sidebar */}
          <div style={sidebarStyle}>
            <div style={sidebarTitleStyle}>
              {filtroSubdeleg
                ? `${tipoIcono(filtroSubdeleg)} ${nombreSubdeleg(filtroSubdeleg)}`
                : "Recursos"
              }
            </div>
            {recursos.map(r => (
              <div key={r.id} onClick={() => seleccionar(r)}
                style={{ ...sidebarItemStyle, ...(recursoSeleccionado?.id === r.id ? sidebarActiveStyle : {}) }}>
                <strong style={{ fontSize:"13px" }}>{r.nombre_recurso || r.indicativo}</strong>
                <div style={{ fontSize:"12px", color:"#64748b", marginTop:"2px" }}>
                  {getNombreTipo(r.resource_type_id)} | {r.unidad}
                </div>
                <div style={{ fontSize:"11px", color:"#94a3b8" }}>{getNombreEscuad(r.squad_id)}</div>
                <span style={{
                  display:"inline-block", padding:"2px 8px", borderRadius:"10px",
                  fontSize:"11px", fontWeight:"500", marginTop:"4px",
                  background: r.estado === "activo" ? "#dcfce7" : r.estado === "mantenimiento" ? "#fef9c3" : "#fee2e2",
                  color:      r.estado === "activo" ? "#166534" : r.estado === "mantenimiento" ? "#854d0e" : "#991b1b",
                }}>{r.estado}</span>
                <div style={{ fontSize:"11px", color:"#94a3b8" }}>
                  {(r.oficiales ?? []).length} oficial(es)
                </div>
              </div>
            ))}
          </div>

          {/* Contenido */}
          {!recursoSeleccionado ? (
            <div style={emptyContentStyle}>
              <p style={{ color:"#94a3b8" }}>Seleccione un recurso de la lista</p>
            </div>
          ) : (
            <div style={contentGridStyle}>

              {/* Disponibles */}
              <div style={columnStyle}>
                <h3 style={columnTitleStyle}>Disponibles para asignar</h3>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar funcionario..." style={inputStyle} />
                <div style={{ marginTop:"10px", display:"flex", flexDirection:"column", gap:"8px" }}>
                  {usuariosDisponibles.length === 0 ? (
                    <p style={emptyStyle}>
                      {busqueda ? "Sin resultados." : "No hay funcionarios disponibles."}
                    </p>
                  ) : usuariosDisponibles.map(u => (
                    <div key={u.id} style={userCardStyle}>
                      <div>
                        <strong style={{ fontSize:"13px" }}>{u.nombre} {u.apellido1}</strong>
                        <div style={{ fontSize:"12px", color:"#64748b" }}>{u.rol}</div>
                      </div>
                      <button onClick={() => agregarOficial(u)} disabled={loading}
                        style={btnAddStyle}>Asignar</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asignados */}
              <div style={columnStyle}>
                <h3 style={columnTitleStyle}>
                  Personal asignado ({(recursoSeleccionado.oficiales ?? []).length})
                </h3>
                {(recursoSeleccionado.oficiales ?? []).length === 0 ? (
                  <p style={emptyStyle}>Sin personal asignado.</p>
                ) : (recursoSeleccionado.oficiales ?? []).map(o => (
                  <div key={o.user_id} style={userCardStyle}>
                    <div>
                      <strong style={{ fontSize:"13px" }}>{o.nombre} {o.apellido1}</strong>
                      <div style={{ fontSize:"12px", color:"#64748b" }}>{o.rol}</div>
                    </div>
                    <button onClick={() => removerOficial(o)} disabled={loading}
                      style={btnRemoveStyle}>Remover</button>
                  </div>
                ))}
              </div>

              {/* Configuración */}
              <div style={columnStyle}>
                <h3 style={columnTitleStyle}>Configuración del recurso</h3>
                <div style={infoBoxStyle}>
                  {[
                    ["Recurso",    recursoSeleccionado.nombre_recurso],
                    ["Tipo",       getNombreTipo(recursoSeleccionado.resource_type_id)],
                    ["Unidad",     recursoSeleccionado.unidad],
                    ["Indicativo", recursoSeleccionado.indicativo],
                    ["Estado",     recursoSeleccionado.estado],
                  ].map(([k, v]) => (
                    <div key={k} style={infoRowStyle}>
                      <span style={{ color:"#64748b" }}>{k}</span>
                      <strong>{v}</strong>
                    </div>
                  ))}
                </div>
                <div style={filtroItemStyle}>
                  <label style={labelStyle}>Asignar escuadra</label>
                  <select value={escuadraId} onChange={e => setEscuadraId(e.target.value)}
                    style={inputStyle}>
                    <option value="">Sin escuadra</option>
                    {escuadras.map(e => (
                      <option key={e.id} value={e.id}>{e.codigo} - {e.nombre}</option>
                    ))}
                  </select>
                </div>
                <button onClick={guardarEscuadra} disabled={loading} style={btnPrimaryStyle}>
                  Guardar escuadra
                </button>
                <button onClick={liberarRecurso} disabled={loading} style={btnDangerStyle}>
                  🔓 Liberar recurso completo
                </button>
                <p style={{ fontSize:"11px", color:"#94a3b8", margin:0, textAlign:"center" }}>
                  Remueve todos los funcionarios y deja el recurso disponible
                </p>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Estilos
const pageStyle          = { padding:"20px", fontFamily:"system-ui, sans-serif" };
const headerStyle        = { marginBottom:"20px" };
const errorStyle         = { background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"8px", padding:"10px 16px", fontSize:"13px", color:"#dc2626", marginBottom:"16px" };
const filtrosCardStyle   = { background:"white", padding:"16px", borderRadius:"12px", boxShadow:"0 2px 6px rgba(0,0,0,0.06)", marginBottom:"20px" };
const filtroItemStyle    = { display:"flex", flexDirection:"column", gap:"4px" };
const distritalbadgeStyle= { background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"10px", padding:"10px 16px", marginBottom:"16px", fontSize:"14px", color:"#166534", fontWeight:"500", display:"flex", alignItems:"center" };
const supBadgeStyle      = { background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:"10px", padding:"10px 16px", marginBottom:"16px", fontSize:"13px", color:"#1e40af" };
const reubicarPanelStyle = { background:"white", padding:"18px", borderRadius:"12px", boxShadow:"0 2px 6px rgba(0,0,0,0.06)", marginBottom:"20px" };
const reubicarCardStyle  = { border:"1px solid #dbeafe", borderRadius:"10px", padding:"11px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#eff6ff" };
const hintStyle          = { margin:"10px 0 0", fontSize:"13px", color:"#94a3b8", textAlign:"center" };
const mainLayoutStyle    = { display:"grid", gridTemplateColumns:"240px 1fr", gap:"20px", alignItems:"start" };
const sidebarStyle       = { background:"white", borderRadius:"12px", boxShadow:"0 2px 6px rgba(0,0,0,0.06)", overflow:"hidden" };
const sidebarTitleStyle  = { padding:"12px 16px", fontSize:"12px", fontWeight:"600", color:"#475569", textTransform:"uppercase", background:"#f8fafc", borderBottom:"1px solid #f1f5f9" };
const sidebarItemStyle   = { padding:"14px 16px", cursor:"pointer", borderBottom:"1px solid #f1f5f9", display:"flex", flexDirection:"column", gap:"3px" };
const sidebarActiveStyle = { background:"#f0f9ff", borderLeft:"3px solid #3b82f6" };
const contentGridStyle   = { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"16px" };
const emptyContentStyle  = { display:"flex", alignItems:"center", justifyContent:"center", minHeight:"300px", background:"white", borderRadius:"12px", boxShadow:"0 2px 6px rgba(0,0,0,0.06)" };
const columnStyle        = { background:"white", padding:"20px", borderRadius:"12px", boxShadow:"0 2px 6px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column", gap:"12px" };
const columnTitleStyle   = { margin:0, fontSize:"14px", fontWeight:"600", color:"#1e293b" };
const labelStyle         = { fontSize:"13px", fontWeight:"500", color:"#374151" };
const inputStyle         = { padding:"9px 12px", border:"1px solid #d1d5db", borderRadius:"8px", fontSize:"14px", width:"100%", boxSizing:"border-box", outline:"none" };
const userCardStyle      = { border:"1px solid #e5e7eb", borderRadius:"10px", padding:"12px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#fafafa" };
const emptyStyle         = { color:"#94a3b8", fontSize:"13px", textAlign:"center", padding:"20px 0" };
const infoBoxStyle       = { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"10px", padding:"14px", display:"flex", flexDirection:"column", gap:"6px" };
const infoRowStyle       = { display:"flex", justifyContent:"space-between", fontSize:"13px", padding:"3px 0", borderBottom:"1px solid #f1f5f9" };
const btnAddStyle        = { padding:"5px 12px", background:"#1e293b", color:"white", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"12px", whiteSpace:"nowrap" };
const btnRemoveStyle     = { padding:"5px 12px", background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:"6px", cursor:"pointer", fontSize:"12px", whiteSpace:"nowrap" };
const btnSearchStyle     = { padding:"9px 14px", background:"#475569", color:"white", border:"none", borderRadius:"8px", cursor:"pointer", fontSize:"13px", whiteSpace:"nowrap" };
const btnReubicarStyle   = { padding:"5px 12px", background:"#2563eb", color:"white", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"12px", whiteSpace:"nowrap" };
const btnPrimaryStyle    = { padding:"10px", background:"#1e293b", color:"white", border:"none", borderRadius:"8px", cursor:"pointer", fontWeight:"500", fontSize:"14px" };
const btnDangerStyle     = { padding:"10px", background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:"8px", cursor:"pointer", fontWeight:"500", fontSize:"14px" };
const errStyle           = { background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"8px", padding:"8px 12px", fontSize:"13px", color:"#dc2626", marginTop:"8px" };
const okStyle            = { background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"8px", padding:"8px 12px", fontSize:"13px", color:"#166534", marginTop:"8px" };

export default GestionRecurso;