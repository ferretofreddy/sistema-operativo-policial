// frontend/src/modules/administracion/escuadras/GestionEscuadra.jsx
// V2.1A.1 — Filtros inteligentes según nivel del rol
//
// admin:                    Región → Cantonal → Subdelegación (selección completa)
// jefatura / UO cantonal:  Subdelegación solo (cantonal implícita desde su delegation_id)
// jefatura_dist / UO_dist: Subdelegación solo (cantonal implícita desde parent_delegation_id)
// supervisor:              Sin filtros — directo a su escuadra

import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { AuthContext } from "../../../context/AuthContext";
import {
  RegionRepository,
  DelegationRepository,
} from "../../../core";
import { supabase } from "../../../core/providers/supabase/SupabaseProvider";

const ROLES_GESTION_AMPLIA = [
  "admin","jefatura","unidad_operativa",
  "jefatura_distrital","unidad_operativa_distrital",
];

function GestionEscuadra() {
  const { userData } = useContext(AuthContext);
  const rol          = userData?.rol ?? "";
  const esAdmin      = rol === "admin";
  const esAmplio     = ROLES_GESTION_AMPLIA.includes(rol);
  const esSupervisor = rol === "supervisor";

  // Solo admin necesita seleccionar región y cantonal
  // Los demás roles tienen su cantonal implícita
  const necesitaFiltroCompleto = esAdmin;

  // — Catálogos (admin) ———————————————————————————————
  const [regiones,   setRegiones]   = useState([]);
  const [cantonales, setCantonales] = useState([]);

  // — Subdelegaciones ————————————————————————————————
  const [subdelegaciones, setSubdelegaciones] = useState([]);
  const [cantonalActiva,  setCantonalActiva]  = useState(null); // {id, nombre}

  // — Filtros visibles ———————————————————————————————
  const [filtroRegion,   setFiltroRegion]   = useState("");
  const [filtroCantonal, setFiltroCantonal] = useState("");
  const [filtroSubdeleg, setFiltroSubdeleg] = useState("");

  // — Datos operativos ———————————————————————————————
  const [escuadras,      setEscuadras]      = useState([]);
  const [usuarios,       setUsuarios]       = useState([]);
  const [escuadraActiva, setEscuadraActiva] = useState(null);

  // — Reasignación ———————————————————————————————————
  const [busquedaReasig,   setBusquedaReasig]   = useState("");
  const [resultadosReasig, setResultadosReasig] = useState([]);
  const [buscandoReasig,   setBuscandoReasig]   = useState(false);
  const [errorReasig,      setErrorReasig]      = useState("");
  const [successReasig,    setSuccessReasig]    = useState("");

  // — UI —————————————————————————————————————————————
  const [busquedaDisp, setBusquedaDisp] = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  // — Carga inicial según rol ————————————————————————
  useEffect(() => {
    if (!userData) return;

    if (esAdmin) {
      cargarCatalogosAdmin();

    } else if (["jefatura","unidad_operativa"].includes(rol)) {
      // Cantonal: su delegation_id ES la cantonal
      const cantonalId = userData.delegation_id;
      setCantonalActiva({ id: cantonalId });
      cargarSubdelegacionesDe(cantonalId);

    } else if (["jefatura_distrital","unidad_operativa_distrital"].includes(rol)) {
      // Distrital: obtener cantonal padre
      resolverCantonalDesdeDistrital();

    } else if (esSupervisor) {
      cargarEscuadraSupervisor();
    }
  }, [userData]);

  async function cargarCatalogosAdmin() {
    try {
      const [regs, cants] = await Promise.all([
        RegionRepository.getActivas(),
        DelegationRepository.getCantonales(),
      ]);
      setRegiones(regs   ?? []);
      setCantonales(cants ?? []);
    } catch (err) {
      setError("Error cargando catálogos: " + err.message);
    }
  }

  async function resolverCantonalDesdeDistrital() {
    try {
      const { data, error: err } = await supabase
        .from("delegations")
        .select("id, nombre, parent_delegation_id")
        .eq("id", userData.delegation_id)
        .single();
      if (err) throw err;
      if (data?.parent_delegation_id) {
        setCantonalActiva({ id: data.parent_delegation_id });
        await cargarSubdelegacionesDe(data.parent_delegation_id);
      }
    } catch (err) {
      setError("Error resolviendo cantonal: " + err.message);
    }
  }

  async function cargarSubdelegacionesDe(cantonalId) {
    try {
      const data = await DelegationRepository.getSubdelegaciones(cantonalId);
      setSubdelegaciones(data ?? []);
    } catch (err) {
      setError("Error cargando subdelegaciones: " + err.message);
    }
  }

  async function cargarEscuadraSupervisor() {
    if (!userData?.squad_id) return;
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("squads").select("*")
        .eq("id", userData.squad_id).single();
      if (err) throw err;
      if (data) {
        setEscuadras([data]);
        setEscuadraActiva(data);
        await cargarPersonal(data.delegation_id);
      }
    } catch (err) {
      setError("Error cargando escuadra: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // — Subdelegaciones admin: al cambiar cantonal ———————
  useEffect(() => {
    if (!esAdmin || !filtroCantonal) {
      if (esAdmin) {
        setSubdelegaciones([]);
        setFiltroSubdeleg("");
        setEscuadras([]);
        setEscuadraActiva(null);
      }
      return;
    }
    setCantonalActiva({ id: filtroCantonal });
    cargarSubdelegacionesDe(filtroCantonal);
    setFiltroSubdeleg(""); setEscuadras([]); setEscuadraActiva(null);
  }, [filtroCantonal]);

  // — Escuadras al cambiar subdelegación ————————————————
  useEffect(() => {
    if (!filtroSubdeleg) {
      if (necesitaFiltroCompleto) { setEscuadras([]); setEscuadraActiva(null); }
      return;
    }
    cargarEscuadrasSubdeleg(filtroSubdeleg);
  }, [filtroSubdeleg]);

  async function cargarEscuadrasSubdeleg(delegId) {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("squads").select("*")
        .eq("delegation_id", delegId).eq("estado","activo").order("nombre");
      if (err) throw err;
      setEscuadras(data ?? []);
      await cargarPersonal(delegId);
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function cargarPersonal(delegId) {
    try {
      const { data, error: err } = await supabase
        .from("users")
        .select("id, nombre, apellido1, apellido2, rol, squad_id")
        .eq("delegation_id", delegId)
        .eq("estado_usuario","activo")
        .in("rol",["supervisor","agente"])
        .order("apellido1");
      if (err) throw err;
      setUsuarios(data ?? []);
    } catch (err) {
      console.error("[GestionEscuadra]", err.message);
    }
  }

  const recargar = useCallback(async () => {
    if (esSupervisor) {
      await cargarEscuadraSupervisor();
    } else {
      const delegId = filtroSubdeleg ||
        (escuadraActiva?.delegation_id ?? null);
      if (delegId) await cargarEscuadrasSubdeleg(delegId);
      if (escuadraActiva) {
        const { data } = await supabase
          .from("squads").select("*").eq("id",escuadraActiva.id).single();
        if (data) setEscuadraActiva(data);
      }
    }
  }, [esSupervisor, filtroSubdeleg, escuadraActiva?.id]);

  // — Derivados ——————————————————————————————————————
  const asignados = useMemo(() => {
    if (!escuadraActiva) return [];
    return usuarios.filter(u => u.squad_id === escuadraActiva.id);
  }, [usuarios, escuadraActiva]);

  const disponibles = useMemo(() => {
    if (!escuadraActiva) return [];
    const txt = busquedaDisp.toLowerCase().trim();
    return usuarios.filter(u => {
      const libre = !u.squad_id;
      const busq  = !txt ||
        `${u.nombre} ${u.apellido1} ${u.apellido2}`.toLowerCase().includes(txt);
      return libre && busq;
    });
  }, [usuarios, escuadraActiva, busquedaDisp]);

  const supervisoresEnEscuadra = useMemo(() =>
    asignados.filter(u => u.rol === "supervisor"),
  [asignados]);

  // — Helpers ————————————————————————————————————————
  function nombreSubdeleg(id) {
    return subdelegaciones.find(d => d.id === id)?.nombre ?? "—";
  }
  function iconoTipo(id) {
    const d = subdelegaciones.find(d => d.id === id);
    return d?.delegation_type === "central" ? "🏛️" : "📍";
  }

  // — Operaciones ————————————————————————————————————
  async function asignar(usuario) {
    if (!escuadraActiva) return;
    setLoading(true); setError("");
    try {
      const { error: err } = await supabase
        .from("users").update({ squad_id: escuadraActiva.id }).eq("id",usuario.id);
      if (err) throw err;
      await recargar();
    } catch (err) { setError("Error: " + err.message); }
    finally { setLoading(false); }
  }

  async function remover(usuario) {
    if (!escuadraActiva) return;
    if (!confirm(`¿Remover a ${usuario.nombre} ${usuario.apellido1} de la escuadra?`)) return;
    setLoading(true); setError("");
    try {
      if (escuadraActiva.supervisor_id === usuario.id) {
        await supabase.from("squads")
          .update({ supervisor_id: null }).eq("id",escuadraActiva.id);
      }
      const { error: err } = await supabase
        .from("users").update({ squad_id: null }).eq("id",usuario.id);
      if (err) throw err;
      await recargar();
    } catch (err) { setError("Error: " + err.message); }
    finally { setLoading(false); }
  }

  async function guardarSupervisor(supervisorId) {
    if (!escuadraActiva) return;
    setLoading(true); setError("");
    try {
      const { error: err } = await supabase
        .from("squads").update({ supervisor_id: supervisorId || null })
        .eq("id",escuadraActiva.id);
      if (err) throw err;
      await recargar();
    } catch (err) { setError("Error: " + err.message); }
    finally { setLoading(false); }
  }

  async function buscarParaReasignar() {
    const texto = busquedaReasig.trim();
    if (texto.length < 3) { setErrorReasig("Ingrese al menos 3 caracteres."); return; }
    setBuscandoReasig(true);
    setErrorReasig(""); setSuccessReasig(""); setResultadosReasig([]);
    try {
      const { data, error: err } = await supabase
        .rpc("buscar_usuario_para_reasignar", { termino: texto });
      if (err) throw err;
      const filtrados = (data ?? []).filter(u =>
        ["supervisor","agente"].includes(u.rol) &&
        u.squad_id && u.squad_id !== escuadraActiva?.id
      );
      if (!filtrados.length) {
        setErrorReasig("No se encontró personal con escuadra diferente a la actual.");
      } else {
        setResultadosReasig(filtrados);
      }
    } catch (err) { setErrorReasig("Error: " + err.message); }
    finally { setBuscandoReasig(false); }
  }

  async function reasignarAqui(usuario) {
    if (!escuadraActiva) return;
    if (!confirm(
      `¿Reasignar a ${usuario.nombre} ${usuario.apellido1} a ${escuadraActiva.nombre}?\nSe moverá de su escuadra actual.`
    )) return;
    setLoading(true); setErrorReasig("");
    try {
      const { error: err } = await supabase
        .from("users").update({ squad_id: escuadraActiva.id }).eq("id",usuario.id);
      if (err) throw err;
      setSuccessReasig(`${usuario.nombre} ${usuario.apellido1} reasignado a ${escuadraActiva.nombre}.`);
      setBusquedaReasig(""); setResultadosReasig([]);
      await recargar();
    } catch (err) { setErrorReasig("Error: " + err.message); }
    finally { setLoading(false); }
  }

  // — Render ——————————————————————————————————————————

  if (esSupervisor && !userData?.squad_id) {
    return (
      <div style={pageStyle}>
        <div style={errorBannerStyle}>
          No tiene escuadra asignada. Contacte a su jefatura.
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: 0 }}>Gestión Operativa de Escuadras</h1>
        <p style={{ margin: "5px 0 0", color: "#64748b" }}>
          Asignación y cobertura de personal
        </p>
      </div>

      {error && <div style={errorBannerStyle}>{error}</div>}

      {/* — FILTROS SEGÚN ROL — */}

      {/* Admin: región + cantonal + subdelegación */}
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
                    {d.delegation_type==="central"?"🏛️":"📍"} {d.nombre} ({d.codigo})
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!filtroSubdeleg && (
            <p style={hintStyle}>Seleccione región, cantonal y central o distrital.</p>
          )}
        </div>
      )}

      {/* Jefatura/UO cantonal y distritales: solo subdelegación */}
      {esAmplio && !esAdmin && (
        <div style={filtrosCardStyle}>
          <div style={filtroItemStyle}>
            <label style={labelStyle}>Central / Delegación Distrital</label>
            <select value={filtroSubdeleg}
              onChange={e => setFiltroSubdeleg(e.target.value)}
              style={inputStyle}>
              <option value="">Seleccione central o distrital...</option>
              {subdelegaciones.map(d => (
                <option key={d.id} value={d.id}>
                  {d.delegation_type==="central"?"🏛️":"📍"} {d.nombre} ({d.codigo})
                </option>
              ))}
            </select>
          </div>
          {!filtroSubdeleg && (
            <p style={hintStyle}>Seleccione la central o distrital para ver sus escuadras.</p>
          )}
        </div>
      )}

      {/* Supervisor: badge de su escuadra */}
      {esSupervisor && escuadraActiva && (
        <div style={escuadraBadgeStyle}>
          Mi escuadra: <strong>{escuadraActiva.nombre}</strong>
          <span style={codigoBadgeStyle}>{escuadraActiva.codigo}</span>
        </div>
      )}

      {/* Sin escuadras disponibles */}
      {esAmplio && filtroSubdeleg && escuadras.length === 0 && !loading && (
        <div style={filtrosCardStyle}>
          <p style={{ color:"#64748b", margin:0, textAlign:"center" }}>
            No hay escuadras activas en esta delegación.
          </p>
        </div>
      )}

      {/* — LAYOUT PRINCIPAL — */}
      {escuadras.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns: esAmplio ? "200px 1fr" : "1fr", gap:"20px", alignItems:"start" }}>

          {/* Sidebar (roles amplios) */}
          {esAmplio && (
            <div style={sidebarStyle}>
              <div style={sidebarTitleStyle}>
                {iconoTipo(filtroSubdeleg)} {nombreSubdeleg(filtroSubdeleg)}
              </div>
              {escuadras.map(e => (
                <div key={e.id}
                  onClick={() => { setEscuadraActiva(e); setBusquedaDisp(""); setResultadosReasig([]); }}
                  style={{ ...sidebarItemStyle, ...(escuadraActiva?.id===e.id ? sidebarActiveStyle : {}) }}>
                  <strong style={{ fontSize:"13px" }}>{e.codigo}</strong>
                  <div style={{ fontSize:"13px", marginTop:"2px" }}>{e.nombre}</div>
                  <div style={{ marginTop:"4px" }}>
                    <span style={badgeMiniStyle}>
                      {usuarios.filter(u => u.squad_id===e.id).length} oficiales
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contenido */}
          {!escuadraActiva ? (
            <div style={emptyContentStyle}>
              <p style={{ color:"#94a3b8" }}>Seleccione una escuadra</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>

              {/* Fila 1: Disponibles + Asignados */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>

                <div style={panelStyle}>
                  <h3 style={panelTitleStyle}>Personal Disponible</h3>
                  <p style={panelSubStyle}>Sin escuadra en esta delegación</p>
                  <input value={busquedaDisp}
                    onChange={e => setBusquedaDisp(e.target.value)}
                    placeholder="Buscar por nombre..." style={inputStyle} />
                  <div style={listaStyle}>
                    {disponibles.length === 0 ? (
                      <p style={emptyStyle}>
                        {busquedaDisp ? "Sin resultados." : "No hay personal disponible."}
                      </p>
                    ) : disponibles.map(u => (
                      <div key={u.id} style={userCardStyle}>
                        <div>
                          <strong style={{ fontSize:"13px" }}>{u.nombre} {u.apellido1}</strong>
                          <div style={{ fontSize:"12px", color:"#64748b" }}>{u.rol}</div>
                        </div>
                        <button onClick={() => asignar(u)} disabled={loading} style={btnAddStyle}>
                          Agregar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={panelStyle}>
                  <h3 style={panelTitleStyle}>Asignados ({asignados.length})</h3>
                  <p style={panelSubStyle}>Personal activo en esta escuadra</p>
                  <div style={listaStyle}>
                    {asignados.length === 0 ? (
                      <p style={emptyStyle}>Sin personal asignado.</p>
                    ) : asignados.map(u => (
                      <div key={u.id} style={userCardStyle}>
                        <div>
                          <strong style={{ fontSize:"13px" }}>{u.nombre} {u.apellido1}</strong>
                          <div style={{ fontSize:"12px", color:"#64748b" }}>{u.rol}</div>
                          {escuadraActiva.supervisor_id === u.id && (
                            <span style={supBadgeStyle}>SUPERVISOR</span>
                          )}
                        </div>
                        <button onClick={() => remover(u)} disabled={loading} style={btnRemoveStyle}>
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fila 2: Cobertura + Supervisor + Info */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"16px" }}>

                <div style={panelStyle}>
                  <h3 style={panelTitleStyle}>Cobertura Temporal</h3>
                  <p style={panelSubStyle}>Reasignar desde otra escuadra</p>
                  <div style={{ display:"flex", gap:"8px" }}>
                    <input value={busquedaReasig}
                      onChange={e => { setBusquedaReasig(e.target.value); setErrorReasig(""); setSuccessReasig(""); }}
                      onKeyDown={e => e.key==="Enter" && buscarParaReasignar()}
                      placeholder="Cédula o nombre..."
                      style={{ ...inputStyle, flex:1 }} />
                    <button onClick={buscarParaReasignar} disabled={buscandoReasig} style={btnSearchStyle}>
                      {buscandoReasig ? "..." : "Buscar"}
                    </button>
                  </div>
                  {errorReasig   && <div style={errStyle}>{errorReasig}</div>}
                  {successReasig && <div style={okStyle}>{successReasig}</div>}
                  {resultadosReasig.map(u => (
                    <div key={u.id} style={reasigCardStyle}>
                      <div>
                        <strong style={{ fontSize:"13px" }}>{u.nombre} {u.apellido1}</strong>
                        <div style={{ fontSize:"12px", color:"#64748b" }}>{u.rol}</div>
                      </div>
                      <button onClick={() => reasignarAqui(u)} disabled={loading} style={btnReasigStyle}>
                        Asignar aquí
                      </button>
                    </div>
                  ))}
                </div>

                <div style={panelStyle}>
                  <h3 style={panelTitleStyle}>Supervisor Encargado</h3>
                  {supervisoresEnEscuadra.length === 0 ? (
                    <p style={emptyStyle}>Asigne un supervisor primero.</p>
                  ) : (
                    <>
                      <select
                        value={escuadraActiva.supervisor_id ?? ""}
                        onChange={e => setEscuadraActiva(prev => ({ ...prev, supervisor_id: e.target.value || null }))}
                        style={inputStyle}>
                        <option value="">Sin supervisor designado</option>
                        {supervisoresEnEscuadra.map(u => (
                          <option key={u.id} value={u.id}>{u.nombre} {u.apellido1}</option>
                        ))}
                      </select>
                      <button onClick={() => guardarSupervisor(escuadraActiva.supervisor_id)}
                        disabled={loading}
                        style={{ ...btnPrimaryStyle, marginTop:"8px" }}>
                        {loading ? "Guardando..." : "Guardar"}
                      </button>
                    </>
                  )}
                </div>

                <div style={panelStyle}>
                  <h3 style={panelTitleStyle}>Información</h3>
                  {[
                    ["Escuadra",     escuadraActiva.nombre],
                    ["Código",       escuadraActiva.codigo],
                    ["Total",        asignados.length + " oficiales"],
                    ["Supervisores", supervisoresEnEscuadra.length],
                    ["Agentes",      asignados.filter(u => u.rol==="agente").length],
                  ].map(([k,v]) => (
                    <div key={k} style={infoRowStyle}>
                      <span style={{ color:"#64748b" }}>{k}</span>
                      <strong>{v}</strong>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// — Estilos ———————————————————————————————————————————————————————————————————
const pageStyle         = { padding:"20px", fontFamily:"system-ui, sans-serif" };
const headerStyle       = { marginBottom:"20px" };
const errorBannerStyle  = { background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"8px", padding:"10px 16px", fontSize:"13px", color:"#dc2626", marginBottom:"16px" };
const filtrosCardStyle  = { background:"white", padding:"16px", borderRadius:"12px", boxShadow:"0 2px 6px rgba(0,0,0,0.06)", marginBottom:"20px" };
const filtroItemStyle   = { display:"flex", flexDirection:"column", gap:"4px" };
const hintStyle         = { margin:"10px 0 0", fontSize:"13px", color:"#94a3b8", textAlign:"center" };
const escuadraBadgeStyle= { display:"flex", alignItems:"center", gap:"10px", background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:"10px", padding:"10px 16px", marginBottom:"16px", fontSize:"14px", color:"#1e40af" };
const codigoBadgeStyle  = { background:"#e0e7ff", color:"#3730a3", padding:"2px 8px", borderRadius:"10px", fontSize:"12px" };
const sidebarStyle      = { background:"white", borderRadius:"12px", boxShadow:"0 2px 6px rgba(0,0,0,0.06)", overflow:"hidden" };
const sidebarTitleStyle = { padding:"12px 16px", fontSize:"12px", fontWeight:"600", color:"#475569", textTransform:"uppercase", background:"#f8fafc", borderBottom:"1px solid #f1f5f9" };
const sidebarItemStyle  = { padding:"13px 16px", cursor:"pointer", borderBottom:"1px solid #f1f5f9" };
const sidebarActiveStyle= { background:"#f0f9ff", borderLeft:"3px solid #3b82f6" };
const badgeMiniStyle    = { background:"#f1f5f9", color:"#475569", padding:"2px 8px", borderRadius:"10px", fontSize:"11px" };
const emptyContentStyle = { display:"flex", alignItems:"center", justifyContent:"center", minHeight:"200px", background:"white", borderRadius:"12px", boxShadow:"0 2px 6px rgba(0,0,0,0.06)" };
const panelStyle        = { background:"white", padding:"18px", borderRadius:"12px", boxShadow:"0 2px 6px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column", gap:"10px" };
const panelTitleStyle   = { margin:0, fontSize:"14px", fontWeight:"600", color:"#1e293b" };
const panelSubStyle     = { margin:0, fontSize:"12px", color:"#94a3b8" };
const listaStyle        = { overflowY:"auto", maxHeight:"240px", display:"flex", flexDirection:"column", gap:"8px", marginTop:"4px" };
const labelStyle        = { fontSize:"13px", fontWeight:"500", color:"#374151" };
const inputStyle        = { padding:"9px 12px", border:"1px solid #d1d5db", borderRadius:"8px", fontSize:"14px", width:"100%", boxSizing:"border-box", outline:"none" };
const userCardStyle     = { border:"1px solid #e5e7eb", borderRadius:"10px", padding:"11px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#fafafa" };
const reasigCardStyle   = { border:"1px solid #dbeafe", borderRadius:"10px", padding:"11px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#eff6ff", marginBottom:"6px" };
const emptyStyle        = { color:"#94a3b8", fontSize:"13px", textAlign:"center", padding:"12px 0" };
const supBadgeStyle     = { background:"#dbeafe", color:"#1e40af", padding:"1px 6px", borderRadius:"8px", fontSize:"10px", fontWeight:"600", marginLeft:"6px" };
const infoRowStyle      = { display:"flex", justifyContent:"space-between", fontSize:"13px", padding:"5px 0", borderBottom:"1px solid #f1f5f9" };
const errStyle          = { background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"8px", padding:"8px 12px", fontSize:"13px", color:"#dc2626" };
const okStyle           = { background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"8px", padding:"8px 12px", fontSize:"13px", color:"#166534" };
const btnAddStyle       = { padding:"5px 12px", background:"#1e293b", color:"white", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"12px", whiteSpace:"nowrap" };
const btnRemoveStyle    = { padding:"5px 12px", background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:"6px", cursor:"pointer", fontSize:"12px", whiteSpace:"nowrap" };
const btnSearchStyle    = { padding:"9px 14px", background:"#475569", color:"white", border:"none", borderRadius:"8px", cursor:"pointer", fontSize:"13px", whiteSpace:"nowrap" };
const btnReasigStyle    = { padding:"5px 12px", background:"#2563eb", color:"white", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"12px", whiteSpace:"nowrap" };
const btnPrimaryStyle   = { padding:"10px", background:"#1e293b", color:"white", border:"none", borderRadius:"8px", cursor:"pointer", fontWeight:"500", fontSize:"14px" };

export default GestionEscuadra;
