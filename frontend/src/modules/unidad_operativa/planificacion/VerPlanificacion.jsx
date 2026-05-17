// frontend/src/modules/unidad_operativa/planificacion/VerPlanificacion.jsx
import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../services/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { AuthContext } from "../../../context/AuthContext";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function VerPlanificacion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [plan, setPlan] = useState(null);
  const [ordenes, setOrdenes] = useState([]);

  // 🔹 Form actualizado con orden_codigo
  const [form, setForm] = useState({
    orden_id: "",
    orden_codigo: "", // ← NUEVO: almacenar código de la orden
    accion_id: "",
    hora_inicio: "",
    hora_fin: "",
    sector: "",
    detalle: "",
  });

  const [editando, setEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({});

  // Cargar userData
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        if (!user?.uid) return;
        const ref = doc(db, "usuarios", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) setUserData(snap.data());
      } catch (error) {
        console.error(error);
      }
    };
    cargarUsuario();
  }, [user]);

  // EXPORTAR EXCEL (Versión mejorada - Institucional)
  const exportarExcel = (plan, ordenes) => {
    const datos = [];
    const ordenesMap = new Map(ordenes.map((o) => [o.id, o])); // Lookup O(1)

    // ─────────────────────────────────────────
    // 🔹 ENCABEZADO INSTITUCIONAL (8 filas, celdas A:F combinadas)
    // ─────────────────────────────────────────

    // Fila 1: Ministerio
    datos.push(["MINISTERIO DE SEGURIDAD PÚBLICA"]);

    // Fila 2: Dirección Regional
    datos.push([
      `DIRECCIÓN REGIONAL ${plan.region_nombre || ""}`.toUpperCase(),
    ]);

    // Fila 3: Delegación Cantonal
    datos.push([
      `DELEGACIÓN CANTONAL DE ${plan.delegacion_nombre || ""}`.toUpperCase(),
    ]);

    // Fila 4: Título
    datos.push(["PLANIFICACIÓN OPERATIVA"]);

    // Fila 5: Periodo
    datos.push([`PERIODO: ${plan.fecha_inicio} - ${plan.fecha_fin}`]);

    // Fila 6: Escuadra
    datos.push([`ESCUADRA: ${(plan.escuadra_nombre || "").toUpperCase()}`]);

    // Fila 7: Supervisor
    datos.push([`SUPERVISOR: ${(plan.supervisor_nombre || "").toUpperCase()}`]);

    // Fila 8: Creado por (confirmado: este campo SÍ existe en planificaciones)
    datos.push([`CREADO POR: ${(plan.creado_por_nombre || "").toUpperCase()}`]);

    // Fila 9: Separador vacío
    datos.push([]);

    // ─────────────────────────────────────────
    // 🔹 CUERPO: DÍAS Y ACTIVIDADES
    // ─────────────────────────────────────────

    plan.dias.forEach((dia, diaIndex) => {
      // Separador de día
      datos.push([]);
      datos.push([`DÍA ${diaIndex + 1}`]);
      datos.push([`FECHA: ${dia.fecha}`]);
      datos.push([`TURNO: ${dia.turno.toUpperCase()}`]);
      datos.push([]);

      // Cabecera de tabla (7 columnas: ORDEN, CÓDIGO, ACCIÓN, HORA INICIO, HORA FIN, SECTOR, DETALLE)
      datos.push([
        "ORDEN",
        "CÓDIGO",
        "ACCIÓN",
        "HORA INICIO",
        "HORA FIN",
        "SECTOR",
        "DETALLE",
      ]);

      // Actividades
      dia.actividades.forEach((act) => {
        const orden = ordenesMap.get(act.orden_id);
        const accion = orden?.acciones?.find((a) => a.id === act.accion_id);

        datos.push([
          orden?.consecutivo || "", // Columna A: Orden
          orden?.codigo || "", // Columna B: CÓDIGO (NUEVO)
          accion?.nombre || "", // Columna C: Acción
          act.hora_inicio, // Columna D: Hora Inicio
          act.hora_fin, // Columna E: Hora Fin
          act.sector, // Columna F: Sector
          act.detalle, // Columna G: Detalle (texto largo)
        ]);
      });

      // Separador entre días
      datos.push([]);
      datos.push([]);
    });

    // ─────────────────────────────────────────
    // 🔹 CREAR HOJA DE CÁLCULO CON FORMATO
    // ─────────────────────────────────────────

    const ws = XLSX.utils.aoa_to_sheet(datos);

    // 🔹 Combinar celdas A:F para las primeras 8 filas (encabezado institucional)
    ws["!merges"] = [];
    for (let row = 0; row < 8; row++) {
      ws["!merges"].push({ s: { r: row, c: 0 }, e: { r: row, c: 5 } });
    }

    // 🔹 Ancho de columnas (A-G) - ajustado para contenido largo
    ws["!cols"] = [
      { wch: 28 }, // A: ORDEN
      { wch: 22 }, // B: CÓDIGO
      { wch: 60 }, // C: ACCIÓN (texto largo - wrap automático)
      { wch: 14 }, // D: HORA INICIO
      { wch: 14 }, // E: HORA FIN
      { wch: 30 }, // F: SECTOR
      { wch: 70 }, // G: DETALLE (texto muy largo - wrap automático)
    ];

    // 🔹 Nota: xlsx maneja automáticamente el alto de fila según el contenido
    // Las celdas con texto largo se expanden verticalmente al abrir en Excel

    // ─────────────────────────────────────────
    // 🔹 EXPORTAR ARCHIVO
    // ─────────────────────────────────────────

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Planificación");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const file = new Blob([excelBuffer], { type: "application/octet-stream" });

    // Nombre del archivo con formato institucional
    const nombreArchivo = `PLANIFICACION_${(plan.escuadra_nombre || "SIN_ESCUADRA").replace(/\s+/g, "_")}_${plan.fecha_inicio}.xlsx`;
    saveAs(file, nombreArchivo);
  };

  // Cargar plan y órdenes
  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        const ref = doc(db, "planificaciones", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;

        const planData = { id: snap.id, ...snap.data() };

        // Validar acceso territorial
        if (
          userData &&
          (planData.region_id !== userData.region_id ||
            planData.delegacion_id !== userData.delegacion_id)
        ) {
          alert("No tiene acceso a esta planificación");
          navigate("/unidad_operativa");
          return;
        }

        setPlan(planData);

        // Cargar órdenes filtradas por territorio y periodo
        const snapOrdenes = await getDocs(collection(db, "ordenes"));
        const todas = snapOrdenes.docs.map((d) => ({ id: d.id, ...d.data() }));

        const filtradas = todas.filter((orden) => {
          const mismaRegion = orden.region_id === planData.region_id;
          const mismaDelegacion =
            orden.delegacion_id === planData.delegacion_id;
          const dentroPeriodo =
            orden.fecha_fin >= planData.fecha_inicio &&
            orden.fecha_inicio <= planData.fecha_fin;
          const activa = orden.estado === "activa";
          return mismaRegion && mismaDelegacion && dentroPeriodo && activa;
        });

        setOrdenes(filtradas);
      } catch (error) {
        console.error(error);
      }
    };

    if (userData) obtenerDatos();
  }, [id, userData]);

  // 🔹 Helpers
  const accionesDeOrden = () => {
    const orden = ordenes.find((o) => o.id === form.orden_id);
    return orden?.acciones || [];
  };

  const obtenerOrden = (id) => ordenes.find((o) => o.id === id);

  const obtenerAccion = (ordenId, accionId) => {
    const orden = ordenes.find((o) => o.id === ordenId);
    return orden?.acciones?.find((a) => a.id === accionId);
  };

  // 🔹 Agregar actividad (persiste orden_codigo)
  const agregarActividad = async (indexDia) => {
    if (
      !form.orden_id ||
      !form.accion_id ||
      !form.hora_inicio ||
      !form.hora_fin ||
      !form.sector ||
      !form.detalle
    ) {
      alert("Complete todos los campos");
      return;
    }
    if (form.hora_inicio >= form.hora_fin) {
      alert("Horario inválido");
      return;
    }

    const nuevosDias = [...plan.dias];
    nuevosDias[indexDia].actividades.push({
      ...form, // ← Incluye: orden_id, orden_codigo, accion_id, etc.
    });

    await updateDoc(doc(db, "planificaciones", id), { dias: nuevosDias });
    setPlan({ ...plan, dias: nuevosDias });

    // Reset form (incluye orden_codigo)
    setForm({
      orden_id: "",
      orden_codigo: "",
      accion_id: "",
      hora_inicio: "",
      hora_fin: "",
      sector: "",
      detalle: "",
    });
  };

  // 🔹 Eliminar actividad
  const eliminarActividad = async (indexDia, indexAct) => {
    if (!confirm("¿Eliminar actividad?")) return;

    const nuevosDias = [...plan.dias];
    nuevosDias[indexDia].actividades = nuevosDias[indexDia].actividades.filter(
      (_, i) => i !== indexAct,
    );

    await updateDoc(doc(db, "planificaciones", id), { dias: nuevosDias });
    setPlan({ ...plan, dias: nuevosDias });
  };

  // 🔹 Menú para DesktopLayout
  const menuItems = [
    { label: "🏠 Dashboard", onClick: () => navigate("/unidad_operativa") },
    {
      label: "🗓️ Planificaciones",
      onClick: () => navigate("/unidad_operativa/planificacion/crear"),
    },
  ];

  // 🔹 Loading state
  if (!plan) {
    return (
      <DesktopLayout title="Planificación" menuItems={menuItems}>
        <p style={loadingStyle}>Cargando...</p>
      </DesktopLayout>
    );
  }

  return (
    <DesktopLayout title="Planificación" menuItems={menuItems} user={userData}>
      <div style={containerStyle}>
        {/* Header institucional */}
        <Section
          title="Planificación"
          subtitle={`${plan.escuadra_nombre} • ${plan.fecha_inicio} - ${plan.fecha_fin}`}
        >
          <div style={headerActionsStyle}>
            <button
              onClick={() => exportarExcel(plan, ordenes)}
              style={exportButtonStyle}
            >
              📊 Exportar Excel
            </button>
          </div>
        </Section>

        {/* Días y actividades */}
        {plan.dias.map((dia, index) => (
          <div key={index} style={dayCardStyle}>
            <h2 style={dayTitleStyle}>Día {index + 1}</h2>
            <p style={daySubtitleStyle}>
              {dia.fecha} - {dia.turno.toUpperCase()}
            </p>
            <hr style={dividerStyle} />

            {/* Formulario para agregar actividad */}
            <div style={formGridStyle}>
              {/* Select de Órdenes - captura orden_id y orden_codigo */}
              <select
                value={form.orden_id}
                onChange={(e) => {
                  const ordenSeleccionada = ordenes.find(
                    (o) => o.id === e.target.value,
                  );
                  setForm({
                    ...form,
                    orden_id: e.target.value,
                    orden_codigo: ordenSeleccionada?.codigo || "", // ← Capturar código
                    accion_id: "",
                  });
                }}
                style={selectStyle}
              >
                <option value="">Orden</option>
                {ordenes.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.consecutivo} {o.codigo ? `• ${o.codigo}` : ""}
                  </option>
                ))}
              </select>

              {/* Select de Acciones */}
              <select
                value={form.accion_id}
                onChange={(e) =>
                  setForm({ ...form, accion_id: e.target.value })
                }
                style={selectStyle}
              >
                <option value="">Acción</option>
                {accionesDeOrden().map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>

              {/* Inputs de horario y detalles */}
              <input
                type="time"
                value={form.hora_inicio}
                onChange={(e) =>
                  setForm({ ...form, hora_inicio: e.target.value })
                }
                style={inputStyle}
              />
              <input
                type="time"
                value={form.hora_fin}
                onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Sector"
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Detalle"
                value={form.detalle}
                onChange={(e) => setForm({ ...form, detalle: e.target.value })}
                style={inputStyle}
              />
            </div>

            <button
              onClick={() => agregarActividad(index)}
              style={primaryButtonStyle}
            >
              Agregar Actividad
            </button>

            <hr style={dividerStyle} />

            {/* Lista de actividades del día */}
            <div style={activitiesListStyle}>
              {dia.actividades.map((act, i) => {
                const orden = obtenerOrden(act.orden_id);
                const accion = obtenerAccion(act.orden_id, act.accion_id);

                return (
                  <div key={i} style={activityCardStyle}>
                    <InfoRow label="Orden" value={orden?.consecutivo} />
                    <InfoRow label="Código" value={orden?.codigo || "—"} />{" "}
                    {/* ← NUEVO */}
                    <InfoRow label="Acción" value={accion?.nombre} />
                    <InfoRow
                      label="Horario"
                      value={`${act.hora_inicio} - ${act.hora_fin}`}
                    />
                    <InfoRow label="Sector" value={act.sector} />
                    <InfoRow label="Detalle" value={act.detalle} fullWidth />
                    <div style={activityActionsStyle}>
                      <button style={secondaryButtonStyle}>Editar</button>
                      <button
                        onClick={() => eliminarActividad(index, i)}
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

// ─────────────────────────────────────────
// Estilos (preservados y alineados con tu diseño)
// ─────────────────────────────────────────
const containerStyle = { padding: "20px" };
const loadingStyle = { padding: "20px", textAlign: "center", color: "#64748b" };

const Section = ({ title, subtitle, children }) => (
  <div style={sectionStyle}>
    <h1 style={sectionTitleStyle}>{title}</h1>
    {subtitle && <p style={sectionSubtitleStyle}>{subtitle}</p>}
    <hr style={dividerStyle} />
    {children}
  </div>
);

const sectionStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "10px",
  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  marginBottom: "20px",
};

const sectionTitleStyle = {
  margin: "0 0 4px 0",
  fontSize: "20px",
  fontWeight: "600",
  color: "#1e293b",
};

const sectionSubtitleStyle = {
  margin: "0 0 15px 0",
  fontSize: "14px",
  color: "#64748b",
};

const dividerStyle = {
  border: "none",
  borderTop: "1px solid #e2e8f0",
  margin: "15px 0",
};

const headerActionsStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "15px",
};

const exportButtonStyle = {
  padding: "10px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#16a34a",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
};

const dayCardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "10px",
  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  marginBottom: "20px",
};

const dayTitleStyle = {
  margin: "0 0 4px 0",
  fontSize: "18px",
  fontWeight: "600",
  color: "#1e293b",
};

const daySubtitleStyle = {
  margin: "0 0 15px 0",
  fontSize: "14px",
  color: "#64748b",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "10px",
  marginBottom: "20px",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
  fontSize: "14px",
};

const selectStyle = { ...inputStyle, background: "white" };

const primaryButtonStyle = {
  padding: "10px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
};

const secondaryButtonStyle = {
  padding: "8px 16px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "white",
  color: "#1e293b",
  cursor: "pointer",
  fontWeight: "500",
};

const dangerButtonStyle = {
  padding: "8px 16px",
  border: "none",
  borderRadius: "8px",
  background: "#fef2f2",
  color: "#dc2626",
  cursor: "pointer",
  fontWeight: "500",
};

const activitiesListStyle = { display: "grid", gap: "15px" };

const activityCardStyle = {
  background: "#f8fafc",
  padding: "15px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
};

const activityActionsStyle = {
  display: "flex",
  gap: "10px",
  marginTop: "10px",
};

const InfoRow = ({ label, value, fullWidth }) => (
  <p
    style={{ ...infoRowStyle, ...(fullWidth ? { gridColumn: "1 / -1" } : {}) }}
  >
    <strong>{label}:</strong> {value}
  </p>
);

const infoRowStyle = { margin: "4px 0", fontSize: "14px", color: "#334155" };

export default VerPlanificacion;
