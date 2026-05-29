// frontend/src/modules/supervisor/hoja_servicio/VerHojaServicio.jsx
// Fase 5C — Mayo 2026 — v3
// Renderiza desde snapshots JSONB.
// Personal: tabla con recurso correcto por fila.
// Sectores: sector_dinamico de cada actividad.
// Tareas: nombre acción + detalle + horas + sector.
// Reasignar recurso: botón visible solo con estado pendiente.

import { useState, useEffect, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import {
  ServiceSheetRepository,
  OrderRepository,
  ResourceRepository,
  UserRepository,
  RankRepository,
  DelegationRepository,
  RegionRepository,
} from "../../../core";
import { generarPDFHojaServicio } from "../../../utils/generarPDFHojaServicio";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

const fmt = (t) => (t ?? "").substring(0, 5);

const ESTADO_CONFIG = {
  pendiente: { color: "#f59e0b", bg: "#fef9c3", label: "Pendiente" },
  en_curso: { color: "#3b82f6", bg: "#dbeafe", label: "En curso" },
  finalizado: { color: "#16a34a", bg: "#dcfce7", label: "Finalizado" },
};

function VerHojaServicio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);

  const [hoja, setHoja] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [accionesMap, setAccionesMap] = useState({});
  const [ordenesMap, setOrdenesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [delegacionNombre, setDelegacionNombre] = useState("");
  const [regionNombre,     setRegionNombre]     = useState("");

  // Reasignación de recurso
  const [mostrarReasignar, setMostrarReasignar] = useState(false);
  const [recursosDisp, setRecursosDisp] = useState([]);
  const [recursosNuevos, setRecursosNuevos] = useState([]);
  const [recursoIdAdd, setRecursoIdAdd] = useState("");
  const [nuevoEncargadoId, setNuevoEncargadoId] = useState("");
  const [guardandoReasig, setGuardandoReasig] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [hojaData, actsData] = await Promise.all([
        ServiceSheetRepository.getById(id),
        ServiceSheetRepository.getActividades(id),
      ]);
      if (!hojaData) {
        setError("Hoja no encontrada.");
        setLoading(false);
        return;
      }

      const orderIds = [
        ...new Set(actsData.map((a) => a.order_id).filter(Boolean)),
      ];
      const newAccMap = {},
        newOrdMap = {};
      await Promise.all(
        orderIds.map(async (oid) => {
          const [accs, ord] = await Promise.all([
            OrderRepository.getAcciones(oid).catch(() => []),
            OrderRepository.getById(oid).catch(() => null),
          ]);
          newAccMap[oid] = accs;
          newOrdMap[oid] = ord;
        }),
      );

      const actsEnriquecidas = actsData.map((a) => {
        if (!a.accion_nombre_snapshot) {
          console.warn(
            "[SNAPSHOT_FALLBACK] sheet_activity sin snapshot:",
            a.id,
            "order_action_id:", a.order_action_id,
          );
        }
        return {
          ...a,
          accion_nombre:
            a.accion_nombre_snapshot
            ?? (newAccMap[a.order_id] ?? []).find(ac => ac.id === a.order_action_id)?.nombre
            ?? "—",
          accion_detalle:
            a.accion_detalle_snapshot
            ?? (newAccMap[a.order_id] ?? []).find(ac => ac.id === a.order_action_id)?.detalle
            ?? "",
          orden_consecutivo:
            a.orden_consecutivo_snapshot
            ?? newOrdMap[a.order_id]?.consecutivo
            ?? "",
          orden_nombre:
            a.orden_nombre_snapshot
            ?? newOrdMap[a.order_id]?.nombre
            ?? "",
        };
      });

      setHoja(hojaData);
      setActividades(actsEnriquecidas);
      setAccionesMap(newAccMap);
      setOrdenesMap(newOrdMap);

      const deleg = await DelegationRepository.getById(hojaData.delegation_id).catch(() => null);
      const region = deleg?.region_id
        ? await RegionRepository.getById(deleg.region_id).catch(() => null)
        : null;
      setDelegacionNombre(deleg?.nombre ?? "");
      setRegionNombre(region?.nombre ?? "");
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // ── REASIGNAR RECURSO ─────────────────────────────────────
  const iniciarReasignacion = async () => {
    setMostrarReasignar(true);
    setRecursosNuevos([]);
    setNuevoEncargadoId("");
    const recs = await ResourceRepository.getAll({
      delegation_id: userData.delegation_id,
      estado: "activo",
    });
    setRecursosDisp(recs);
  };

  const cargarOficialesConRango = async (resourceId) => {
    const { supabase } =
      await import("../../../core/providers/supabase/SupabaseProvider");
    const { data: assignments } = await supabase
      .from("resource_assignments")
      .select("user_id")
      .eq("resource_id", resourceId)
      .is("liberado_en", null);
    if (!assignments?.length) return [];
    const users = await Promise.all(
      (assignments ?? []).map(async ({ user_id }) => {
        try {
          const u = await UserRepository.getById(user_id);
          if (!u || u.estado_usuario !== "activo") return null;
          let rango = "";
          if (u.rank_id) {
            const rank = await RankRepository.getById(u.rank_id).catch(
              () => null,
            );
            rango = rank?.siglas ?? rank?.nombre ?? "";
          }
          return { ...u, rango };
        } catch {
          return null;
        }
      }),
    );
    return users.filter(Boolean);
  };

  const handleAgregarRecursoNuevo = async () => {
    if (!recursoIdAdd) return;
    if (recursosNuevos.find((rn) => rn.recurso.id === recursoIdAdd)) {
      setError("Recurso ya agregado.");
      return;
    }
    const rec = recursosDisp.find((r) => r.id === recursoIdAdd);
    const oficiales = await cargarOficialesConRango(recursoIdAdd);
    setRecursosNuevos((prev) => [...prev, { recurso: rec, oficiales }]);
    setRecursoIdAdd("");
    setError("");
  };

  const todosOficialesNuevos = recursosNuevos.flatMap((rn) =>
    rn.oficiales.map((o) => ({ ...o, recurso: rn.recurso })),
  );

  const confirmarReasignacion = async () => {
    if (recursosNuevos.length === 0) {
      setError("Agregue al menos un recurso.");
      return;
    }
    if (!nuevoEncargadoId) {
      setError("Seleccione el oficial responsable.");
      return;
    }
    setGuardandoReasig(true);
    try {
      const personalSnapshot = todosOficialesNuevos.map((o) => ({
        user_id: o.id,
        nombre: o.nombre,
        apellido1: o.apellido1,
        apellido2: o.apellido2 ?? "",
        rango: o.rango ?? "",
        es_encargado: o.id === nuevoEncargadoId,
        resource_id: o.recurso.id,
      }));
      const recursosSnapshot = recursosNuevos.map((rn, i) => ({
        resource_id: rn.recurso.id,
        nombre_recurso: rn.recurso.nombre_recurso ?? "",
        tipo: rn.recurso.tipo_recurso ?? "",
        unidad: rn.recurso.unidad ?? "",
        indicativo: rn.recurso.indicativo ?? "",
        es_principal: i === 0,
      }));
      await ServiceSheetRepository.update(id, {
        personal_snapshot: personalSnapshot,
        recursos_snapshot: recursosSnapshot,
        actualizado: new Date().toISOString(),
      });
      setMostrarReasignar(false);
      await cargar();
    } catch (err) {
      setError("Error al reasignar: " + err.message);
    } finally {
      setGuardandoReasig(false);
    }
  };

  // ── PDF ───────────────────────────────────────────────────
  const handleGenerarPDF = () => {
    if (!hoja) return;
    const sup = hoja.supervisor_snapshot ?? {};
    const jef = hoja.jefatura_snapshot ?? {};
    const personal = hoja.personal_snapshot ?? [];
    const recursos = hoja.recursos_snapshot ?? [];
    const entregadoA = personal.find((p) => p.es_encargado) ?? {};

    // Construir oficiales con su recurso para el PDF
    const recursosConOficiales = recursos.map((r) => ({
      ...r,
      oficiales: personal
        .filter((p) => p.resource_id === r.resource_id || recursos.length === 1)
        .map((p) => ({
          rango: p.rango ?? "",
          nombre: [p.nombre, p.apellido1, p.apellido2]
            .filter(Boolean)
            .join(" "),
          unidad: r.unidad ?? "",
          indicativo: r.indicativo ?? "",
        })),
    }));

    generarPDFHojaServicio({
      numero_hoja: hoja.numero_hoja,
      fecha: hoja.fecha,
      turno_operativo: hoja.turno_operativo,
      mision: hoja.mision,
      noticia_criminis: hoja.noticia_criminis,
      observaciones: hoja.observaciones,
      region_nombre: regionNombre,
      delegacion_nombre: delegacionNombre,
      supervisor_nombre: [sup.rango, sup.nombre, sup.apellido1, sup.apellido2]
        .filter(Boolean)
        .join(" "),
      horario: {
        inicio: hoja.horario_inicio,
        fin: hoja.horario_fin,
        comida: hoja.horario_comida,
        comida_fin: hoja.horario_comida_fin,
        tipo: hoja.tipo_comida,
      },
      entregado_a: {
        nombre: [entregadoA.rango, entregadoA.nombre, entregadoA.apellido1]
          .filter(Boolean)
          .join(" "),
      },
      jefatura: {
        nombre: [jef.rango, jef.nombre, jef.apellido1]
          .filter(Boolean)
          .join(" "),
      },
      recursos: recursosConOficiales,
      actividades: actividades.map((a) => ({
        orden_consecutivo: a.orden_consecutivo,
        accion_nombre: a.accion_nombre,
        accion_detalle: a.accion_detalle,
        hora_inicio: a.hora_inicio,
        hora_fin: a.hora_fin,
        sector: a.sector ?? "",
        sector_dinamico: a.sector_dinamico ?? "",
      })),
    });
  };

  const menuItems = [
    { label: "📋 Hojas Hoy", onClick: () => navigate("/supervisor/hojas-hoy") },
    { label: "🏠 Dashboard", onClick: () => navigate("/supervisor") },
  ];

  if (loading)
    return (
      <DesktopLayout
        title="Hoja de Servicio"
        menuItems={menuItems}
        user={userData}
      >
        <p style={msgStyle}>Cargando hoja...</p>
      </DesktopLayout>
    );
  if (error && !hoja)
    return (
      <DesktopLayout
        title="Hoja de Servicio"
        menuItems={menuItems}
        user={userData}
      >
        <p style={msgStyle}>{error}</p>
      </DesktopLayout>
    );

  const estadoConf = ESTADO_CONFIG[hoja.estado_operativo] ?? {
    color: "#64748b",
    bg: "#f1f5f9",
    label: hoja.estado_operativo,
  };
  const sup = hoja.supervisor_snapshot ?? {};
  const jef = hoja.jefatura_snapshot ?? {};
  const personal = hoja.personal_snapshot ?? [];
  const recursos = hoja.recursos_snapshot ?? [];
  const entregadoA = personal.find((p) => p.es_encargado);
  const esPendiente = hoja.estado_operativo === "pendiente";

  // Órdenes únicas (sin repetir consecutivo)
  const ordenesUnicas = [
    ...new Map(
      actividades
        .map((a) => [
          a.orden_consecutivo,
          {
            consecutivo: a.orden_consecutivo,
            nombre: ordenesMap[a.order_id]?.nombre,
          },
        ])
        .filter(([k]) => k),
    ).values(),
  ];

  // Sectores dinámicos únicos
  const sectoresDinamicos = [
    ...new Set(
      actividades.map((a) => a.sector_dinamico).filter(Boolean),
    ),
  ];

  const nombreCompleto = (snap) =>
    [snap?.rango, snap?.nombre, snap?.apellido1, snap?.apellido2]
      .filter(Boolean)
      .join(" ") || "—";

  // Helper: recurso de un oficial por resource_id en snapshot
  const getRecursoDeOficial = (oficial) => {
    const rec = recursos.find((r) => r.resource_id === oficial.resource_id);
    return rec ?? recursos[0] ?? {};
  };

  return (
    <DesktopLayout
      title="Hoja de Servicio"
      menuItems={menuItems}
      user={userData}
    >
      <div style={pageStyle}>
        {error && <div style={errorStyle}>{error}</div>}

        {/* BOTONES */}
        <div
          style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
        >
          {esPendiente && (
            <button onClick={iniciarReasignacion} style={btnSecondaryStyle}>
              🔄 Reasignar Recurso
            </button>
          )}
          <button onClick={handleGenerarPDF} style={btnPDFStyle}>
            📄 Generar PDF
          </button>
        </div>

        {/* PANEL REASIGNAR RECURSO */}
        {mostrarReasignar && (
          <div style={reasignarPanelStyle}>
            <h3
              style={{
                margin: "0 0 12px 0",
                fontSize: "16px",
                color: "#1e293b",
              }}
            >
              🔄 Reasignar Recurso
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                marginBottom: "16px",
              }}
            >
              Los recursos y personal actuales serán reemplazados. La
              planificación y jefatura no cambian.
            </p>

            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <select
                value={recursoIdAdd}
                onChange={(e) => setRecursoIdAdd(e.target.value)}
                style={selectStyle}
              >
                <option value="">Seleccione recurso</option>
                {recursosDisp
                  .filter(
                    (r) => !recursosNuevos.find((rn) => rn.recurso.id === r.id),
                  )
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre_recurso}{" "}
                      {r.indicativo ? `— ${r.indicativo}` : ""}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleAgregarRecursoNuevo}
                disabled={!recursoIdAdd}
                style={btnSecondaryStyle}
              >
                + Agregar
              </button>
            </div>

            {recursosNuevos.map((rn) => (
              <div
                key={rn.recurso.id}
                style={{ ...recursoCardStyle, marginBottom: "8px" }}
              >
                <strong>{rn.recurso.nombre_recurso}</strong>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    marginLeft: "8px",
                  }}
                >
                  {rn.recurso.unidad} | {rn.recurso.indicativo}
                </span>
                {rn.oficiales.map((o) => (
                  <div
                    key={o.id}
                    style={{ fontSize: "13px", marginTop: "4px" }}
                  >
                    <span style={rangoStyle}>{o.rango}</span> {o.nombre}{" "}
                    {o.apellido1}
                  </div>
                ))}
              </div>
            ))}

            {todosOficialesNuevos.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <label style={labelStyle}>Nuevo oficial responsable</label>
                <select
                  value={nuevoEncargadoId}
                  onChange={(e) => setNuevoEncargadoId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Seleccione</option>
                  {todosOficialesNuevos.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.rango} {o.nombre} {o.apellido1} —{" "}
                      {o.recurso.nombre_recurso}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button
                onClick={confirmarReasignacion}
                disabled={guardandoReasig}
                style={btnPrimaryStyle}
              >
                {guardandoReasig ? "Guardando..." : "Confirmar Reasignación"}
              </button>
              <button
                onClick={() => setMostrarReasignar(false)}
                style={btnCancelStyle}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div style={documentStyle}>
          {/* ENCABEZADO */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <p style={encBoldStyle}>MINISTERIO DE SEGURIDAD PÚBLICA</p>
            <p style={encBoldStyle}>DIRECCIÓN REGIONAL {regionNombre.toUpperCase()}</p>
            <p style={encBoldStyle}>DELEGACIÓN CANTONAL DE {delegacionNombre.toUpperCase()}</p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "12px",
                margin: "8px 0",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  textTransform: "uppercase",
                  fontSize: "18px",
                }}
              >
                Hoja de Servicio
              </h2>
              <span
                style={{
                  ...estadoBadgeStyle,
                  background: estadoConf.bg,
                  color: estadoConf.color,
                }}
              >
                {estadoConf.label}
              </span>
            </div>
          </div>

          {/* INFO GENERAL */}
          <SectionTitle title="INFORMACIÓN GENERAL" />
          <div style={cardBlockStyle}>
            <div style={grid4Style}>
              <InfoItem label="Número Hoja" value={hoja.numero_hoja} />
              <InfoItem label="Fecha" value={hoja.fecha} />
              <InfoItem label="Turno" value={hoja.turno_operativo} />
              <InfoItem label="Supervisor" value={nombreCompleto(sup)} />
            </div>
          </div>

          {/* ORDEN(ES) DE EJECUCIÓN */}
          <SectionTitle title="ORDEN(ES) DE EJECUCIÓN" />
          <div style={blockStyle}>
            {ordenesUnicas.length === 0
              ? "—"
              : ordenesUnicas.map((o, i) => (
                  <div key={i}>
                    {o.consecutivo}
                    {o.nombre ? ` — ${o.nombre}` : ""}
                  </div>
                ))}
          </div>

          {/* PERSONAL Y RECURSO — tabla institucional */}
          <SectionTitle title="PERSONAL Y RECURSO" />
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>GRADO</th>
                <th style={thStyle}>NOMBRES Y APELLIDOS</th>
                <th style={thStyle}>CÓD. VEHÍCULO</th>
                <th style={thStyle}>INDICATIVO</th>
                <th style={thStyle}>ALIMENTACIÓN</th>
                <th style={thStyle}>HORA</th>
              </tr>
            </thead>
            <tbody>
              {personal.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Sin personal
                  </td>
                </tr>
              ) : (
                personal.map((p, i) => {
                  const rec = getRecursoDeOficial(p);
                  return (
                    <tr
                      key={i}
                      style={p.es_encargado ? { background: "#f0fdf4" } : {}}
                    >
                      <td style={tdStyle}>{p.rango || "—"}</td>
                      <td style={tdStyle}>
                        {[p.nombre, p.apellido1, p.apellido2]
                          .filter(Boolean)
                          .join(" ")}
                        {p.es_encargado && (
                          <span style={encargadoStyle}> ★</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        {rec.unidad ?? "—"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        {rec.indicativo ?? "—"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        {hoja.tipo_comida ?? "—"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        {hoja.horario_comida
                          ? `${fmt(hoja.horario_comida)} - ${fmt(hoja.horario_comida_fin)}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* MISIONES */}
          <SectionTitle title="MISIONES DEL SERVICIO POLICIAL" />
          <div style={blockStyle}>
            {hoja.mision
              ? hoja.mision.split("\n").map((m, i) => <div key={i}>{m}</div>)
              : "—"}
          </div>

          {/* SECTORES */}
          <SectionTitle title="SECTOR(ES) DE TRABAJO" />
          <div style={blockStyle}>
            {sectoresDinamicos.length === 0
              ? "—"
              : sectoresDinamicos.map((s, i) => (
                  <div key={i}>
                    {i + 1}. {s}
                  </div>
                ))}
          </div>

          {/* NOTICIA CRIMINIS */}
          <SectionTitle title="NOTICIA CRIMINIS" />
          <div style={blockStyle}>
            {hoja.noticia_criminis || "Sin novedades."}
          </div>

          {/* TAREAS */}
          <SectionTitle title="TAREAS A DESARROLLAR DURANTE EL SERVICIO" />
          {actividades.length === 0 ? (
            <div style={blockStyle}>Sin actividades.</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: "30px" }}>No</th>
                  <th style={{ ...thStyle, width: "55px" }}>Inicio</th>
                  <th style={{ ...thStyle, width: "55px" }}>Fin</th>
                  <th style={thStyle}>Tarea</th>
                  <th style={thStyle}>Sector</th>
                </tr>
              </thead>
              <tbody>
                {actividades.map((act, i) => (
                  <tr key={i}>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{i + 1}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {fmt(act.hora_inicio)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {fmt(act.hora_fin)}
                    </td>
                    <td style={tdStyle}>
                      {act.accion_detalle || "—"}
                    </td>
                    <td style={tdStyle}>{act.sector || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* OBSERVACIONES */}
          <SectionTitle title="OBSERVACIONES" />
          <div style={blockStyle}>
            {hoja.observaciones || "Sin observaciones."}
          </div>

          {/* FIRMAS */}
          <SectionTitle title="FIRMAS" />
          <div style={cardBlockStyle}>
            <div style={grid4Style}>
              <InfoItem
                label="Entregado a"
                value={
                  entregadoA
                    ? [
                        entregadoA.rango,
                        entregadoA.nombre,
                        entregadoA.apellido1,
                      ]
                        .filter(Boolean)
                        .join(" ")
                    : "—"
                }
              />
              <InfoItem label="Oficial encargado" value={nombreCompleto(sup)} />
              <InfoItem
                label="Fecha y hora entrega"
                value={`${hoja.fecha} — ${fmt(hoja.horario_inicio)} hrs`}
              />
              <InfoItem label="Avalado por" value={nombreCompleto(jef)} />
            </div>
          </div>
        </div>
      </div>
    </DesktopLayout>
  );
}

const SectionTitle = ({ title }) => (
  <div style={sectionTitleStyle}>{title}</div>
);
const InfoItem = ({ label, value }) => (
  <div>
    <span
      style={{
        display: "block",
        fontSize: "11px",
        fontWeight: "600",
        color: "#64748b",
        marginBottom: "3px",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
    <div
      style={{
        background: "white",
        padding: "7px 10px",
        borderRadius: "6px",
        border: "1px solid #e2e8f0",
        fontSize: "13px",
        color: "#1e293b",
      }}
    >
      {value || "—"}
    </div>
  </div>
);

const pageStyle = {
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};
const documentStyle = {
  background: "white",
  maxWidth: "860px",
  margin: "0 auto",
  padding: "30px",
  borderRadius: "12px",
  boxShadow: "0 0 12px rgba(0,0,0,0.1)",
};
const encBoldStyle = {
  margin: "2px 0",
  fontWeight: "bold",
  textTransform: "uppercase",
  fontSize: "13px",
  textAlign: "center",
};
const sectionTitleStyle = {
  background: "#e2e8f0",
  padding: "6px 10px",
  fontWeight: "bold",
  fontSize: "12px",
  marginTop: "16px",
  marginBottom: "6px",
  border: "1px solid #cbd5e1",
  textTransform: "uppercase",
};
const blockStyle = {
  border: "1px solid #cbd5e1",
  padding: "10px",
  marginBottom: "4px",
  minHeight: "36px",
  fontSize: "13px",
  lineHeight: "1.6",
  borderRadius: "4px",
};
const cardBlockStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "14px",
  background: "#f8fafc",
  marginBottom: "4px",
};
const grid4Style = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
};
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "12px",
  marginBottom: "4px",
};
const thStyle = {
  textAlign: "left",
  padding: "7px 10px",
  background: "#f1f5f9",
  borderBottom: "2px solid #e2e8f0",
  fontWeight: "600",
  color: "#374151",
  fontSize: "11px",
};
const tdStyle = {
  padding: "7px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#1e293b",
  verticalAlign: "top",
};
const estadoBadgeStyle = {
  padding: "3px 10px",
  borderRadius: "12px",
  fontSize: "12px",
  fontWeight: "600",
};
const encargadoStyle = { color: "#16a34a", fontWeight: "bold" };
const reasignarPanelStyle = {
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "12px",
  padding: "20px",
};
const recursoCardStyle = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "12px",
};
const rangoStyle = {
  background: "#1e293b",
  color: "white",
  padding: "1px 6px",
  borderRadius: "4px",
  fontSize: "11px",
  fontFamily: "monospace",
};
const labelStyle = {
  fontSize: "13px",
  fontWeight: "500",
  color: "#374151",
  marginBottom: "4px",
  display: "block",
};
const inputStyle = {
  padding: "9px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const selectStyle = { ...inputStyle, background: "white" };
const errorStyle = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "13px",
  color: "#dc2626",
};
const msgStyle = { padding: "20px", textAlign: "center", color: "#64748b" };
const btnPrimaryStyle = {
  padding: "10px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "14px",
};
const btnSecondaryStyle = {
  padding: "8px 16px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  background: "white",
  color: "#1e293b",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "13px",
};
const btnCancelStyle = {
  padding: "10px 20px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  background: "white",
  color: "#64748b",
  cursor: "pointer",
  fontSize: "14px",
};
const btnPDFStyle = {
  padding: "10px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#dc2626",
  color: "white",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "14px",
};

export default VerHojaServicio;
