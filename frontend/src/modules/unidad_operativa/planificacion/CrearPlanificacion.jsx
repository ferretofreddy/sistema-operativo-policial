// frontend/src/modules/unidad_operativa/planificacion/CrearPlanificacion.jsx
import { useState, useEffect, useContext } from "react";
import { db } from "../../../services/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

function CrearPlanificacion() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [escuadraId, setEscuadraId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [escuadras, setEscuadras] = useState([]);
  const [escuadraSeleccionada, setEscuadraSeleccionada] = useState(null);
  const [planificaciones, setPlanificaciones] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar userData
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        if (!user?.uid) return;
        const docRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setUserData(docSnap.data());
      } catch (error) {
        console.error("Error cargando usuario:", error);
      }
    };
    cargarUsuario();
  }, [user]);

  // Cargar escuadras
  const cargarEscuadras = async () => {
    try {
      const snapshot = await getDocs(collection(db, "escuadras"));
      const lista = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (e) =>
            e.region_id === userData?.region_id &&
            e.delegacion_id === userData?.delegacion_id &&
            e.estado === "activa",
        );
      setEscuadras(lista);
    } catch (error) {
      console.error("Error cargando escuadras:", error);
    }
  };

  // Cargar planificaciones
  const cargarPlanificaciones = async () => {
    try {
      const snapshot = await getDocs(collection(db, "planificaciones"));
      const hoy = new Date().toISOString().split("T")[0];
      const lista = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (p) =>
            p.region_id === userData?.region_id &&
            p.delegacion_id === userData?.delegacion_id &&
            p.fecha_fin >= hoy,
        );
      setPlanificaciones(lista);
    } catch (error) {
      console.error("Error cargando planificaciones:", error);
    }
  };

  useEffect(() => {
    if (userData) {
      cargarEscuadras();
      cargarPlanificaciones();
    }
  }, [userData]);
  useEffect(() => {
    const encontrada = escuadras.find((e) => e.id === escuadraId);
    setEscuadraSeleccionada(encontrada || null);
  }, [escuadraId, escuadras]);

  // Crear planificación
  const handleCrear = async () => {
    if (!escuadraId || !fechaInicio) {
      alert("Complete todos los campos");
      return;
    }
    if (!userData?.region_id || !userData?.delegacion_id) {
      alert("Usuario sin región o delegación");
      return;
    }
    if (!escuadraSeleccionada) {
      alert("Seleccione una escuadra válida");
      return;
    }
    if (!escuadraSeleccionada.supervisor_uid) {
      alert("La escuadra no tiene supervisor asignado");
      return;
    }
    setLoading(true);
    try {
      const inicio = new Date(fechaInicio);
      const fin = new Date(inicio);
      fin.setDate(inicio.getDate() + 5);
      const fechaFin = fin.toISOString().split("T")[0];
      const q = query(
        collection(db, "planificaciones"),
        where("escuadra_id", "==", escuadraId),
        where("fecha_inicio", "==", fechaInicio),
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        alert("Ya existe una planificación para esta escuadra en esa fecha");
        setLoading(false);
        return;
      }
      const dias = [];
      for (let i = 0; i < 6; i++) {
        const fecha = new Date(inicio);
        fecha.setDate(inicio.getDate() + i);
        dias.push({
          fecha: fecha.toISOString().split("T")[0],
          turno: i < 3 ? "dia" : "noche",
          actividades: [],
        });
      }
      const docRef = await addDoc(collection(db, "planificaciones"), {
        region_id: userData.region_id,
        region_nombre: userData.region_nombre,
        delegacion_id: userData.delegacion_id,
        delegacion_nombre: userData.delegacion_nombre,
        escuadra_id: escuadraSeleccionada.id,
        escuadra_nombre: escuadraSeleccionada.nombre,
        supervisor_uid: escuadraSeleccionada.supervisor_uid,
        supervisor_nombre: escuadraSeleccionada.supervisor_nombre,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        dias,
        estado: "activa",
        creado_por: user.uid,
        creado_por_nombre:
          `${userData.nombre || ""} ${userData.apellido1 || ""}`.trim(),
        creado: new Date(),
      });
      alert("Planificación creada correctamente");
      setEscuadraId("");
      setFechaInicio("");
      await cargarPlanificaciones();
      navigate(`/unidad_operativa/planificacion/${docRef.id}`);
    } catch (error) {
      console.error(error);
      alert("Error creando planificación");
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { label: "🏠 Dashboard", onClick: () => navigate("/unidad_operativa") },
  ];

  return (
    <DesktopLayout title="Planificación" menuItems={menuItems} user={userData}>
      <div style={containerStyle}>
        {/* Formulario */}
        <Section
          title="Crear Planificación"
          subtitle="Gestión operativa de planificación policial"
        >
          <div style={formGridStyle}>
            <FormField label="Escuadra" required>
              <select
                value={escuadraId}
                onChange={(e) => setEscuadraId(e.target.value)}
                style={selectStyle}
              >
                <option value="">Seleccione escuadra</option>
                {escuadras.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Supervisor">
              <input
                disabled
                value={escuadraSeleccionada?.supervisor_nombre || ""}
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
          </div>
          <button
            onClick={handleCrear}
            disabled={loading}
            style={primaryButtonStyle}
          >
            {loading ? "Creando..." : "Crear Planificación"}
          </button>
        </Section>

        {/* Lista */}
        <Section title="Planificaciones Activas">
          {planificaciones.length === 0 && (
            <p style={emptyStyle}>No existen planificaciones activas.</p>
          )}
          <div style={plansListStyle}>
            {planificaciones.map((plan) => (
              <div key={plan.id} style={planCardStyle}>
                <h3 style={planTitleStyle}>{plan.escuadra_nombre}</h3>
                <InfoRow label="Supervisor" value={plan.supervisor_nombre} />
                <InfoRow
                  label="Periodo"
                  value={`${plan.fecha_inicio} - ${plan.fecha_fin}`}
                />
                <button
                  onClick={() =>
                    navigate(`/unidad_operativa/planificacion/${plan.id}`)
                  }
                  style={viewButtonStyle}
                >
                  Ver / Editar
                </button>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </DesktopLayout>
  );
}

// ─────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────
const containerStyle = { padding: "20px" };
const emptyStyle = { color: "#64748b", textAlign: "center", padding: "20px" };

const Section = ({ title, subtitle, children }) => (
  <div style={sectionStyle}>
    <h2 style={sectionTitleStyle}>{title}</h2>
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
  fontSize: "18px",
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
  marginBottom: "20px",
};
const FormField = ({ label, children, required }) => (
  <div>
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
  background: "#f8fafc",
};
const selectStyle = { ...inputStyle, background: "white" };
const primaryButtonStyle = {
  width: "100%",
  padding: "12px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "14px",
};

const plansListStyle = { display: "grid", gap: "15px" };
const planCardStyle = {
  background: "#f8fafc",
  padding: "20px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
};
const planTitleStyle = {
  margin: "0 0 8px 0",
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e293b",
};
const viewButtonStyle = {
  marginTop: "12px",
  padding: "10px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  cursor: "pointer",
  fontWeight: "500",
  width: "100%",
};
const InfoRow = ({ label, value }) => (
  <p style={infoRowStyle}>
    <strong>{label}:</strong> {value}
  </p>
);
const infoRowStyle = { margin: "4px 0", fontSize: "14px", color: "#334155" };

export default CrearPlanificacion;
