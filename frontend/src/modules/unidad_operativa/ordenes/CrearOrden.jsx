// frontend/src/modules/unidad_operativa/ordenes/CrearOrden.jsx
import { useState, useContext, useEffect } from "react";
import { db } from "../../../services/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { AuthContext } from "../../../context/AuthContext";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";
import { useNavigate } from "react-router-dom";

function CrearOrden() {
  const { user } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  // Form state
  const [consecutivo, setConsecutivo] = useState("");
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);

  // Cargar userData
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        if (!user?.uid) return;
        const ref = doc(db, "usuarios", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) setUserData(snap.data());
      } catch (error) {
        console.error("Error cargando usuario:", error);
      }
    };
    cargarUsuario();
  }, [user]);

  // Crear orden
  const handleCrear = async () => {
    try {
      setLoading(true);
      if (!userData) {
        alert("Cargando datos del usuario...");
        setLoading(false);
        return;
      }
      if (!consecutivo || !nombre || !fechaInicio || !fechaFin) {
        alert("Complete todos los campos obligatorios");
        setLoading(false);
        return;
      }
      if (!userData.region_id || !userData.delegacion_id) {
        alert("El usuario no tiene región o delegación asignada");
        setLoading(false);
        return;
      }
      if (fechaFin < fechaInicio) {
        alert("La fecha final no puede ser menor a la inicial");
        setLoading(false);
        return;
      }

      const consecutivoLimpio = consecutivo.trim().toUpperCase();
      const nombreLimpio = nombre.trim();
      const codigoLimpio = codigo.trim().toUpperCase();

      const q = query(
        collection(db, "ordenes"),
        where("consecutivo", "==", consecutivoLimpio),
        where("region_id", "==", userData.region_id),
        where("delegacion_id", "==", userData.delegacion_id),
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        alert("Ya existe una orden con ese consecutivo en esta delegación");
        setLoading(false);
        return;
      }

      await addDoc(collection(db, "ordenes"), {
        consecutivo: consecutivoLimpio,
        nombre: nombreLimpio,
        codigo: codigoLimpio,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        region_id: userData.region_id,
        region_nombre: userData.region_nombre,
        delegacion_id: userData.delegacion_id,
        delegacion_nombre: userData.delegacion_nombre,
        creado_por: user.uid,
        creado_por_nombre:
          `${userData.nombre || ""} ${userData.apellido1 || ""} ${userData.apellido2 || ""}`
            .trim()
            .toUpperCase(),
        rol_creador: userData.rol,
        estado: "activa",
        creado: new Date(),
        actualizado: new Date(),
      });
      alert("Orden creada correctamente");
      setConsecutivo("");
      setNombre("");
      setCodigo("");
      setFechaInicio("");
      setFechaFin("");
    } catch (error) {
      console.error(error);
      alert("Error creando orden");
    } finally {
      setLoading(false);
    }
  };

  // Menú para DesktopLayout
  const menuItems = [
    { label: "🏠 Dashboard", onClick: () => navigate("/unidad_operativa") },
    {
      label: "📋 Lista Órdenes",
      onClick: () => navigate("/unidad_operativa/ordenes"),
    },
  ];

  return (
    <DesktopLayout title="Crear Orden" menuItems={menuItems} user={userData}>
      <div style={containerStyle}>
        <Section
          title="Crear Orden de Ejecución"
          subtitle="Registro de órdenes operativas institucionales"
        >
          <div style={formGridStyle}>
            <FormField label="Consecutivo *" required>
              <input
                value={consecutivo}
                onChange={(e) => setConsecutivo(e.target.value)}
                placeholder="ORECPO N° 001-2026"
                style={inputStyle}
              />
            </FormField>
            <FormField label="Nombre Orden *" required fullWidth>
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
            <FormField label="Fecha Inicio *" required>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Fecha Fin *" required>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                style={inputStyle}
              />
            </FormField>
          </div>
          <div style={actionsStyle}>
            <button
              onClick={handleCrear}
              disabled={loading}
              style={primaryButtonStyle}
            >
              {loading ? "Guardando..." : "Crear Orden"}
            </button>
          </div>
        </Section>
      </div>
    </DesktopLayout>
  );
}

// ─────────────────────────────────────────
// Estilos (preservando tu diseño inline)
// ─────────────────────────────────────────
const containerStyle = { padding: "20px" };

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

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "15px",
};

const FormField = ({ label, children, required, fullWidth }) => (
  <div style={fullWidth ? { gridColumn: "1 / -1" } : {}}>
    <label style={labelStyle}>
      {label}
      {required && <span style={requiredStyle}> *</span>}
    </label>
    {children}
  </div>
);

const labelStyle = {
  display: "block",
  fontWeight: "500",
  marginBottom: "5px",
  fontSize: "14px",
  color: "#334155",
};
const requiredStyle = { color: "#dc2626" };
const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
  fontSize: "14px",
};

const actionsStyle = {
  display: "flex",
  gap: "10px",
  marginTop: "20px",
  flexWrap: "wrap",
};
const primaryButtonStyle = {
  padding: "12px 24px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "14px",
};

export default CrearOrden;
