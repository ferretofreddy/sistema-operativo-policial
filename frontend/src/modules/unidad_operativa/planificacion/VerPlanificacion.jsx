// frontend/src/modules/unidad_operativa/planificacion/VerPlanificacion.jsx
import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate }          from "react-router-dom";
import * as XLSX                           from "xlsx";
import { AuthContext }                     from "../../../context/AuthContext";
import {
  PlanningRepository,
  OrderRepository,
  getTerritoryScope,
  canAccessEntity,
  validateActividad,
  downloadBuffer,
  getPlanningFilename,
  MIME_TYPES,
} from "../../../core";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

// =========================================
// FORM VACÍO
// =========================================

const EMPTY_FORM = {
  orden_id:    "",
  orden_codigo: "",
  accion_id:   "",
  hora_inicio: "",
  hora_fin:    "",
  sector:      "",
  detalle:     "",
};

// =========================================
// COMPONENTE
// =========================================

function VerPlanificacion() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { userData } = useContext(AuthContext);

  const [plan,    setPlan]    = useState(null);
  const [ordenes, setOrdenes] = useState([]);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [errors,  setErrors]  = useState([]);
  const [loading, setLoading] = useState(true);

  // =========================================
  // CARGAR DATOS
  // =========================================

  useEffect(() => {
    if (!userData?.uid) return;

    const cargar = async () => {
      try {
        // 1. Cargar planificación
        const planData = await PlanningRepository.getById(id);

        if (!planData) {
          alert("Planificación no encontrada");
          navigate("/unidad_operativa");
          return;
        }

        // 2. Validar acceso territorial
        const scope = getTerritoryScope(userData);
        if (!canAccessEntity(scope, planData)) {
          alert("No tiene acceso a esta planificación");
          navigate("/unidad_operativa");
          return;
        }

        setPlan(planData);

        // 3. Cargar órdenes activas del período
        const ordenesData = await OrderRepository.getActivasByTerritoryAndPeriodo(
          {
            region_id:    planData.region_id,
            delegacion_id: planData.delegacion_id,
          },
          {
            inicio: planData.fecha_inicio,
            fin:    planData.fecha_fin,
          },
        );

        setOrdenes(ordenesData);
      } catch (error) {
        console.error("[VerPlanificacion]", error.message);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [id, userData, navigate]);

  // =========================================
  // HELPERS DE LOOKUP
  // =========================================

  const getOrden  = (ordenId)            => ordenes.find((o) => o.id === ordenId);
  const getAccion = (ordenId, accionId)  => getOrden(ordenId)?.acciones?.find((a) => a.id === accionId);
  const accionesDeOrden = ()             => getOrden(form.orden_id)?.acciones ?? [];

  // =========================================
  // AGREGAR ACTIVIDAD
  // =========================================

  const agregarActividad = async (diaIndex) => {
    setErrors([]);

    const validation = validateActividad(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    try {
      // Repository actualiza el array dias[] en Firestore
      // En PostgreSQL: INSERT en planning_activities
      await PlanningRepository.addActividad(id, diaIndex, form, plan.dias);

      // Actualizar estado local sin re-fetch
      setPlan((prev) => ({
        ...prev,
        dias: prev.dias.map((dia, i) =>
          i === diaIndex
            ? { ...dia, actividades: [...dia.actividades, form] }
            : dia,
        ),
      }));

      setForm(EMPTY_FORM);
    } catch (error) {
      console.error("[VerPlanificacion] agregarActividad:", error.message);
      setErrors([error.message]);
    }
  };

  // =========================================
  // ELIMINAR ACTIVIDAD
  // =========================================

  const eliminarActividad = async (diaIndex, actIndex) => {
    if (!confirm("¿Eliminar esta actividad?")) return;

    try {
      await PlanningRepository.removeActividad(id, diaIndex, actIndex, plan.dias);

      setPlan((prev) => ({
        ...prev,
        dias: prev.dias.map((dia, i) =>
          i === diaIndex
            ? { ...dia, actividades: dia.actividades.filter((_, ai) => ai !== actIndex) }
            : dia,
        ),
      }));
    } catch (error) {
      console.error("[VerPlanificacion] eliminarActividad:", error.message);
    }
  };

  // =========================================
  // EXPORTAR EXCEL — storageAdapter + lógica extraída del componente
  // =========================================

  const exportarExcel = () => {
    if (!plan) return;

    const datos  = buildExcelData(plan, ordenes);
    const ws     = XLSX.utils.aoa_to_sheet(datos);

    // Merge encabezado institucional (filas 0-7, columnas A:F)
    ws["!merges"] = Array.from({ length: 8 }, (_, row) => ({
      s: { r: row, c: 0 },
      e: { r: row, c: 5 },
    }));

    ws["!cols"] = [
      { wch: 28 }, { wch: 22 }, { wch: 60 },
      { wch: 14 }, { wch: 14 }, { wch: 30 }, { wch: 70 },
    ];

    const wb     = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Planificación");

    const buffer   = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const filename = getPlanningFilename(plan); // naming convention centralizada

    // storageAdapter abstrae el mecanismo de descarga
    downloadBuffer(buffer, filename, MIME_TYPES.EXCEL);
  };

  // =========================================
  // RENDER
  // =========================================

  const menuItems = [
    { label: "🏠 Dashboard",        onClick: () => navigate("/unidad_operativa") },
    { label: "🗓️ Planificaciones",  onClick: () => navigate("/unidad_operativa/planificacion/crear") },
  ];

  if (loading)
    return (
      <DesktopLayout title="Planificación" menuItems={menuItems}>
        <p style={msgStyle}>Cargando...</p>
      </DesktopLayout>
    );

  if (!plan)
    return (
      <DesktopLayout title="Planificación" menuItems={menuItems}>
        <p style={msgStyle}>Planificación no encontrada.</p>
      </DesktopLayout>
    );

  return (
    <DesktopLayout title="Planificación" menuItems={menuItems} user={userData}>
      <div style={containerStyle}>
        {/* Header */}
        <Section
          title="Planificación"
          subtitle={`${plan.escuadra_nombre} • ${plan.fecha_inicio} — ${plan.fecha_fin}`}
        >
          <button onClick={exportarExcel} style={exportButtonStyle}>
            📊 Exportar Excel
          </button>
        </Section>

        {/* Errores */}
        {errors.length > 0 && (
          <div style={errorsStyle} role="alert">
            {errors.map((e, i) => <div key={i}>• {e}</div>)}
          </div>
        )}

        {/* Días */}
        {plan.dias.map((dia, diaIndex) => (
          <div key={diaIndex} style={dayCardStyle}>
            <h2 style={dayTitleStyle}>Día {diaIndex + 1}</h2>
            <p style={daySubtitleStyle}>
              {dia.fecha} — {dia.turno.toUpperCase()}
            </p>
            <hr style={dividerStyle} />

            {/* Formulario nueva actividad */}
            <div style={formGridStyle}>
              {/* Selector orden */}
              <select
                value={form.orden_id}
                onChange={(e) => {
                  const seleccionada = ordenes.find((o) => o.id === e.target.value);
                  setForm({
                    ...form,
                    orden_id:    e.target.value,
                    orden_codigo: seleccionada?.codigo ?? "",
                    accion_id:   "",
                  });
                }}
                style={selectStyle}
              >
                <option value="">Orden</option>
                {ordenes.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.consecutivo}{o.codigo ? ` • ${o.codigo}` : ""}
                  </option>
                ))}
              </select>

              {/* Selector acción */}
              <select
                value={form.accion_id}
                onChange={(e) => setForm({ ...form, accion_id: e.target.value })}
                style={selectStyle}
              >
                <option value="">Acción</option>
                {accionesDeOrden().map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>

              <input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} style={inputStyle} />
              <input type="time" value={form.hora_fin}    onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}    style={inputStyle} />
              <input placeholder="Sector"  value={form.sector}  onChange={(e) => setForm({ ...form, sector: e.target.value })}  style={inputStyle} />
              <input placeholder="Detalle" value={form.detalle} onChange={(e) => setForm({ ...form, detalle: e.target.value })} style={inputStyle} />
            </div>

            <button onClick={() => agregarActividad(diaIndex)} style={primaryButtonStyle}>
              Agregar Actividad
            </button>

            <hr style={dividerStyle} />

            {/* Lista actividades */}
            <div style={activitiesListStyle}>
              {dia.actividades.map((act, actIndex) => {
                const orden  = getOrden(act.orden_id);
                const accion = getAccion(act.orden_id, act.accion_id);

                return (
                  <div key={actIndex} style={activityCardStyle}>
                    <InfoRow label="Orden"   value={orden?.consecutivo} />
                    <InfoRow label="Código"  value={orden?.codigo || "—"} />
                    <InfoRow label="Acción"  value={accion?.nombre} />
                    <InfoRow label="Horario" value={`${act.hora_inicio} — ${act.hora_fin}`} />
                    <InfoRow label="Sector"  value={act.sector} />
                    <InfoRow label="Detalle" value={act.detalle} />
                    <div style={activityActionsStyle}>
                      <button
                        onClick={() => eliminarActividad(diaIndex, actIndex)}
                        style={dangerButtonStyle}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </DesktopLayout>
  );
}

// =========================================
// BUILDER DE DATOS EXCEL — extraído del componente
// =========================================

function buildExcelData(plan, ordenes) {
  const ordenesMap = new Map(ordenes.map((o) => [o.id, o]));
  const datos      = [];

  // Encabezado institucional
  datos.push([`MINISTERIO DE SEGURIDAD PÚBLICA`]);
  datos.push([`DIRECCIÓN REGIONAL ${(plan.region_nombre ?? "").toUpperCase()}`]);
  datos.push([`DELEGACIÓN CANTONAL DE ${(plan.delegacion_nombre ?? "").toUpperCase()}`]);
  datos.push(["PLANIFICACIÓN OPERATIVA"]);
  datos.push([`PERIODO: ${plan.fecha_inicio} - ${plan.fecha_fin}`]);
  datos.push([`ESCUADRA: ${(plan.escuadra_nombre ?? "").toUpperCase()}`]);
  datos.push([`SUPERVISOR: ${(plan.supervisor_nombre ?? "").toUpperCase()}`]);
  datos.push([`CREADO POR: ${(plan.creado_por_nombre ?? "").toUpperCase()}`]);
  datos.push([]);

  // Días y actividades
  plan.dias.forEach((dia, diaIndex) => {
    datos.push([]);
    datos.push([`DÍA ${diaIndex + 1}`]);
    datos.push([`FECHA: ${dia.fecha}`]);
    datos.push([`TURNO: ${dia.turno.toUpperCase()}`]);
    datos.push([]);
    datos.push(["ORDEN", "CÓDIGO", "ACCIÓN", "HORA INICIO", "HORA FIN", "SECTOR", "DETALLE"]);

    dia.actividades.forEach((act) => {
      const orden  = ordenesMap.get(act.orden_id);
      const accion = orden?.acciones?.find((a) => a.id === act.accion_id);

      datos.push([
        orden?.consecutivo ?? "",
        orden?.codigo      ?? "",
        accion?.nombre     ?? "",
        act.hora_inicio,
        act.hora_fin,
        act.sector,
        act.detalle,
      ]);
    });

    datos.push([]);
    datos.push([]);
  });

  return datos;
}

// =========================================
// SUB-COMPONENTES
// =========================================

const Section = ({ title, subtitle, children }) => (
  <div style={sectionStyle}>
    <h1 style={sectionTitleStyle}>{title}</h1>
    {subtitle && <p style={sectionSubtitleStyle}>{subtitle}</p>}
    <hr style={dividerStyle} />
    {children}
  </div>
);

const InfoRow = ({ label, value }) => (
  <p style={infoRowStyle}><strong>{label}:</strong> {value ?? "—"}</p>
);

// =========================================
// ESTILOS
// =========================================

const containerStyle       = { padding: "20px" };
const msgStyle             = { padding: "20px", textAlign: "center", color: "#64748b" };
const sectionStyle         = { background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", marginBottom: "20px" };
const sectionTitleStyle    = { margin: "0 0 4px 0", fontSize: "20px", fontWeight: "600", color: "#1e293b" };
const sectionSubtitleStyle = { margin: "0 0 15px 0", fontSize: "14px", color: "#64748b" };
const dividerStyle         = { border: "none", borderTop: "1px solid #e2e8f0", margin: "15px 0" };
const exportButtonStyle    = { padding: "10px 20px", border: "none", borderRadius: "8px", background: "#16a34a", color: "white", cursor: "pointer", fontWeight: "500" };
const errorsStyle          = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#dc2626", lineHeight: "1.8" };
const dayCardStyle         = { background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", marginBottom: "20px" };
const dayTitleStyle        = { margin: "0 0 4px 0", fontSize: "18px", fontWeight: "600", color: "#1e293b" };
const daySubtitleStyle     = { margin: "0 0 15px 0", fontSize: "14px", color: "#64748b" };
const formGridStyle        = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginBottom: "20px" };
const inputStyle           = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", fontSize: "14px" };
const selectStyle          = { ...inputStyle, background: "white" };
const primaryButtonStyle   = { padding: "10px 20px", border: "none", borderRadius: "8px", background: "#1e293b", color: "white", cursor: "pointer", fontWeight: "500" };
const dangerButtonStyle    = { padding: "8px 16px", border: "none", borderRadius: "8px", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontWeight: "500" };
const activitiesListStyle  = { display: "grid", gap: "15px" };
const activityCardStyle    = { background: "#f8fafc", padding: "15px", borderRadius: "10px", border: "1px solid #e2e8f0" };
const activityActionsStyle = { display: "flex", gap: "10px", marginTop: "10px" };
const infoRowStyle         = { margin: "4px 0", fontSize: "14px", color: "#334155" };

export default VerPlanificacion;
