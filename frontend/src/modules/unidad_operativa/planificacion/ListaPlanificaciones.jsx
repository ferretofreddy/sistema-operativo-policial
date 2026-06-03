// frontend/src/modules/unidad_operativa/planificacion/ListaPlanificaciones.jsx
// V2.2B.4 — Lista de planificaciones con vista semanal tipo calendario
//
// Roles:
//   admin/jefatura/UO cantonal — filtro por distrital + escuadra + semana
//   jefatura_dist/UO_dist      — ve solo su delegación, sin selector distrital
//   supervisor                 — solo lectura, ve su escuadra

import { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import {
  PlanningRepository,
  DelegationRepository,
  SquadRepository,
} from "../../../core";
import { supabase } from "../../../core/providers/supabase/SupabaseProvider";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

const DIAS_SEMANA = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function getStartOfWeek(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function toISO(date) {
  return date.toISOString().split("T")[0];
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function ListaPlanificaciones() {
  const navigate     = useNavigate();
  const { userData } = useContext(AuthContext);
  const rol          = userData?.rol ?? "";

  const esAdmin      = rol === "admin";
  const esCantonal   = ["jefatura","unidad_operativa"].includes(rol);
  const esDistrital  = ["jefatura_distrital","unidad_operativa_distrital"].includes(rol);
  const esSupervisor = rol === "supervisor";
  const puedeCrear   = ["admin","jefatura","unidad_operativa",
                        "jefatura_distrital","unidad_operativa_distrital"].includes(rol);

  const [semanaInicio, setSemanaInicio] = useState(() => getStartOfWeek(new Date()));

  const [subdelegaciones, setSubdelegaciones] = useState([]);
  const [escuadras,       setEscuadras]       = useState([]);

  const [filtroDeleg,    setFiltroDeleg]    = useState("todas");
  const [filtroEscuadra, setFiltroEscuadra] = useState("todas");

  const [planificaciones, setPlanificaciones] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");

  const diasSemana = useMemo(() =>
    Array.from({ length:7 }, (_, i) => addDays(semanaInicio, i))
  , [semanaInicio]);

  const semanaLabel = useMemo(() => {
    const fin = addDays(semanaInicio, 6);
    return `Semana: ${semanaInicio.toLocaleDateString("es-CR",{day:"numeric",month:"short"})} — ${fin.toLocaleDateString("es-CR",{day:"numeric",month:"short",year:"numeric"})}`;
  }, [semanaInicio]);

  useEffect(() => {
    if (!userData?.delegation_id) return;
    const init = async () => {
      if (esCantonal || esAdmin) {
        const subs = await DelegationRepository
          .getSubdelegaciones(userData.delegation_id).catch(() => []);
        setSubdelegaciones(subs ?? []);
      }
    };
    init();
  }, [userData]);

  useEffect(() => {
    if (!userData?.delegation_id) return;
    const delegId = esCantonal && filtroDeleg !== "todas"
      ? filtroDeleg
      : esDistrital || esSupervisor
        ? userData.delegation_id
        : null;

    if (!delegId) { setEscuadras([]); return; }
    SquadRepository.getByDelegation(delegId)
      .then(setEscuadras)
      .catch(() => setEscuadras([]));
  }, [filtroDeleg, userData]);

  const cargar = useCallback(async () => {
    if (!userData) return;
    setLoading(true);
    setError("");
    try {
      let data = [];

      if (esAdmin) {
        data = await PlanningRepository.getAll({});

      } else if (esCantonal) {
        const { data: rows } = await supabase
          .from("planning")
          .select("*")
          .order("fecha_inicio", { ascending:false });
        data = rows ?? [];

      } else if (esDistrital) {
        const { data: rows } = await supabase
          .from("planning")
          .select("*")
          .eq("delegation_id", userData.delegation_id)
          .order("fecha_inicio", { ascending:false });
        data = rows ?? [];

      } else if (esSupervisor) {
        const { data: rows } = await supabase
          .from("planning")
          .select("*")
          .eq("squad_id", userData.squad_id)
          .order("fecha_inicio", { ascending:false });
        data = rows ?? [];
      }

      setPlanificaciones(data);
    } catch (err) {
      setError("Error cargando planificaciones: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => { cargar(); }, [cargar]);

  const planFiltradas = useMemo(() => {
    return planificaciones.filter(p => {
      const okDeleg    = !esCantonal || filtroDeleg === "todas"
                         || p.delegation_id === filtroDeleg;
      const okEscuadra = filtroEscuadra === "todas"
                         || p.squad_id === filtroEscuadra;
      return okDeleg && okEscuadra;
    });
  }, [planificaciones, filtroDeleg, filtroEscuadra, esCantonal]);

  const planSemana = useMemo(() => {
    const isoDias = diasSemana.map(toISO);
    return planFiltradas.filter(p =>
      isoDias.some(d => d >= p.fecha_inicio && d <= p.fecha_fin)
    );
  }, [planFiltradas, diasSemana]);

  function getEscuadraLabel(squadId) {
    const e = escuadras.find(s => s.id === squadId);
    return e?.codigo ?? e?.nombre?.substring(0,8) ?? "—";
  }

  function getEstadoColor(plan) {
    const hoy = new Date().toISOString().split("T")[0];
    if (plan.fecha_fin < hoy) return { bg:"#f1f5f9", color:"#94a3b8", border:"#e2e8f0" };
    if (plan.fecha_inicio > hoy) return { bg:"#eff6ff", color:"#1e40af", border:"#bfdbfe" };
    return { bg:"#f0fdf4", color:"#166534", border:"#bbf7d0" };
  }

  const menuItems = [
    ...(puedeCrear ? [{
      label:"+ Crear Planificación",
      onClick:() => navigate("/unidad_operativa/planificacion/crear")
    }] : []),
    { label:"🏠 Dashboard", onClick:() => navigate(
      esSupervisor ? "/supervisor" :
      esDistrital  ? "/unidad_operativa_distrital" : "/unidad_operativa"
    )},
  ];

  return (
    <DesktopLayout title="Planificaciones" menuItems={menuItems} user={userData}>
      <div style={pageStyle}>

        {/* HEADER */}
        <div style={cardStyle}>
          <div style={headerRowStyle}>
            <div>
              <h1 style={titleStyle}>Planificación Operativa</h1>
              <p style={subStyle}>Gestión de planificaciones por escuadra y período</p>
            </div>
            {puedeCrear && (
              <button
                onClick={() => navigate("/unidad_operativa/planificacion/crear")}
                style={btnPrimaryStyle}>
                + Crear Planificación
              </button>
            )}
          </div>
          <hr style={dividerStyle} />

          {/* Filtros — solo cantonales ven selector de distrital */}
          <div style={filtersRowStyle}>
            {esCantonal && (
              <div>
                <label style={filterLabelStyle}>Delegación</label>
                <select value={filtroDeleg}
                  onChange={e => { setFiltroDeleg(e.target.value); setFiltroEscuadra("todas"); }}
                  style={selectStyle}>
                  <option value="todas">Todas las delegaciones</option>
                  {subdelegaciones.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.delegation_type === "central" ? "🏛️" : "📍"} {d.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={filterLabelStyle}>Escuadra</label>
              <select value={filtroEscuadra}
                onChange={e => setFiltroEscuadra(e.target.value)}
                style={selectStyle}
                disabled={esCantonal && filtroDeleg === "todas"}>
                <option value="todas">Todas las escuadras</option>
                {escuadras.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN DE SEMANA */}
        <div style={semanaNavStyle}>
          <button
            onClick={() => setSemanaInicio(d => addDays(d, -7))}
            style={navBtnStyle}>
            ← Semana anterior
          </button>
          <span style={semanaLabelStyle}>{semanaLabel}</span>
          <button
            onClick={() => setSemanaInicio(d => addDays(d, 7))}
            style={navBtnStyle}>
            Semana siguiente →
          </button>
          <button
            onClick={() => setSemanaInicio(getStartOfWeek(new Date()))}
            style={navBtnHoyStyle}>
            Hoy
          </button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        {/* CALENDARIO SEMANAL */}
        <div style={calendarCardStyle}>
          {loading ? (
            <p style={msgStyle}>Cargando planificaciones...</p>
          ) : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thTurnoStyle}>ESCUADRA</th>
                    {diasSemana.map((dia, idx) => {
                      const isHoy     = toISO(dia) === new Date().toISOString().split("T")[0];
                      const esFinSem  = idx === 0 || idx === 6;
                      return (
                        <th key={idx} style={{
                          ...thDiaStyle,
                          ...(isHoy ? thHoyStyle : {}),
                          ...(esFinSem ? thFinSemanaStyle : {}),
                        }}>
                          <div style={{ fontSize:"11px", color:"#94a3b8" }}>
                            {DIAS_SEMANA[idx]}
                          </div>
                          <div style={{ fontSize:"16px", fontWeight:"700",
                            color: isHoy ? "#1e40af" : "#1e293b" }}>
                            {dia.getDate()}
                          </div>
                          <div style={{ fontSize:"11px", color:"#94a3b8" }}>
                            {dia.toLocaleDateString("es-CR",{month:"short"})}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {planSemana.length === 0 ? (
                    <tr>
                      <td style={tdTurnoStyle}>—</td>
                      {diasSemana.map((_, i) => (
                        <td key={i} style={tdVacioStyle}>—</td>
                      ))}
                    </tr>
                  ) : (
                    planSemana.map(plan => {
                      const colores = getEstadoColor(plan);
                      return (
                        <tr key={plan.id}>
                          <td style={tdTurnoStyle}>
                            <div style={{ fontSize:"12px", fontWeight:"600", color:"#475569" }}>
                              {getEscuadraLabel(plan.squad_id)}
                            </div>
                            <div style={{ fontSize:"11px", color:"#94a3b8" }}>
                              {plan.fecha_inicio} — {plan.fecha_fin}
                            </div>
                          </td>
                          {diasSemana.map((dia, idx) => {
                            const iso    = toISO(dia);
                            const activa = iso >= plan.fecha_inicio && iso <= plan.fecha_fin;
                            return (
                              <td key={idx}
                                style={activa ? tdActivaStyle : tdVacioStyle}
                                onClick={activa
                                  ? () => navigate(`/unidad_operativa/planificacion/${plan.id}`)
                                  : undefined}>
                                {activa && (
                                  <div style={{
                                    ...planCeldaStyle,
                                    background:  colores.bg,
                                    borderColor: colores.border,
                                    color:       colores.color,
                                    cursor:      "pointer",
                                  }}>
                                    <div style={{ fontSize:"11px", fontWeight:"700" }}>
                                      {getEscuadraLabel(plan.squad_id)}
                                    </div>
                                    <div style={{ fontSize:"10px", marginTop:"2px", opacity:0.8 }}>
                                      Ver →
                                    </div>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {planSemana.length === 0 && (
                <p style={{ ...msgStyle, marginTop:"16px" }}>
                  No hay planificaciones para esta semana.
                </p>
              )}
            </div>
          )}
        </div>

        {/* LISTA COMPACTA — todas las planificaciones filtradas */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>
            Todas las planificaciones ({planFiltradas.length})
          </h2>
          <hr style={dividerStyle} />
          {planFiltradas.length === 0 ? (
            <p style={msgStyle}>No hay planificaciones.</p>
          ) : (
            <div style={listaGridStyle}>
              {planFiltradas.map(plan => {
                const colores = getEstadoColor(plan);
                const hoy     = new Date().toISOString().split("T")[0];
                const estado  = plan.fecha_fin < hoy ? "Finalizada"
                              : plan.fecha_inicio > hoy ? "Programada"
                              : "Activa";
                return (
                  <div key={plan.id} style={planListCardStyle}
                    onClick={() => navigate(`/unidad_operativa/planificacion/${plan.id}`)}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                      <strong style={{ fontSize:"13px", color:"#1e293b" }}>
                        {getEscuadraLabel(plan.squad_id)}
                      </strong>
                      <span style={{ ...estadoBadgeStyle, background:colores.bg, color:colores.color }}>
                        {estado}
                      </span>
                    </div>
                    <div style={{ fontSize:"12px", color:"#64748b" }}>
                      {plan.fecha_inicio} — {plan.fecha_fin}
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

const pageStyle         = { padding:"20px", display:"flex", flexDirection:"column", gap:"16px" };
const cardStyle         = { background:"white", padding:"24px", borderRadius:"12px", boxShadow:"0 2px 6px rgba(0,0,0,0.08)" };
const calendarCardStyle = { background:"white", padding:"16px", borderRadius:"12px", boxShadow:"0 2px 6px rgba(0,0,0,0.08)", overflowX:"auto" };
const headerRowStyle    = { display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"12px" };
const titleStyle        = { margin:"0 0 4px", fontSize:"20px", fontWeight:"600", color:"#1e293b" };
const subStyle          = { margin:0, fontSize:"13px", color:"#64748b" };
const sectionTitleStyle = { margin:"0 0 4px", fontSize:"16px", fontWeight:"600", color:"#1e293b" };
const dividerStyle      = { border:"none", borderTop:"1px solid #e2e8f0", margin:"14px 0" };
const filtersRowStyle   = { display:"flex", gap:"16px", flexWrap:"wrap", alignItems:"flex-end" };
const filterLabelStyle  = { display:"block", fontSize:"12px", fontWeight:"500", color:"#374151", marginBottom:"4px" };
const selectStyle       = { padding:"8px 12px", borderRadius:"8px", border:"1px solid #d1d5db", fontSize:"13px", outline:"none", background:"white", minWidth:"180px" };
const semanaNavStyle    = { display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" };
const semanaLabelStyle  = { flex:1, textAlign:"center", fontWeight:"600", color:"#1e293b", fontSize:"14px" };
const navBtnStyle       = { padding:"8px 14px", border:"1px solid #e2e8f0", borderRadius:"8px", background:"white", color:"#475569", cursor:"pointer", fontSize:"13px" };
const navBtnHoyStyle    = { padding:"8px 14px", border:"none", borderRadius:"8px", background:"#1e293b", color:"white", cursor:"pointer", fontSize:"13px", fontWeight:"500" };
const errorStyle        = { background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"8px", padding:"10px 14px", fontSize:"13px", color:"#dc2626" };
const msgStyle          = { textAlign:"center", color:"#94a3b8", padding:"20px", fontSize:"13px" };
const tableWrapStyle    = { overflowX:"auto", minWidth:"700px" };
const tableStyle        = { width:"100%", borderCollapse:"collapse", fontSize:"12px" };
const thTurnoStyle      = { padding:"10px 12px", background:"#f8fafc", border:"1px solid #e2e8f0", fontSize:"11px", fontWeight:"600", color:"#475569", textTransform:"uppercase", width:"130px", textAlign:"left" };
const thDiaStyle        = { padding:"10px 8px", background:"#f8fafc", border:"1px solid #e2e8f0", textAlign:"center", minWidth:"90px" };
const thHoyStyle        = { background:"#eff6ff", borderBottom:"2px solid #3b82f6" };
const thFinSemanaStyle  = { background:"#fafafa" };
const tdTurnoStyle      = { padding:"10px 12px", border:"1px solid #f1f5f9", verticalAlign:"middle", background:"#fafafa" };
const tdVacioStyle      = { padding:"8px", border:"1px solid #f1f5f9", textAlign:"center", color:"#e2e8f0", fontSize:"12px" };
const tdActivaStyle     = { padding:"4px", border:"1px solid #f1f5f9", verticalAlign:"top" };
const planCeldaStyle    = { padding:"6px 8px", borderRadius:"6px", border:"1px solid", fontSize:"11px", lineHeight:"1.3", textAlign:"center" };
const listaGridStyle    = { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:"10px" };
const planListCardStyle = { padding:"12px 14px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px", cursor:"pointer" };
const estadoBadgeStyle  = { padding:"2px 8px", borderRadius:"8px", fontSize:"11px", fontWeight:"600" };
const btnPrimaryStyle   = { padding:"10px 20px", border:"none", borderRadius:"8px", background:"#1e293b", color:"white", cursor:"pointer", fontWeight:"500", fontSize:"14px", whiteSpace:"nowrap" };

export default ListaPlanificaciones;
