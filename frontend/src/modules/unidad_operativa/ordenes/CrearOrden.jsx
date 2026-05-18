// frontend/src/modules/unidad_operativa/ordenes/CrearOrden.jsx
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { OrderRepository, validateOrden } from "../../../core";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

function CrearOrden() {
  const navigate = useNavigate();
  const { userData } = useContext(AuthContext);

  const [consecutivo, setConsecutivo]   = useState("");
  const [nombre, setNombre]             = useState("");
  const [codigo, setCodigo]             = useState("");
  const [fechaInicio, setFechaInicio]   = useState("");
  const [fechaFin, setFechaFin]         = useState("");
  const [loading, setLoading]           = useState(false);
  const [errors, setErrors]             = useState([]);

  // =========================================
  // CREAR ORDEN
  // =========================================

  const handleCrear = async () => {
    setErrors([]);

    // Validación centralizada — ya no está dentro del componente
    const validation = validateOrden({
      consecutivo,
      nombre,
      fechaInicio,
      fechaFin,
      region_id: userData?.region_id,
      delegacion_id: userData?.delegacion_id,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setLoading(true);

      // Repository maneja la validación de duplicado y el insert
      await OrderRepository.create({
        consecutivo: consecutivo.trim().toUpperCase(),
        nombre: nombre.trim(),
        codigo: codigo.trim().toUpperCase(),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        region_id: userData.region_id,
        region_nombre: userData.region_nombre,
        delegacion_id: userData.delegacion_id,
        delegacion_nombre: userData.delegacion_nombre,
        creado_por: userData.uid,
        creado_por_nombre: [userData.nombre, userData.apellido1, userData.apellido2]
          .filter(Boolean)
          .join(" ")
          .trim()
          .toUpperCase(),
        rol_creador: userData.rol,
        estado: "activa",
      });

      alert("Orden creada correctamente");
      setConsecutivo("");
      setNombre("");
      setCodigo("");
      setFechaInicio("");
      setFechaFin("");
    } catch (error) {
      console.error("[CrearOrden]", error.message);
      // El repository lanza errores con mensajes de dominio legibles
      setErrors([error.message]);
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // RENDER
  // =========================================

  const menuItems = [
    { label: "🏠 Dashboard", onClick: () => navigate("/unidad_operativa") },
    { label: "📋 Lista Órdenes", onClick: () => navigate("/unidad_operativa/ordenes") },
  ];

  return (
    <DesktopLayout title="Crear Orden" menuItems={menuItems} user={userData}>
      <div style={containerStyle}>
        <Section
          title="Crear Orden de Ejecución"
          subtitle="Registro de órdenes operativas institucionales"
        >
          {errors.length > 0 && (
            <div style={errorsStyle} role="alert">
              {errors.map((e, i) => <div key={i}>• {e}</div>)}
            </div>
          )}

          <div style={formGridStyle}>
            <FormField label="Consecutivo" required>
              <input
                value={consecutivo}
                onChange={(e) => setConsecutivo(e.target.value)}
                placeholder="ORECPO N° 001-2026"
                style={inputStyle}
              />
            </FormField>
            <FormField label="Nombre Orden" required fullWidth>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Operativo Regional"
                style={inputStyle}
              />
            </FormField>
            <FormField label="Código">
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="DR10-D97-UO"
                style={inputStyle}
              />
            </FormField>
            <FormField label="Fecha Inicio" required>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Fecha Fin" required>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                style={inputStyle}
              />
            </FormField>
          </div>

          <button
            onClick={handleCrear}
            disabled={loading}
            style={{ ...primaryButtonStyle, ...(loading ? disabledStyle : {}) }}
          >
            {loading ? "Guardando..." : "Crear Orden"}
          </button>
        </Section>
      </div>
    </DesktopLayout>
  );
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

const FormField = ({ label, children, required, fullWidth }) => (
  <div style={fullWidth ? { gridColumn: "1 / -1" } : {}}>
    <label style={labelStyle}>
      {label}{required && <span style={requiredStyle}> *</span>}
    </label>
    {children}
  </div>
);

// =========================================
// ESTILOS
// =========================================

const containerStyle      = { padding: "20px" };
const sectionStyle        = { background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", marginBottom: "20px" };
const sectionTitleStyle   = { margin: "0 0 4px 0", fontSize: "20px", fontWeight: "600", color: "#1e293b" };
const sectionSubtitleStyle = { margin: "0 0 15px 0", fontSize: "14px", color: "#64748b" };
const dividerStyle        = { border: "none", borderTop: "1px solid #e2e8f0", margin: "15px 0" };
const formGridStyle       = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "15px", marginBottom: "20px" };
const labelStyle          = { display: "block", fontWeight: "500", marginBottom: "5px", fontSize: "14px", color: "#334155" };
const requiredStyle       = { color: "#dc2626" };
const inputStyle          = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box", fontSize: "14px" };
const primaryButtonStyle  = { padding: "12px 24px", border: "none", borderRadius: "8px", background: "#1e293b", color: "white", cursor: "pointer", fontWeight: "500", fontSize: "14px" };
const disabledStyle       = { background: "#94a3b8", cursor: "not-allowed" };
const errorsStyle         = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#dc2626", lineHeight: "1.8" };

export default CrearOrden;
