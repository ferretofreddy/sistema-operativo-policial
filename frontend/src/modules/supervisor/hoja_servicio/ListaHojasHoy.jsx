// frontend/src/modules/supervisor/hoja_servicio/ListaHojasHoy.jsx
import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ServiceSheetRepository } from "../../../core";

function ListaHojasHoy() {
  const navigate     = useNavigate();
  const { userData } = useContext(AuthContext);
  const [hojas,   setHojas]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.uid) return;

    const cargar = async () => {
      try {
        const data = await ServiceSheetRepository.getHoyByEscuadra(
          userData.escuadra_id,
          userData.region_id,
          userData.delegacion_id,
        );
        setHojas(data);
      } catch (error) {
        console.error("[ListaHojasHoy]", error.message);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [userData]);

  if (loading) return <p style={msgStyle}>Cargando hojas...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "25px" }}>
        <h1>Hojas de Servicio</h1>
        <p>Control operativo diario de hojas activas.</p>
      </div>

      {hojas.length === 0 && (
        <div style={emptyStyle}>No hay hojas registradas hoy.</div>
      )}

      <div style={{ display: "grid", gap: "20px" }}>
        {hojas.map((h) => {
          const primerRecurso = h.recursos?.[0];
          return (
            <div key={h.id} style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <h2 style={{ margin: 0 }}>{h.numero_hoja}</h2>
                  <p style={{ margin: "5px 0 0 0", color: "#475569" }}>{h.fecha}</p>
                </div>
                <div style={statusStyle}>{h.estado_operativo || "pendiente"}</div>
              </div>

              <div style={gridStyle}>
                <InfoItem label="Escuadra"   value={h.escuadra_nombre} />
                <InfoItem label="Supervisor" value={h.supervisor_nombre} />
                <InfoItem label="Turno"      value={h.turno_operativo} />
                <InfoItem label="Encargado"  value={h.entregado_a?.nombre || "N/A"} />
                <InfoItem label="Recursos"   value={h.recursos?.length || 0} />
                <InfoItem label="Unidad"     value={primerRecurso?.unidad || "N/A"} />
              </div>

              <div style={{ marginTop: "20px" }}>
                <strong>Misión</strong>
                <p style={{ marginTop: "8px", lineHeight: "1.5" }}>{h.mision}</p>
              </div>

              <div style={{ marginTop: "25px" }}>
                <button
                  onClick={() => navigate(`/supervisor/hoja-servicio/${h.id}`)}
                  style={buttonStyle}
                >
                  Ver / Editar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const InfoItem = ({ label, value }) => (
  <div>
    <strong>{label}</strong>
    <p style={{ marginTop: "5px" }}>{value}</p>
  </div>
);

const msgStyle        = { padding: "20px", textAlign: "center", color: "#64748b" };
const emptyStyle      = { background: "white", padding: "30px", borderRadius: "12px", textAlign: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" };
const cardStyle       = { background: "white", padding: "20px", borderRadius: "14px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" };
const cardHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "20px" };
const gridStyle       = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "15px" };
const buttonStyle     = { width: "100%", padding: "12px", background: "#0f172a", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" };
const statusStyle     = { background: "#facc15", color: "#1e293b", padding: "6px 12px", borderRadius: "20px", fontWeight: "bold", textTransform: "uppercase", fontSize: "12px" };

export default ListaHojasHoy;
