// frontend/src/modules/unidad_operativa/ordenes/ListaOrdenes.jsx
import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../services/firebase";
import { AuthContext } from "../../../context/AuthContext";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

// Calcular estado
const calcularEstado = (inicio, fin) => {
  const hoy = new Date();
  const fechaInicio = new Date(inicio);
  const fechaFin = new Date(fin);
  if (hoy < fechaInicio) return "programada";
  if (hoy > fechaFin) return "finalizada";
  return "activa";
};

function ListaOrdenes() {
  const { user } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todas");
  const [busqueda, setBusqueda] = useState("");

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

  // Cargar órdenes
  useEffect(() => {
    const obtenerOrdenes = async () => {
      try {
        const snapshot = await getDocs(collection(db, "ordenes"));
        const lista = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            estado: calcularEstado(data.fecha_inicio, data.fecha_fin),
          };
        });
        const filtradas = lista.filter(
          (o) =>
            o.region_id === userData?.region_id &&
            o.delegacion_id === userData?.delegacion_id,
        );
        const prioridad = { activa: 1, programada: 2, finalizada: 3 };
        const ordenadas = [...filtradas].sort(
          (a, b) => prioridad[a.estado] - prioridad[b.estado],
        );
        setOrdenes(ordenadas);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (userData) obtenerOrdenes();
  }, [userData]);

  // Filtrar
  const ordenesFiltradas = ordenes.filter((o) => {
    const coincideEstado = filtro === "todas" || o.estado === filtro;
    const texto =
      `${o.consecutivo || ""} ${o.nombre || ""} ${o.codigo || ""}`.toLowerCase();
    const coincideBusqueda = texto.includes(busqueda.toLowerCase());
    return coincideEstado && coincideBusqueda;
  });

  const menuItems = [
    {
      label: "➕ Nueva Orden",
      onClick: () => navigate("/unidad_operativa/ordenes/crear"),
    },
    { label: "🏠 Dashboard", onClick: () => navigate("/unidad_operativa") },
  ];

  return (
    <DesktopLayout title="Órdenes" menuItems={menuItems} user={userData}>
      <div style={containerStyle}>
        <Section
          title="Órdenes de Ejecución"
          subtitle="Gestión operativa institucional"
        >
          {/* Buscador */}
          <input
            placeholder="Buscar orden..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={searchStyle}
          />

          {/* Filtros */}
          <div style={filtersStyle}>
            {["todas", "activa", "programada", "finalizada"].map((estado) => (
              <button
                key={estado}
                onClick={() => setFiltro(estado)}
                style={{
                  ...filterButtonStyle,
                  ...(filtro === estado ? filterButtonActiveStyle : {}),
                }}
              >
                {estado}
              </button>
            ))}
          </div>

          {/* Loading / Vacío */}
          {loading && <p style={loadingStyle}>Cargando órdenes...</p>}
          {!loading && ordenesFiltradas.length === 0 && (
            <p style={emptyStyle}>No existen órdenes registradas.</p>
          )}

          {/* Lista */}
          <div style={cardsGridStyle}>
            {ordenesFiltradas.map((orden) => (
              <div
                key={orden.id}
                onClick={() => navigate(`/unidad_operativa/orden/${orden.id}`)}
                style={cardStyle}
              >
                <h3 style={cardTitleStyle}>{orden.consecutivo}</h3>
                <p style={cardNameStyle}>{orden.nombre}</p>
                <InfoRow label="Código" value={orden.codigo || "N/A"} />
                <InfoRow
                  label="Periodo"
                  value={`${orden.fecha_inicio} - ${orden.fecha_fin}`}
                />
                <div style={statusRowStyle}>
                  <span style={statusLabelStyle}>Estado:</span>
                  <span
                    style={{
                      ...statusValueStyle,
                      color:
                        orden.estado === "activa"
                          ? "#16a34a"
                          : orden.estado === "programada"
                            ? "#f59e0b"
                            : "#dc2626",
                    }}
                  >
                    {orden.estado}
                  </span>
                </div>
                <p style={cardFooterStyle}>{orden.delegacion_nombre}</p>
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
const loadingStyle = { textAlign: "center", color: "#64748b", padding: "20px" };
const emptyStyle = { textAlign: "center", color: "#64748b", padding: "20px" };

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

const searchStyle = {
  width: "100%",
  maxWidth: "400px",
  padding: "10px",
  marginBottom: "15px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "14px",
};
const filtersStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "20px",
};
const filterButtonStyle = {
  padding: "10px 15px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  background: "#cbd5e1",
  color: "#1e293b",
  fontWeight: "500",
};
const filterButtonActiveStyle = { background: "#1e293b", color: "white" };

const cardsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "15px",
};
const cardStyle = {
  background: "#f8fafc",
  borderRadius: "10px",
  padding: "20px",
  cursor: "pointer",
  border: "1px solid #e2e8f0",
  transition: "box-shadow 0.15s",
};
const cardTitleStyle = {
  margin: "0 0 4px 0",
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e293b",
};
const cardNameStyle = {
  margin: "0 0 12px 0",
  fontSize: "14px",
  color: "#64748b",
};
const cardFooterStyle = {
  margin: "12px 0 0 0",
  fontSize: "13px",
  color: "#64748b",
  borderTop: "1px solid #e2e8f0",
  paddingTop: "12px",
};

const InfoRow = ({ label, value }) => (
  <p style={infoRowStyle}>
    <strong>{label}:</strong> {value}
  </p>
);
const infoRowStyle = { margin: "4px 0", fontSize: "14px", color: "#334155" };
const statusRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  margin: "8px 0",
};
const statusLabelStyle = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#64748b",
};
const statusValueStyle = { fontSize: "14px", fontWeight: "600" };

export default ListaOrdenes;
