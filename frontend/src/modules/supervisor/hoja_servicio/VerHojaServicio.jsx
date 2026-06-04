// frontend/src/modules/supervisor/hoja_servicio/VerHojaServicio.jsx
// V2.2C — Diseño 3 columnas estilo Stitch + flujo de estados
// Columna izq: supervisión + personal | Centro: bitácora actividades | Der: turno + sector + acciones

import { useState, useEffect, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import {
  ServiceSheetRepository, OrderRepository, ResourceRepository,
  UserRepository, RankRepository, DelegationRepository, RegionRepository,
} from "../../../core";
import { supabase } from "../../../core/providers/supabase/SupabaseProvider";
import { generarPDFHojaServicio } from "../../../utils/generarPDFHojaServicio";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

const fmt = t => (t ?? "").substring(0,5);

const ESTADO_FLOW = {
  pendiente:  { color:"#1e40af", bg:"#eff6ff", label:"Pendiente",  icon:"⏳", next:"en_tramite",  nextLabel:"Iniciar trámite" },
  en_tramite: { color:"#166534", bg:"#f0fdf4", label:"En trámite", icon:"⚙️", next:"finalizada",  nextLabel:"Marcar finalizada" },
  finalizada: { color:"#854d0e", bg:"#fefce8", label:"Finalizada", icon:"✅", next:"cerrada",     nextLabel:"Cerrar hoja" },
  cerrada:    { color:"#475569", bg:"#f1f5f9", label:"Cerrada",    icon:"🔒", next:null,          nextLabel:null },
};

function getDashboardRoute(rol) {
  if (rol === "supervisor") return "/supervisor";
  if (["jefatura_distrital","unidad_operativa_distrital"].includes(rol)) return "/unidad_operativa_distrital";
  return "/unidad_operativa";
}

function VerHojaServicio() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { userData } = useContext(AuthContext);
  const rol       = userData?.rol ?? "";

  const [hoja,        setHoja]        = useState(null);
  const [actividades, setActividades] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [delegNombre, setDelegNombre] = useState("");
  const [regionNombre,setRegionNombre]= useState("");
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  // Reasignación
  const [mostrarReasignar, setMostrarReasignar] = useState(false);
  const [recursosDisp,     setRecursosDisp]     = useState([]);
  const [recursosNuevos,   setRecursosNuevos]   = useState([]);
  const [recursoIdAdd,     setRecursoIdAdd]     = useState("");
  const [nuevoEncargadoId, setNuevoEncargadoId] = useState("");
  const [guardandoReasig,  setGuardandoReasig]  = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [hojaData, actsData] = await Promise.all([
        ServiceSheetRepository.getById(id),
        ServiceSheetRepository.getActividades(id),
      ]);
      if (!hojaData) { setError("Hoja no encontrada."); setLoading(false); return; }

      const oids = [...new Set(actsData.map(a => a.order_id).filter(Boolean))];
      const ordMap = {}, accMap = {};
      await Promise.all(oids.map(async oid => {
        const [accs, ord] = await Promise.all([
          OrderRepository.getAcciones(oid).catch(() => []),
          OrderRepository.getById(oid).catch(() => null),
        ]);
        accMap[oid] = accs; ordMap[oid] = ord;
      }));

      const acts = actsData.map(a => ({
        ...a,
        // Priorizar snapshots — funcionan para planificadas Y manuales
        // Fallback a BD solo si no hay snapshot Y hay order_id
        accion_nombre: a.accion_nombre_snapshot
          || (a.order_id ? (accMap[a.order_id]??[]).find(ac=>ac.id===a.order_action_id)?.nombre : null)
          || "—",
        accion_detalle: a.accion_detalle_snapshot
          || (a.order_id ? (accMap[a.order_id]??[]).find(ac=>ac.id===a.order_action_id)?.detalle : null)
          || "",
        orden_consecutivo: a.orden_consecutivo_snapshot
          || (a.order_id ? ordMap[a.order_id]?.consecutivo : null)
          || "",
        orden_nombre: a.orden_nombre_snapshot
          || (a.order_id ? ordMap[a.order_id]?.nombre : null)
          || "",
      }));

      setHoja(hojaData); setActividades(acts);

      const deleg  = await DelegationRepository.getById(hojaData.delegation_id).catch(() => null);
      const region = deleg?.region_id ? await RegionRepository.getById(deleg.region_id).catch(() => null) : null;
      setDelegNombre(deleg?.nombre ?? ""); setRegionNombre(region?.nombre ?? "");
    } catch (err) { setError("Error: " + err.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const esPendiente        = hoja?.estado === "pendiente";
  const esCerrada          = hoja?.estado === "cerrada";
  const estadoConf         = ESTADO_FLOW[hoja?.estado] ?? ESTADO_FLOW.pendiente;
  const puedeEditar        = ["admin","unidad_operativa","unidad_operativa_distrital","supervisor"].includes(rol);
  const puedeCambiarEstado = puedeEditar && !esCerrada;

  const handleCambiarEstado = async () => {
    if (!estadoConf.next) return;
    if (estadoConf.next === "cerrada") {
      if (!confirm("Cerrar esta hoja es irreversible. ¿Confirmar?")) return;
    }
    setCambiandoEstado(true);
    try {
      await ServiceSheetRepository.update(id, { estado: estadoConf.next });
      await cargar();
    } catch (err) { setError("Error: " + err.message); }
    finally { setCambiandoEstado(false); }
  };

  const iniciarReasignacion = async () => {
    setMostrarReasignar(true); setRecursosNuevos([]); setNuevoEncargadoId("");
    const recs = await ResourceRepository.getAll({ delegation_id: userData.delegation_id, estado:"activo" });
    setRecursosDisp(recs);
  };

  const cargarOficialesConRango = async resourceId => {
    const { data: asgn } = await supabase.from("resource_assignments")
      .select("user_id").eq("resource_id", resourceId).is("liberado_en", null);
    if (!asgn?.length) return [];
    const users = await Promise.all(asgn.map(async ({ user_id }) => {
      try {
        const u = await UserRepository.getById(user_id);
        if (!u || u.estado_usuario !== "activo") return null;
        let rango = "";
        if (u.rank_id) { const r = await RankRepository.getById(u.rank_id).catch(() => null); rango = r?.siglas ?? r?.nombre ?? ""; }
        return { ...u, rango };
      } catch { return null; }
    }));
    return users.filter(Boolean);
  };

  const handleAgregarRec = async () => {
    if (!recursoIdAdd || recursosNuevos.find(rn => rn.recurso.id === recursoIdAdd)) return;
    const rec = recursosDisp.find(r => r.id === recursoIdAdd);
    const ofs = await cargarOficialesConRango(recursoIdAdd);
    setRecursosNuevos(prev => [...prev, { recurso:rec, oficiales:ofs }]);
    setRecursoIdAdd("");
  };

  const todosNuevos = recursosNuevos.flatMap(rn => rn.oficiales.map(o => ({ ...o, recurso:rn.recurso })));

  const confirmarReasignacion = async () => {
    if (recursosNuevos.length === 0 || !nuevoEncargadoId) { setError("Complete los campos."); return; }
    setGuardandoReasig(true);
    try {
      await ServiceSheetRepository.update(id, {
        personal_snapshot: todosNuevos.map(o => ({
          user_id:o.id, nombre:o.nombre, apellido1:o.apellido1, apellido2:o.apellido2??"",
          rango:o.rango??"", es_encargado: o.id === nuevoEncargadoId, resource_id:o.recurso.id,
        })),
        recursos_snapshot: recursosNuevos.map((rn,i) => ({
          resource_id:rn.recurso.id, nombre_recurso:rn.recurso.nombre_recurso??"",
          tipo:rn.recurso.tipo_recurso??"", unidad:rn.recurso.unidad??"",
          indicativo:rn.recurso.indicativo??"", es_principal: i===0,
        })),
      });
      setMostrarReasignar(false); await cargar();
    } catch (err) { setError("Error: " + err.message); }
    finally { setGuardandoReasig(false); }
  };

  const handlePDF = () => {
    if (!hoja) return;
    const sup  = hoja.supervisor_snapshot ?? {};
    const jef  = hoja.jefatura_snapshot   ?? {};
    const pers = hoja.personal_snapshot   ?? [];
    const recs = hoja.recursos_snapshot   ?? [];
    const encarg = pers.find(p => p.es_encargado) ?? {};
    generarPDFHojaServicio({
      numero_hoja:       hoja.numero_hoja,
      fecha:             hoja.fecha,
      turno_operativo:   hoja.turno_operativo,
      mision:            hoja.mision,
      noticia_criminis:  hoja.noticia_criminis,
      observaciones:     hoja.observaciones,
      region_nombre:     regionNombre,
      delegacion_nombre: delegNombre,
      supervisor_nombre: [sup.rango, sup.nombre, sup.apellido1, sup.apellido2].filter(Boolean).join(" "),
      horario: { inicio:hoja.horario_inicio, fin:hoja.horario_fin,
        comida:hoja.horario_comida, comida_fin:hoja.horario_comida_fin, tipo:hoja.tipo_comida },
      entregado_a: { nombre:[encarg.rango,encarg.nombre,encarg.apellido1].filter(Boolean).join(" ") },
      jefatura:    { nombre:[jef.rango,jef.nombre,jef.apellido1].filter(Boolean).join(" ") },
      recursos: recs.map(r => ({
        ...r,
        oficiales: pers.filter(p => p.resource_id === r.resource_id || recs.length === 1)
          .map(p => ({ rango:p.rango??"", nombre:[p.nombre,p.apellido1,p.apellido2].filter(Boolean).join(" "),
                       unidad:r.unidad??"", indicativo:r.indicativo??"" })),
      })),
      actividades: actividades.map(a => ({
        orden_consecutivo: a.orden_consecutivo, accion_nombre: a.accion_nombre,
        accion_detalle: a.accion_detalle, hora_inicio:a.hora_inicio, hora_fin:a.hora_fin,
        sector:a.sector??"", sector_dinamico:a.sector_dinamico??"",
      })),
    });
  };

  const menuItems = [
    { label:"📋 Hojas", onClick:() => navigate("/supervisor/hojas-hoy") },
    { label:"🏠 Dashboard", onClick:() => navigate(getDashboardRoute(rol)) },
  ];

  if (loading) return (
    <DesktopLayout title="Hoja de Servicio" menuItems={menuItems} user={userData}>
      <div style={centeredStyle}><div style={spinnerStyle} /><p>Cargando hoja...</p></div>
    </DesktopLayout>
  );
  if (error && !hoja) return (
    <DesktopLayout title="Hoja de Servicio" menuItems={menuItems} user={userData}>
      <div style={centeredStyle}>{error}</div>
    </DesktopLayout>
  );

  const sup    = hoja.supervisor_snapshot ?? {};
  const jef    = hoja.jefatura_snapshot   ?? {};
  const pers   = hoja.personal_snapshot   ?? [];
  const recs   = hoja.recursos_snapshot   ?? [];
  const encarg = pers.find(p => p.es_encargado);

  // Filtrar "EMERGENCIA" — no es una orden real
  // Si no quedan órdenes reales, mostrar "Sin orden de referencia"
  const ordenesUnicas = [...new Map(
    actividades
      .map(a => [a.orden_consecutivo, a])
      .filter(([k]) => k && k !== "EMERGENCIA")
  ).values()];
  const sectoresDinamicos = [...new Set(actividades.map(a => a.sector_dinamico).filter(Boolean))];
  const getRecurso        = personal => recs.find(r => r.resource_id === personal.resource_id) ?? recs[0] ?? {};
  const nombreSnap        = snap => [snap?.rango, snap?.nombre, snap?.apellido1, snap?.apellido2].filter(Boolean).join(" ") || "—";

  return (
    <DesktopLayout title="Hoja de Servicio" menuItems={menuItems} user={userData}>
      <div style={pageStyle}>
        {error && <div style={errorStyle}>{error}</div>}

        {/* HEADER — título + estado + acciones */}
        <div style={docHeaderStyle}>
          <div style={docHeaderLeftStyle}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"4px" }}>
                <h1 style={docTitleStyle}>Hoja de Servicio #{hoja.numero_hoja}</h1>
                <span style={{ ...estadoBadgeStyle, background:estadoConf.bg, color:estadoConf.color }}>
                  {estadoConf.icon} {estadoConf.label}
                </span>
                {hoja.sheet_type === "emergencia" && (
                  <span style={{ ...estadoBadgeStyle, background:"#fff1f2", color:"#be123c" }}>
                    🚨 Emergencia
                  </span>
                )}
              </div>
              <p style={docSubStyle}>
                {delegNombre} • {hoja.fecha} • Turno {hoja.turno_operativo}
              </p>
            </div>
          </div>
          <div style={docActionsStyle}>
            {puedeEditar && esPendiente && (
              <button onClick={iniciarReasignacion} style={btnSecondaryStyle}>
                🔄 Reasignar Recurso
              </button>
            )}
            {puedeCambiarEstado && estadoConf.next && (
              <button onClick={handleCambiarEstado} disabled={cambiandoEstado}
                style={{ ...btnEstadoStyle,
                  background: estadoConf.next === "cerrada" ? "#dc2626" : "#166534" }}>
                {cambiandoEstado ? "..." : estadoConf.nextLabel}
              </button>
            )}
            <button onClick={handlePDF} style={btnPDFStyle}>
              📄 PDF Institucional
            </button>
          </div>
        </div>

        {/* PANEL REASIGNACIÓN */}
        {mostrarReasignar && (
          <div style={reasignarPanelStyle}>
            <h3 style={{ margin:"0 0 8px", fontSize:"15px", color:"#1e293b" }}>🔄 Reasignar Recurso</h3>
            <p style={{ fontSize:"12px", color:"#64748b", marginBottom:"14px" }}>
              Los recursos y personal actuales serán reemplazados. La planificación y jefatura no cambian.
            </p>
            <div style={{ display:"flex", gap:"10px", marginBottom:"12px" }}>
              <select value={recursoIdAdd} onChange={e => setRecursoIdAdd(e.target.value)} style={selectStyle}>
                <option value="">Seleccione recurso</option>
                {recursosDisp.filter(r => !recursosNuevos.find(rn => rn.recurso.id === r.id)).map(r => (
                  <option key={r.id} value={r.id}>{r.nombre_recurso}{r.indicativo ? ` — ${r.indicativo}` : ""}</option>
                ))}
              </select>
              <button onClick={handleAgregarRec} disabled={!recursoIdAdd} style={btnSecondaryStyle}>+ Agregar</button>
            </div>
            {recursosNuevos.map(rn => (
              <div key={rn.recurso.id} style={recCardStyle}>
                <strong style={{ fontSize:"13px" }}>{rn.recurso.nombre_recurso}</strong>
                {rn.oficiales.map(o => (
                  <div key={o.id} style={{ fontSize:"12px", marginTop:"3px" }}>
                    <span style={rangoStyle}>{o.rango}</span> {o.nombre} {o.apellido1}
                  </div>
                ))}
              </div>
            ))}
            {todosNuevos.length > 0 && (
              <div style={{ marginTop:"12px" }}>
                <label style={labelStyle}>Nuevo oficial responsable</label>
                <select value={nuevoEncargadoId} onChange={e => setNuevoEncargadoId(e.target.value)} style={selectStyle}>
                  <option value="">Seleccione</option>
                  {todosNuevos.map(o => (
                    <option key={o.id} value={o.id}>{o.rango} {o.nombre} {o.apellido1} — {o.recurso.nombre_recurso}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display:"flex", gap:"10px", marginTop:"14px" }}>
              <button onClick={confirmarReasignacion} disabled={guardandoReasig} style={btnEstadoStyle}>
                {guardandoReasig ? "Guardando..." : "Confirmar"}
              </button>
              <button onClick={() => setMostrarReasignar(false)} style={btnCancelStyle}>Cancelar</button>
            </div>
          </div>
        )}

        {/* —— LAYOUT 3 COLUMNAS —— */}
        <div style={threeColStyle}>

          {/* COL IZQUIERDA — Supervisión + Personal */}
          <div style={leftColStyle}>
            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <span style={panelIconStyle}>👮</span>
                <span style={panelTitleStyle}>SUPERVISIÓN</span>
              </div>
              <div style={supervisorCardStyle}>
                <div style={supervisorAvatarStyle}>
                  {(sup.nombre??"?").charAt(0)}{(sup.apellido1??"").charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize:"14px", fontWeight:"700", color:"#1e293b" }}>
                    {nombreSnap(sup)}
                  </div>
                  {jef.nombre && (
                    <div style={{ fontSize:"12px", color:"#64748b", marginTop:"2px" }}>
                      Avalado: {nombreSnap(jef)}
                    </div>
                  )}
                </div>
              </div>
              <div style={infoMiniGridStyle}>
                <MiniInfo label="Fecha"   value={hoja.fecha} />
                <MiniInfo label="Turno"   value={hoja.turno_operativo} />
                <MiniInfo label="Número"  value={`#${hoja.numero_hoja}`} />
                {hoja.tipo_comida && (
                  <MiniInfo label={hoja.tipo_comida}
                    value={hoja.horario_comida ? `${fmt(hoja.horario_comida)}-${fmt(hoja.horario_comida_fin)}` : "—"} />
                )}
              </div>
            </div>

            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <span style={panelIconStyle}>👥</span>
                <span style={panelTitleStyle}>PERSONAL ASIGNADO</span>
              </div>
              {pers.length === 0 ? (
                <p style={emptyMsgStyle}>Sin personal.</p>
              ) : (
                pers.map((p, i) => {
                  const rec = getRecurso(p);
                  return (
                    <div key={i} style={{ ...personalRowStyle, background: p.es_encargado ? "#f0fdf4" : "#f8fafc" }}>
                      <div style={personalAvatarStyle}>
                        {(p.nombre??"?").charAt(0)}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                          <span style={rangoStyle}>{p.rango || "—"}</span>
                          <span style={{ fontSize:"13px", fontWeight:"500", color:"#1e293b" }}>
                            {p.nombre} {p.apellido1}
                          </span>
                          {p.es_encargado && <span style={encargadoStarStyle}>⭐</span>}
                        </div>
                        <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>
                          {rec.nombre_recurso ?? "—"}
                          {rec.indicativo ? ` • ${rec.indicativo}` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <span style={panelIconStyle}>📋</span>
                <span style={panelTitleStyle}>ÓRDENES DE EJECUCIÓN</span>
              </div>
              {ordenesUnicas.length > 0
                ? ordenesUnicas.map((a, i) => (
                    <div key={i} style={ordenRowStyle}>
                      <span style={ordenBadgeStyle}>{a.orden_consecutivo}</span>
                    </div>
                  ))
                : <p style={{ fontSize:"12px", color:"#94a3b8", margin:0 }}>
                    Sin orden de referencia
                  </p>
              }
            </div>
          </div>

          {/* COL CENTRAL — Bitácora de actividades */}
          <div style={centerColStyle}>
            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <span style={panelIconStyle}>📓</span>
                <span style={panelTitleStyle}>BITÁCORA DE ACTIVIDADES</span>
                <span style={{ marginLeft:"auto", fontSize:"12px", color:"#94a3b8" }}>
                  {actividades.length} actividad(es)
                </span>
              </div>
              {actividades.length === 0 ? (
                <p style={emptyMsgStyle}>Sin actividades registradas.</p>
              ) : (
                <div style={timelineStyle}>
                  {actividades.map((act, i) => (
                    <div key={i} style={timelineItemStyle}>
                      <div style={timelineDotColStyle}>
                        <div style={timelineDotStyle} />
                        {i < actividades.length - 1 && <div style={timelineLineStyle} />}
                      </div>
                      <div style={timelineContentStyle}>
                        <div style={timelineHeaderStyle}>
                          <span style={timelineHoraStyle}>
                            {fmt(act.hora_inicio)} — {fmt(act.hora_fin)}
                          </span>
                          {act.orden_consecutivo && (
                            <span style={ordenMiniBadgeStyle}>{act.orden_consecutivo}</span>
                          )}
                        </div>
                        <div style={timelineAccionStyle}>{act.accion_nombre}</div>
                        {act.accion_detalle && (
                          <div style={timelineDetalleStyle}>{act.accion_detalle}</div>
                        )}
                        {act.sector && (
                          <div style={timelineSectorStyle}>📍 {act.sector}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {hoja.mision && (
              <div style={panelStyle}>
                <div style={panelHeaderStyle}>
                  <span style={panelIconStyle}>🎯</span>
                  <span style={panelTitleStyle}>MISIONES DEL SERVICIO</span>
                </div>
                <div style={{ fontSize:"13px", color:"#374151", lineHeight:"1.7" }}>
                  {hoja.mision.split("\n").map((m, i) => <div key={i}>{m}</div>)}
                </div>
              </div>
            )}

            {hoja.noticia_criminis && (
              <div style={{ ...panelStyle, borderLeft:"3px solid #dc2626" }}>
                <div style={panelHeaderStyle}>
                  <span style={panelIconStyle}>🚨</span>
                  <span style={{ ...panelTitleStyle, color:"#dc2626" }}>NOTICIA CRIMINIS</span>
                </div>
                <p style={{ fontSize:"13px", color:"#374151", lineHeight:"1.6", margin:0 }}>
                  {hoja.noticia_criminis}
                </p>
              </div>
            )}

            {hoja.observaciones && (
              <div style={panelStyle}>
                <div style={panelHeaderStyle}>
                  <span style={panelIconStyle}>📝</span>
                  <span style={panelTitleStyle}>OBSERVACIONES</span>
                </div>
                <p style={{ fontSize:"13px", color:"#374151", lineHeight:"1.6", margin:0 }}>
                  {hoja.observaciones}
                </p>
              </div>
            )}
          </div>

          {/* COL DERECHA — Detalles + Sectores + Firmas */}
          <div style={rightColStyle}>
            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <span style={panelIconStyle}>🕐</span>
                <span style={panelTitleStyle}>DETALLES DE TURNO</span>
              </div>
              <div style={detalleItemStyle}>
                <span style={detalleLabelStyle}>Fecha y Horario</span>
                <span style={detalleValStyle}>
                  {hoja.fecha}<br />
                  {fmt(hoja.horario_inicio)} — {fmt(hoja.horario_fin)}
                </span>
              </div>
              {recs.map((r, i) => (
                <div key={i} style={detalleItemStyle}>
                  <span style={detalleLabelStyle}>
                    {i === 0 ? "Unidad Principal" : `Unidad ${i+1}`}
                  </span>
                  <span style={detalleValStyle}>
                    🚓 {r.nombre_recurso}
                    {r.indicativo && <><br />📻 {r.indicativo}</>}
                  </span>
                </div>
              ))}
              {hoja.tipo_comida && (
                <div style={detalleItemStyle}>
                  <span style={detalleLabelStyle}>Alimentación</span>
                  <span style={detalleValStyle}>
                    {hoja.tipo_comida}<br />
                    {fmt(hoja.horario_comida)} — {fmt(hoja.horario_comida_fin)}
                  </span>
                </div>
              )}
            </div>

            {sectoresDinamicos.length > 0 && (
              <div style={panelStyle}>
                <div style={panelHeaderStyle}>
                  <span style={panelIconStyle}>🗺️</span>
                  <span style={panelTitleStyle}>SECTOR DE RESPONSABILIDAD</span>
                </div>
                {sectoresDinamicos.map((s, i) => (
                  <div key={i} style={sectorCardStyle}>
                    <div style={sectorIconStyle}>🗺️</div>
                    <span style={{ fontSize:"13px", fontWeight:"600", color:"#1e293b" }}>{s}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <span style={panelIconStyle}>✍️</span>
                <span style={panelTitleStyle}>FIRMAS</span>
              </div>
              <div style={firmaRowStyle}>
                <span style={firmaLabelStyle}>Entregado a</span>
                <span style={firmaValStyle}>{encarg ? nombreSnap(encarg) : "—"}</span>
              </div>
              <div style={firmaRowStyle}>
                <span style={firmaLabelStyle}>Encargado</span>
                <span style={firmaValStyle}>{nombreSnap(sup)}</span>
              </div>
              <div style={firmaRowStyle}>
                <span style={firmaLabelStyle}>Fecha entrega</span>
                <span style={firmaValStyle}>{hoja.fecha} — {fmt(hoja.horario_inicio)} hrs</span>
              </div>
              <div style={firmaRowStyle}>
                <span style={firmaLabelStyle}>Avalado por</span>
                <span style={firmaValStyle}>{nombreSnap(jef)}</span>
              </div>
            </div>

            <div style={{ ...panelStyle, background:"#f8fafc" }}>
              <div style={panelHeaderStyle}>
                <span style={panelIconStyle}>🔄</span>
                <span style={panelTitleStyle}>ESTADO DE LA HOJA</span>
              </div>
              <div style={estadoFlowStyle}>
                {["pendiente","en_tramite","finalizada","cerrada"].map((e, i) => {
                  const conf   = ESTADO_FLOW[e];
                  const actual = hoja.estado === e;
                  const pasado = ["pendiente","en_tramite","finalizada","cerrada"]
                    .indexOf(hoja.estado) > i;
                  return (
                    <div key={e} style={estadoStepStyle}>
                      <div style={{
                        ...estadoCircleStyle,
                        background: actual ? conf.color : pasado ? "#16a34a" : "#e2e8f0",
                        color:      actual || pasado ? "white" : "#94a3b8",
                      }}>
                        {pasado ? "✓" : conf.icon}
                      </div>
                      <span style={{ fontSize:"10px", color: actual ? conf.color : "#94a3b8",
                        fontWeight: actual ? "700" : "400", textAlign:"center" }}>
                        {conf.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DesktopLayout>
  );
}

const MiniInfo = ({ label, value }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:"1px" }}>
    <span style={{ fontSize:"10px", color:"#94a3b8", fontWeight:"600", textTransform:"uppercase" }}>{label}</span>
    <span style={{ fontSize:"12px", color:"#1e293b", fontWeight:"500" }}>{value || "—"}</span>
  </div>
);

const pageStyle           = { padding:"20px", display:"flex", flexDirection:"column", gap:"14px" };
const docHeaderStyle      = { display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"12px" };
const docHeaderLeftStyle  = { flex:1 };
const docTitleStyle       = { margin:"0 0 4px", fontSize:"22px", fontWeight:"700", color:"#1e293b" };
const docSubStyle         = { margin:0, fontSize:"13px", color:"#64748b" };
const docActionsStyle     = { display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center" };
const estadoBadgeStyle    = { padding:"4px 12px", borderRadius:"20px", fontSize:"12px", fontWeight:"700" };
const threeColStyle       = { display:"grid", gridTemplateColumns:"1fr 2fr 1fr", gap:"14px", alignItems:"start" };
const leftColStyle        = { display:"flex", flexDirection:"column", gap:"12px" };
const centerColStyle      = { display:"flex", flexDirection:"column", gap:"12px" };
const rightColStyle       = { display:"flex", flexDirection:"column", gap:"12px" };
const panelStyle          = { background:"white", borderRadius:"12px", padding:"16px", boxShadow:"0 1px 4px rgba(0,0,0,0.07)" };
const panelHeaderStyle    = { display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" };
const panelIconStyle      = { fontSize:"14px" };
const panelTitleStyle     = { fontSize:"11px", fontWeight:"700", color:"#374151", textTransform:"uppercase", letterSpacing:"0.5px" };
const supervisorCardStyle = { display:"flex", alignItems:"center", gap:"12px", background:"#f8fafc", borderRadius:"10px", padding:"12px", marginBottom:"10px" };
const supervisorAvatarStyle = { width:"42px", height:"42px", borderRadius:"50%", background:"#0f2d52", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontWeight:"700", flexShrink:0 };
const infoMiniGridStyle   = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" };
const personalRowStyle    = { display:"flex", alignItems:"center", gap:"10px", padding:"8px 10px", borderRadius:"8px", marginBottom:"4px" };
const personalAvatarStyle = { width:"32px", height:"32px", borderRadius:"50%", background:"#e2e8f0", color:"#475569", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"600", flexShrink:0 };
const rangoStyle          = { background:"#1e293b", color:"white", padding:"1px 6px", borderRadius:"4px", fontSize:"10px", fontWeight:"600", fontFamily:"monospace", flexShrink:0 };
const encargadoStarStyle  = { color:"#16a34a", fontSize:"12px" };
const ordenRowStyle       = { marginBottom:"6px" };
const ordenBadgeStyle     = { background:"#eff6ff", color:"#1e40af", padding:"4px 10px", borderRadius:"6px", fontSize:"11px", fontWeight:"600", fontFamily:"monospace" };
const timelineStyle       = { display:"flex", flexDirection:"column" };
const timelineItemStyle   = { display:"flex", gap:"12px" };
const timelineDotColStyle = { display:"flex", flexDirection:"column", alignItems:"center", width:"16px", flexShrink:0 };
const timelineDotStyle    = { width:"12px", height:"12px", borderRadius:"50%", background:"#0f2d52", flexShrink:0, marginTop:"4px" };
const timelineLineStyle   = { flex:1, width:"2px", background:"#e2e8f0", margin:"4px 0" };
const timelineContentStyle= { flex:1, paddingBottom:"16px" };
const timelineHeaderStyle = { display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" };
const timelineHoraStyle   = { fontSize:"12px", fontWeight:"700", color:"#0f2d52" };
const ordenMiniBadgeStyle = { background:"#f0fdf4", color:"#166534", padding:"1px 7px", borderRadius:"6px", fontSize:"10px", fontFamily:"monospace" };
const timelineAccionStyle = { fontSize:"13px", fontWeight:"600", color:"#1e293b", marginBottom:"3px" };
const timelineDetalleStyle= { fontSize:"12px", color:"#475569", lineHeight:"1.5", background:"#f8fafc", padding:"8px 10px", borderRadius:"6px", marginBottom:"4px" };
const timelineSectorStyle = { fontSize:"11px", color:"#64748b", fontStyle:"italic" };
const detalleItemStyle    = { paddingBottom:"10px", borderBottom:"1px solid #f1f5f9", marginBottom:"10px" };
const detalleLabelStyle   = { display:"block", fontSize:"10px", color:"#94a3b8", fontWeight:"600", textTransform:"uppercase", marginBottom:"3px" };
const detalleValStyle     = { display:"block", fontSize:"13px", color:"#1e293b", fontWeight:"500", lineHeight:"1.5" };
const sectorCardStyle     = { display:"flex", alignItems:"center", gap:"10px", background:"#f8fafc", borderRadius:"8px", padding:"10px 12px", marginBottom:"6px" };
const sectorIconStyle     = { fontSize:"20px" };
const firmaRowStyle       = { display:"flex", flexDirection:"column", gap:"2px", paddingBottom:"8px", borderBottom:"1px solid #f1f5f9", marginBottom:"8px" };
const firmaLabelStyle     = { fontSize:"10px", color:"#94a3b8", fontWeight:"600", textTransform:"uppercase" };
const firmaValStyle       = { fontSize:"12px", color:"#1e293b", fontWeight:"500" };
const estadoFlowStyle     = { display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"4px" };
const estadoStepStyle     = { display:"flex", flexDirection:"column", alignItems:"center", gap:"4px", flex:1 };
const estadoCircleStyle   = { width:"28px", height:"28px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"600" };
const reasignarPanelStyle = { background:"#fffbeb", border:"1px solid #fde68a", borderRadius:"12px", padding:"18px" };
const recCardStyle        = { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"10px", marginBottom:"8px" };
const labelStyle          = { fontSize:"12px", fontWeight:"500", color:"#374151", marginBottom:"4px", display:"block" };
const selectStyle         = { padding:"8px 10px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"13px", outline:"none", width:"100%", boxSizing:"border-box", background:"white" };
const errorStyle          = { background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"8px", padding:"10px 14px", fontSize:"13px", color:"#dc2626" };
const emptyMsgStyle       = { fontSize:"13px", color:"#94a3b8", textAlign:"center", padding:"12px 0" };
const centeredStyle       = { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px", gap:"10px", color:"#94a3b8" };
const spinnerStyle        = { width:"24px", height:"24px", border:"2px solid #e2e8f0", borderTop:"2px solid #0f2d52", borderRadius:"50%" };
const btnPDFStyle         = { padding:"9px 18px", border:"none", borderRadius:"8px", background:"#0f2d52", color:"white", cursor:"pointer", fontWeight:"600", fontSize:"13px" };
const btnSecondaryStyle   = { padding:"8px 14px", border:"1px solid #e2e8f0", borderRadius:"8px", background:"white", color:"#1e293b", cursor:"pointer", fontWeight:"500", fontSize:"13px" };
const btnEstadoStyle      = { padding:"9px 16px", border:"none", borderRadius:"8px", background:"#166834", color:"white", cursor:"pointer", fontWeight:"600", fontSize:"13px" };
const btnCancelStyle      = { padding:"9px 16px", border:"1px solid #e2e8f0", borderRadius:"8px", background:"white", color:"#64748b", cursor:"pointer", fontSize:"13px" };

export default VerHojaServicio;
