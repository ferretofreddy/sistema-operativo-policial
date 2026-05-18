// frontend/src/modules/unidad_operativa/ordenes/ListaOrdenes.jsx
import { useEffect, useState, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { OrderRepository, getUserQueryFilters } from "../../../core";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

const ESTADO_PRIORIDAD = { activa: 1, programada: 2, finalizada: 3 };
const ESTADO_COLOR     = { activa: "#16a34a", programada: "#f59e0b", finalizada: "#dc2626" };

function ListaOrdenes() {
  const navigate    = useNavigate();
  const { userData } = useContext(AuthContext);

  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro,  setFiltro]  = useState("todas");
  const [busqueda, setBusqueda] = useState("");

  // =========================================
  // CARGAR
  // =========================================

  useEffect(() => {
    if (!userData?.uid) return;

    const cargar = async () => {
      try {
        setLoading(true);
        const filters = getUserQueryFilters(userData);
        const data    = await OrderRepository.getAll(filters);

        // Ordenar por prioridad de estado
        const ordenadas = [...data].sort(
          (a, b) => (ESTADO_PRIORIDAD[a.estado] ?? 9) - (ESTADO_PRIORIDAD[b.estado] ?? 9),
        );
        setOrdenes(ordenadas);
      } catch (error) {
        console.error("[ListaOrdenes]", error.message);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [userData]);

  // =========================================
  // FILTRADO LOCAL
  // =========================================

  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((o) => {
      const coincideEstado  = filtro === "todas" || o.estado === filtro;
      const texto           = `${o.consecutivo ?? ""} ${o.nombre ?? ""} ${o.codigo ?? ""}`.toLowerCase();
      const coincideBusqueda = texto.includes(busqueda.toLowerCase());
      return coincideEstado && coincideBusqueda;
    });
  }, [ordenes, filtro, busqueda]);

  // =========================================
  // RENDER
  // =========================================

  const menuItems = [
    { label: "➕ Nueva Orden", onClick: () => navigate("/unidad_operativa/ordenes/crear") },
    { label: "🏠 Dashboard",   onClick: () => navigate("/unidad_operativa") },
  ];

  return (
    <DesktopLayout title="Órdenes" menuItems={menuItems} user={userData}>
      <div style={containerStyle}>
        <Section title="Órdenes de Ejecución" subtitle="Gestión operativa institucional">
          <input
            placeholder="Buscar orden..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={searchStyle}
          />
          <div style={filtersStyle}>
            {["todas", "activa", "programada", "finalizada"].map((estado) => (
              <button
                key={estado}
                onClick={() => setFiltro(estado)}
                style={{ ...filterBtn, ...(filtro === estado ? filterBtnActive : {}) }}
              >
                {estado}
              </button>
            ))}
          </div>

          {loading && <p style={msgStyle}>Cargando órdenes...</p>}
          {!loading && ordenesFiltradas.length === 0 && (
            <p style={msgStyle}>No existen órdenes registradas.</p>
          )}

          <div style={cardsGridStyle}>
            {ordenesFiltradas.map((orden) => (
              <div
                key={orden.id}
                onClick={() => navigate(`/unidad_operativa/orden/${orden.id}`)}
                style={cardStyle}
              >
                <h3 style={cardTitleStyle}>{orden.consecutivo}</h3>
                <p style={cardNameStyle}>{orden.nombre}</p>
                <InfoRow label="Código"  value={orden.codigo || "N/A"} />
                <InfoRow label="Periodo" value={`${orden.fecha_inicio} — ${orden.fecha_fin}`} />
                <div style={statusRowStyle}>
                  <span style={statusLabelStyle}>Estado:</span>
                  <span style={{ ...statusValueStyle, color: ESTADO_COLOR[orden.estado] ?? "#1e293b" }}>
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

const Section = ({ title, subtitle, children }) => (
  <div style={sectionStyle}>
    <h1 style={sectionTitleStyle}>{title}</h1>
    {subtitle && <p style={sectionSubtitleStyle}>{subtitle}</p>}
    <hr style={dividerStyle} />
    {children}
  </div>
);

const InfoRow = ({ label, value }) => (
  <p style={infoRowStyle}><strong>{label}:</strong> {value}</p>
);

const containerStyle       = { padding: "20px" };
const sectionStyle         = { background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" };
const sectionTitleStyle    = { margin: "0 0 4px 0", fontSize: "20px", fontWeight: "600", color: "#1e293b" };
const sectionSubtitleStyle = { margin: "0 0 15px 0", fontSize: "14px", color: "#64748b" };
const dividerStyle         = { border: "none", borderTop: "1px solid #e2e8f0", margin: "15px 0" };
const searchStyle          = { width: "100%", maxWidth: "400px", padding: "10px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px" };
const filtersStyle         = { display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" };
const filterBtn            = { padding: "10px 15px", border: "none", borderRadius: "8px", cursor: "pointer", background: "#cbd5e1", color: "#1e293b", fontWeight: "500" };
const filterBtnActive      = { background: "#1e293b", color: "white" };
const msgStyle             = { textAlign: "center", color: "#64748b", padding: "20px" };
const cardsGridStyle       = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "15px" };
const cardStyle            = { background: "#f8fafc", borderRadius: "10px", padding: "20px", cursor: "pointer", border: "1px solid #e2e8f0" };
const cardTitleStyle       = { margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600", color: "#1e293b" };
const cardNameStyle        = { margin: "0 0 12px 0", fontSize: "14px", color: "#64748b" };
const cardFooterStyle      = { margin: "12px 0 0 0", fontSize: "13px", color: "#64748b", borderTop: "1px solid #e2e8f0", paddingTop: "12px" };
const infoRowStyle         = { margin: "4px 0", fontSize: "14px", color: "#334155" };
const statusRowStyle       = { display: "flex", alignItems: "center", gap: "8px", margin: "8px 0" };
const statusLabelStyle     = { fontSize: "14px", fontWeight: "500", color: "#64748b" };
const statusValueStyle     = { fontSize: "14px", fontWeight: "600" };

export default ListaOrdenes;
