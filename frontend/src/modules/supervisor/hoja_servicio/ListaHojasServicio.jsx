// frontend/src/modules/supervisor/hoja_servicio/ListaHojasServicio.jsx
// V2.2C — Reemplaza ListaHojasHoy
// Diseño moderno con tarjetas + filtros completos
// Roles: todos los operativos

import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { DelegationRepository, SquadRepository } from "../../../core";
import { supabase } from "../../../core/providers/supabase/SupabaseProvider";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

const ESTADOS = [
  { value:"",           label:"Todos",      color:"#64748b" },
  { value:"pendiente",  label:"Pendiente",  color:"#1e40af" },
  { value:"en_tramite", label:"En trámite", color:"#166534" },
  { value:"finalizada", label:"Finalizada", color:"#854d0e" },
  { value:"cerrada",    label:"Cerrada",    color:"#475569" },
];

const BADGE = {
  pendiente:  { bg:"#eff6ff", color:"#1e40af" },
  en_tramite: { bg:"#f0fdf4", color:"#166534" },
  finalizada: { bg:"#fefce8", color:"#854d0e" },
  cerrada:    { bg:"#f1f5f9", color:"#475569" },
};

function getDashboardRoute(rol) {
  if (rol === "supervisor") return "/supervisor";
  if (["jefatura_distrital","unidad_operativa_distrital"].includes(rol)) return "/unidad_operativa_distrital";
  return "/unidad_operativa";
}

function ListaHojasServicio() {
  const navigate     = useNavigate();
  const { userData } = useContext(AuthContext);
  const rol          = userData?.rol ?? "";

  const esSupervisor = rol === "supervisor";
  const esDistrital  = ["jefatura_distrital","unidad_operativa_distrital"].includes(rol);
  const esCantonal   = ["jefatura","unidad_operativa","admin"].includes(rol);

  const hoy = new Date().toISOString().split("T")[0];
  const [filtroFechaIni, setFiltroFechaIni] = useState(hoy);
  const [filtroFechaFin, setFiltroFechaFin] = useState(hoy);
  const [filtroEstado,   setFiltroEstado]   = useState("");
  const [filtroTipo,     setFiltroTipo]     = useState("");
  const [filtroDeleg,    setFiltroDeleg]    = useState("");
  const [filtroEscuadra, setFiltroEscuadra] = useState("");

  const [subdelegaciones, setSubdelegaciones] = useState([]);
  const [escuadras,       setEscuadras]       = useState([]);
  const [hojas,   setHojas]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!userData) return;
    if (esCantonal) {
      DelegationRepository.getSubdelegaciones(userData.delegation_id)
        .then(setSubdelegaciones).catch(() => {});
    }
  }, [userData]);

  useEffect(() => {
    if (!filtroDeleg) { setEscuadras([]); return; }
    SquadRepository.getByDelegation(filtroDeleg)
      .then(setEscuadras).catch(() => setEscuadras([]));
  }, [filtroDeleg]);

  useEffect(() => {
    if (!esDistrital || !userData) return;
    SquadRepository.getByDelegation(userData.delegation_id)
      .then(setEscuadras).catch(() => setEscuadras([]));
  }, [esDistrital, userData]);

  const cargar = useCallback(async () => {
    if (!userData) return;
    setLoading(true); setError("");
    try {
      let query = supabase.from("service_sheets").select("*");
      if (esSupervisor)      query = query.eq("supervisor_id", userData.id);
      else if (esDistrital)  query = query.eq("delegation_id", userData.delegation_id);
      else if (esCantonal && filtroDeleg) query = query.eq("delegation_id", filtroDeleg);
      if (filtroEstado)   query = query.eq("estado", filtroEstado);
      if (filtroTipo)     query = query.eq("sheet_type", filtroTipo);
      if (filtroEscuadra) query = query.eq("squad_id", filtroEscuadra);
      if (filtroFechaIni) query = query.gte("fecha", filtroFechaIni);
      if (filtroFechaFin) query = query.lte("fecha", filtroFechaFin);
      query = query.order("fecha", { ascending:false });
      const { data, error:e } = await query;
      if (e) throw new Error(e.message);
      setHojas(data ?? []);
    } catch (err) { setError("Error: " + err.message); }
    finally { setLoading(false); }
  }, [userData, filtroEstado, filtroTipo, filtroDeleg, filtroEscuadra, filtroFechaIni, filtroFechaFin]);

  useEffect(() => { cargar(); }, [cargar]);

  const puedeCrear = !["agente"].includes(rol);
  const menuItems = [
    ...(puedeCrear ? [{ label:"+ Nueva Hoja", onClick:() => navigate("/supervisor/crear-hoja") }] : []),
    { label:"🏠 Dashboard", onClick:() => navigate(getDashboardRoute(rol)) },
  ];

  const esHoy = filtroFechaIni === hoy && filtroFechaFin === hoy;

  return (
    <DesktopLayout title="Hojas de Servicio" menuItems={menuItems} user={userData}>
      <div style={pageStyle}>

        {/* HERO HEADER */}
        <div style={heroStyle}>
          <div style={heroLeftStyle}>
            <div style={heroIconStyle}>📋</div>
            <div>
              <h1 style={heroTitleStyle}>Hojas de Servicio</h1>
              <p style={heroSubStyle}>
                {esSupervisor ? "Tus hojas — historial completo"
                  : esDistrital ? "Hojas de tu delegación"
                  : "Gestión territorial de hojas de servicio"}
              </p>
            </div>
          </div>
          {puedeCrear && (
            <button onClick={() => navigate("/supervisor/crear-hoja")} style={btnCrearStyle}>
              + Nueva Hoja
            </button>
          )}
        </div>

        {/* FILTROS */}
        <div style={cardStyle}>
          <div style={filtrosHeaderStyle}>
            <span style={{ fontSize:"14px", fontWeight:"600", color:"#1e293b" }}>Filtros</span>
            <button onClick={() => {
              setFiltroFechaIni(hoy); setFiltroFechaFin(hoy);
              setFiltroEstado(""); setFiltroTipo(""); setFiltroDeleg(""); setFiltroEscuadra("");
            }} style={btnLinkStyle}>Limpiar</button>
          </div>
          <div style={filtersGridStyle}>
            <div>
              <label style={filterLabelStyle}>Fecha inicio</label>
              <input type="date" value={filtroFechaIni}
                onChange={e => setFiltroFechaIni(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={filterLabelStyle}>Fecha fin</label>
              <input type="date" value={filtroFechaFin}
                onChange={e => setFiltroFechaFin(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={filterLabelStyle}>Estado</label>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={selectStyle}>
                {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label style={filterLabelStyle}>Tipo</label>
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={selectStyle}>
                <option value="">Todos los tipos</option>
                <option value="planificada">Planificada</option>
                <option value="emergencia">Emergencia</option>
              </select>
            </div>
            {esCantonal && (
              <div>
                <label style={filterLabelStyle}>Delegación</label>
                <select value={filtroDeleg}
                  onChange={e => { setFiltroDeleg(e.target.value); setFiltroEscuadra(""); }}
                  style={selectStyle}>
                  <option value="">Todas</option>
                  {subdelegaciones.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            {(filtroDeleg || esDistrital) && escuadras.length > 0 && (
              <div>
                <label style={filterLabelStyle}>Escuadra</label>
                <select value={filtroEscuadra} onChange={e => setFiltroEscuadra(e.target.value)} style={selectStyle}>
                  <option value="">Todas</option>
                  {escuadras.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
            )}
            <div style={{ display:"flex", alignItems:"flex-end" }}>
              <button onClick={cargar} style={btnBuscarStyle}>🔍 Buscar</button>
            </div>
          </div>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        {/* RESUMEN RÁPIDO */}
        <div style={statsRowStyle}>
          {ESTADOS.slice(1).map(e => {
            const count = hojas.filter(h => h.estado === e.value).length;
            return (
              <div key={e.value} style={statCardStyle}>
                <span style={{ fontSize:"22px", fontWeight:"700", color:e.color }}>{count}</span>
                <span style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>{e.label}</span>
              </div>
            );
          })}
          <div style={{ ...statCardStyle, background:"#f8fafc" }}>
            <span style={{ fontSize:"22px", fontWeight:"700", color:"#1e293b" }}>{hojas.length}</span>
            <span style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>Total</span>
          </div>
        </div>

        {/* LISTA */}
        <div style={cardStyle}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
            <span style={{ fontSize:"14px", fontWeight:"600", color:"#1e293b" }}>
              {loading ? "Cargando..." : `${hojas.length} resultado(s) — ${esHoy ? "hoy" : `${filtroFechaIni} al ${filtroFechaFin}`}`}
            </span>
          </div>

          {loading ? (
            <div style={emptyStyle}><div style={spinnerStyle} />Cargando hojas...</div>
          ) : hojas.length === 0 ? (
            <div style={emptyStyle}>
              <span style={{ fontSize:"32px" }}>📭</span>
              <p>No hay hojas para los filtros seleccionados.</p>
            </div>
          ) : (
            <div style={listaGridStyle}>
              {hojas.map(hoja => {
                const badge  = BADGE[hoja.estado] ?? BADGE.pendiente;
                const sup    = hoja.supervisor_snapshot ?? {};
                const encarg = (hoja.personal_snapshot ?? []).find(p => p.es_encargado);
                return (
                  <div key={hoja.id} onClick={() => navigate(`/supervisor/hoja-servicio/${hoja.id}`)}
                    style={hojaCardStyle}>
                    <div style={hojaCardHeaderStyle}>
                      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                        <div style={hojaIconStyle}>
                          {hoja.sheet_type === "emergencia" ? "🚨" : "📋"}
                        </div>
                        <div>
                          <div style={{ fontSize:"15px", fontWeight:"700", color:"#1e293b" }}>
                            #{hoja.numero_hoja}
                          </div>
                          <div style={{ fontSize:"12px", color:"#64748b" }}>
                            {hoja.fecha} • {hoja.turno_operativo}
                          </div>
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"4px" }}>
                        <span style={{ ...badgeBaseStyle, background:badge.bg, color:badge.color }}>
                          {ESTADOS.find(e => e.value === hoja.estado)?.label ?? hoja.estado}
                        </span>
                        {hoja.sheet_type === "emergencia" && (
                          <span style={{ ...badgeBaseStyle, background:"#fff1f2", color:"#be123c", fontSize:"10px" }}>
                            Emergencia
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={hojaCardBodyStyle}>
                      <DataItem icon="👤" label="Supervisor"
                        value={sup.nombre ? `${sup.rango ? sup.rango+" " : ""}${sup.nombre} ${sup.apellido1}` : "—"} />
                      {encarg && (
                        <DataItem icon="⭐" label="Encargado"
                          value={`${encarg.rango ? encarg.rango+" " : ""}${encarg.nombre} ${encarg.apellido1}`} />
                      )}
                      {hoja.mision && (
                        <div style={{ gridColumn:"1/-1", fontSize:"12px", color:"#475569",
                          lineHeight:"1.4", borderTop:"1px solid #f1f5f9", paddingTop:"8px", marginTop:"4px" }}>
                          {hoja.mision.split("\n").slice(0,2).join(" • ")}
                        </div>
                      )}
                    </div>

                    <div style={hojaCardFooterStyle}>
                      <span style={{ fontSize:"12px", color:"#94a3b8" }}>Ver detalle →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DesktopLayout>
  );
}

const DataItem = ({ icon, label, value }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:"1px" }}>
    <span style={{ fontSize:"10px", color:"#94a3b8", fontWeight:"600", textTransform:"uppercase" }}>
      {icon} {label}
    </span>
    <span style={{ fontSize:"12px", color:"#374151" }}>{value}</span>
  </div>
);

const pageStyle          = { padding:"20px", display:"flex", flexDirection:"column", gap:"16px" };
const heroStyle          = { display:"flex", justifyContent:"space-between", alignItems:"center",
                              background:"linear-gradient(135deg, #0f2d52 0%, #1e4e8c 100%)",
                              borderRadius:"14px", padding:"24px 28px", color:"white" };
const heroLeftStyle      = { display:"flex", alignItems:"center", gap:"16px" };
const heroIconStyle      = { fontSize:"32px", background:"rgba(255,255,255,0.15)",
                              width:"56px", height:"56px", borderRadius:"14px",
                              display:"flex", alignItems:"center", justifyContent:"center" };
const heroTitleStyle     = { margin:"0 0 4px", fontSize:"20px", fontWeight:"700" };
const heroSubStyle       = { margin:0, fontSize:"13px", opacity:0.8 };
const btnCrearStyle      = { padding:"11px 22px", border:"none", borderRadius:"10px",
                              background:"white", color:"#0f2d52", cursor:"pointer",
                              fontWeight:"600", fontSize:"13px", whiteSpace:"nowrap" };
const cardStyle          = { background:"white", padding:"20px", borderRadius:"12px",
                              boxShadow:"0 1px 4px rgba(0,0,0,0.08)" };
const filtrosHeaderStyle = { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" };
const filtersGridStyle   = { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:"12px", alignItems:"end" };
const filterLabelStyle   = { display:"block", fontSize:"11px", fontWeight:"600", color:"#374151",
                              textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:"5px" };
const inputStyle         = { padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:"8px",
                              fontSize:"13px", outline:"none", width:"100%", boxSizing:"border-box", color:"#1e293b" };
const selectStyle        = { ...inputStyle, background:"white", cursor:"pointer" };
const btnBuscarStyle     = { padding:"9px 18px", border:"none", borderRadius:"8px",
                              background:"#1e293b", color:"white", cursor:"pointer",
                              fontWeight:"500", fontSize:"13px", width:"100%" };
const btnLinkStyle       = { padding:"4px 8px", border:"none", background:"none",
                              color:"#3b82f6", cursor:"pointer", fontSize:"12px", fontWeight:"500" };
const errorStyle         = { background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"8px",
                              padding:"10px 14px", fontSize:"13px", color:"#dc2626" };
const statsRowStyle      = { display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:"10px" };
const statCardStyle      = { background:"white", borderRadius:"10px", padding:"14px",
                              display:"flex", flexDirection:"column", alignItems:"center",
                              boxShadow:"0 1px 4px rgba(0,0,0,0.07)" };
const listaGridStyle     = { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:"12px" };
const hojaCardStyle      = { border:"1px solid #e2e8f0", borderRadius:"12px", cursor:"pointer",
                              overflow:"hidden", background:"white" };
const hojaCardHeaderStyle= { display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                              padding:"14px 16px 10px", borderBottom:"1px solid #f8fafc" };
const hojaIconStyle      = { fontSize:"20px", background:"#f8fafc", width:"40px", height:"40px",
                              borderRadius:"10px", display:"flex", alignItems:"center",
                              justifyContent:"center", flexShrink:0 };
const hojaCardBodyStyle  = { padding:"10px 16px", display:"grid",
                              gridTemplateColumns:"1fr 1fr", gap:"8px" };
const hojaCardFooterStyle= { padding:"8px 16px 12px", display:"flex", justifyContent:"flex-end" };
const badgeBaseStyle     = { padding:"3px 9px", borderRadius:"8px", fontSize:"11px", fontWeight:"600" };
const emptyStyle         = { display:"flex", flexDirection:"column", alignItems:"center",
                              justifyContent:"center", padding:"40px", gap:"10px",
                              color:"#94a3b8", fontSize:"13px" };
const spinnerStyle       = { width:"20px", height:"20px", border:"2px solid #e2e8f0",
                              borderTop:"2px solid #1e293b", borderRadius:"50%" };

export default ListaHojasServicio;
