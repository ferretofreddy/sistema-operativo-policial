// frontend/src/modules/unidad_operativa/ordenes/DetalleOrden.jsx
import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { AuthContext } from "../../../context/AuthContext";
import DesktopLayout from "../../../shared/layouts/DesktopLayout";

function DetalleOrden() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nuevaAccion, setNuevaAccion] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [textoEditado, setTextoEditado] = useState("");

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

  // Cargar orden
  useEffect(() => {
    const obtenerOrden = async () => {
      try {
        const docRef = doc(db, "ordenes", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (
            userData &&
            (data.region_id !== userData.region_id ||
              data.delegacion_id !== userData.delegacion_id)
          ) {
            alert("No tiene acceso a esta orden");
            navigate("/unidad_operativa/ordenes");
            return;
          }
          setOrden({ id: docSnap.id, ...data, acciones: data.acciones || [] });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (userData) obtenerOrden();
  }, [id, userData]);

  // Agregar acción
  const agregarAccion = async () => {
    const texto = nuevaAccion.trim();
    if (!texto) {
      alert("Ingrese una acción");
      return;
    }
    if (
      orden.acciones.some((a) => a.nombre.toLowerCase() === texto.toLowerCase())
    ) {
      alert("Esta acción ya existe");
      return;
    }
    const nueva = { id: Date.now().toString(), nombre: texto.toUpperCase() };
    const nuevasAcciones = [...orden.acciones, nueva];
    try {
      await updateDoc(doc(db, "ordenes", id), {
        acciones: nuevasAcciones,
        actualizado: new Date(),
      });
      setOrden({ ...orden, acciones: nuevasAcciones });
      setNuevaAccion("");
    } catch (error) {
      console.error(error);
    }
  };

  // Eliminar acción
  const eliminarAccion = async (accionId) => {
    if (!confirm("¿Eliminar acción?")) return;
    const nuevasAcciones = orden.acciones.filter((a) => a.id !== accionId);
    try {
      await updateDoc(doc(db, "ordenes", id), {
        acciones: nuevasAcciones,
        actualizado: new Date(),
      });
      setOrden({ ...orden, acciones: nuevasAcciones });
    } catch (error) {
      console.error(error);
    }
  };

  // Editar acción
  const guardarEdicion = async (accionId) => {
    const texto = textoEditado.trim();
    if (!texto) {
      alert("Texto inválido");
      return;
    }
    const nuevasAcciones = orden.acciones.map((a) =>
      a.id === accionId ? { ...a, nombre: texto.toUpperCase() } : a,
    );
    try {
      await updateDoc(doc(db, "ordenes", id), {
        acciones: nuevasAcciones,
        actualizado: new Date(),
      });
      setOrden({ ...orden, acciones: nuevasAcciones });
      setEditandoId(null);
      setTextoEditado("");
    } catch (error) {
      console.error(error);
    }
  };

  const menuItems = [
    {
      label: "📋 Lista Órdenes",
      onClick: () => navigate("/unidad_operativa/ordenes"),
    },
    { label: "🏠 Dashboard", onClick: () => navigate("/unidad_operativa") },
  ];

  if (loading)
    return (
      <DesktopLayout title="Orden" menuItems={menuItems}>
        <p style={loadingStyle}>Cargando orden...</p>
      </DesktopLayout>
    );
  if (!orden)
    return (
      <DesktopLayout title="Orden" menuItems={menuItems}>
        <p>Orden no encontrada.</p>
      </DesktopLayout>
    );

  return (
    <DesktopLayout title="Detalle Orden" menuItems={menuItems} user={userData}>
      <div style={containerStyle}>
        {/* Info */}
        <Section title={orden.consecutivo} subtitle={orden.nombre}>
          <InfoGrid>
            <InfoItem label="Código" value={orden.codigo || "N/A"} />
            <InfoItem
              label="Periodo"
              value={`${orden.fecha_inicio} - ${orden.fecha_fin}`}
            />
            <InfoItem
              label="Delegación"
              value={orden.delegacion_nombre}
              fullWidth
            />
          </InfoGrid>
        </Section>

        {/* Agregar acción */}
        <Section title="Acciones Operativas">
          <div style={addActionStyle}>
            <input
              placeholder="Nueva acción"
              value={nuevaAccion}
              onChange={(e) => setNuevaAccion(e.target.value)}
              style={inputStyle}
            />
            <button onClick={agregarAccion} style={primaryButtonStyle}>
              Agregar
            </button>
          </div>
        </Section>

        {/* Lista de acciones */}
        <div style={actionsListStyle}>
          {orden.acciones.length === 0 && (
            <p style={emptyStyle}>No existen acciones registradas.</p>
          )}
          {orden.acciones.map((accion, index) => (
            <div key={accion.id} style={actionCardStyle}>
              {editandoId === accion.id ? (
                <>
                  <input
                    value={textoEditado}
                    onChange={(e) => setTextoEditado(e.target.value)}
                    style={inputStyle}
                  />
                  <button
                    onClick={() => guardarEdicion(accion.id)}
                    style={secondaryButtonStyle}
                  >
                    Guardar
                  </button>
                </>
              ) : (
                <>
                  <h3 style={actionTitleStyle}>Acción {index + 1}</h3>
                  <p style={actionNameStyle}>{accion.nombre}</p>
                  <div style={actionActionsStyle}>
                    <button
                      onClick={() => {
                        setEditandoId(accion.id);
                        setTextoEditado(accion.nombre);
                      }}
                      style={secondaryButtonStyle}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminarAccion(accion.id)}
                      style={dangerButtonStyle}
                    >
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </DesktopLayout>
  );
}

// ─────────────────────────────────────────
// Estilos
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

const InfoGrid = ({ children }) => <div style={infoGridStyle}>{children}</div>;
const infoGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "15px",
};
const InfoItem = ({ label, value, fullWidth }) => (
  <div style={fullWidth ? { gridColumn: "1 / -1" } : {}}>
    <div style={infoLabelStyle}>{label}</div>
    <div style={infoValueStyle}>{value}</div>
  </div>
);
const infoLabelStyle = {
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "4px",
  fontWeight: "500",
};
const infoValueStyle = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#1e293b",
};

const addActionStyle = { display: "flex", gap: "10px", flexWrap: "wrap" };
const inputStyle = {
  flex: 1,
  minWidth: "250px",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "14px",
};
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

const actionsListStyle = { display: "grid", gap: "15px" };
const emptyStyle = { color: "#64748b", textAlign: "center", padding: "20px" };
const actionCardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "10px",
  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
};
const actionTitleStyle = {
  margin: "0 0 8px 0",
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e293b",
};
const actionNameStyle = {
  margin: "0 0 12px 0",
  fontSize: "14px",
  color: "#334155",
};
const actionActionsStyle = { display: "flex", gap: "10px" };

export default DetalleOrden;
