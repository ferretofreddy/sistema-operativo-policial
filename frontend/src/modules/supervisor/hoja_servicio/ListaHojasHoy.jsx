import { useEffect, useState, useContext } from "react";

import { db } from "../../../services/firebase";

import { collection, getDocs } from "firebase/firestore";

import { useNavigate } from "react-router-dom";

import { AuthContext } from "../../../context/AuthContext";

function ListaHojasHoy() {
  const navigate = useNavigate();

  const { userData } = useContext(AuthContext);

  const [hojas, setHojas] = useState([]);

  const [loading, setLoading] = useState(true);

  // ====================================
  //  CARGAR
  // ====================================

  useEffect(() => {
    const cargar = async () => {
      try {
        if (!userData) return;

        const snapshot = await getDocs(collection(db, "hojas_servicio"));

        const hoy = new Date().toISOString().split("T")[0];

        const lista = snapshot.docs
          .map((doc) => ({
            id: doc.id,

            ...doc.data(),
          }))
          .filter(
            (h) =>
              h.fecha === hoy &&
              h.region_id === userData.region_id &&
              h.delegacion_id === userData.delegacion_id &&
              h.escuadra_id === userData.escuadra_id,
          );

        setHojas(lista);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [userData]);

  // ====================================
  //  LOADING
  // ====================================

  if (loading) {
    return <p>Cargando hojas...</p>;
  }

  return (
    <div>
      {/* ==================================== */}
      {/* TITULO */}
      {/* ==================================== */}

      <div
        style={{
          marginBottom: "25px",
        }}
      >
        <h1>Hojas de Servicio</h1>

        <p>Control operativo diario de hojas activas.</p>
      </div>

      {/* ==================================== */}
      {/* VACIO */}
      {/* ==================================== */}

      {hojas.length === 0 && (
        <div style={emptyStyle}>No hay hojas registradas hoy.</div>
      )}

      {/* ==================================== */}
      {/* LISTA */}
      {/* ==================================== */}

      <div
        style={{
          display: "grid",

          gap: "20px",
        }}
      >
        {hojas.map((h) => {
          const primerRecurso = h.recursos?.[0];

          return (
            <div key={h.id} style={cardStyle}>
              {/* HEADER */}
              <div
                style={{
                  display: "flex",

                  justifyContent: "space-between",

                  alignItems: "center",

                  gap: "10px",

                  flexWrap: "wrap",

                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                    }}
                  >
                    {h.numero_hoja}
                  </h2>

                  <p
                    style={{
                      margin: "5px 0 0 0",

                      color: "#475569",
                    }}
                  >
                    {h.fecha}
                  </p>
                </div>

                <div style={statusStyle}>
                  {h.estado_operativo || "pendiente"}
                </div>
              </div>

              {/* INFO */}
              <div style={gridStyle}>
                <InfoItem label="Escuadra" value={h.escuadra_nombre} />

                <InfoItem label="Supervisor" value={h.supervisor_nombre} />

                <InfoItem label="Turno" value={h.turno_operativo} />

                <InfoItem
                  label="Encargado"
                  value={h.entregado_a?.nombre || "N/A"}
                />

                <InfoItem label="Recursos" value={h.recursos?.length || 0} />

                <InfoItem
                  label="Unidad Principal"
                  value={primerRecurso?.unidad || "N/A"}
                />
              </div>

              {/* MISION */}
              <div
                style={{
                  marginTop: "20px",
                }}
              >
                <strong>Misión</strong>

                <p
                  style={{
                    marginTop: "8px",

                    lineHeight: "1.5",
                  }}
                >
                  {h.mision}
                </p>
              </div>

              {/* BOTON */}
              <div
                style={{
                  marginTop: "25px",
                }}
              >
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

// ====================================
// INFO ITEM
// ====================================

function InfoItem({ label, value }) {
  return (
    <div>
      <strong>{label}</strong>

      <p
        style={{
          marginTop: "5px",
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ====================================
// STYLES
// ====================================

const cardStyle = {
  background: "white",

  padding: "20px",

  borderRadius: "14px",

  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
};

const gridStyle = {
  display: "grid",

  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",

  gap: "15px",
};

const buttonStyle = {
  width: "100%",

  padding: "12px",

  background: "#0f172a",

  color: "white",

  border: "none",

  borderRadius: "10px",

  cursor: "pointer",

  fontWeight: "bold",
};

const statusStyle = {
  background: "#facc15",

  color: "#1e293b",

  padding: "6px 12px",

  borderRadius: "20px",

  fontWeight: "bold",

  textTransform: "uppercase",

  fontSize: "12px",
};

const emptyStyle = {
  background: "white",

  padding: "30px",

  borderRadius: "12px",

  textAlign: "center",

  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
};

export default ListaHojasHoy;
