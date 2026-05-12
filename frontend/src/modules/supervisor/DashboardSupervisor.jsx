import { useContext } from "react";

import { useNavigate } from "react-router-dom";

import { signOut } from "firebase/auth";

import { auth } from "../../services/firebase";

import { AuthContext } from "../../context/AuthContext";

import MainLayout from "../../layouts/MainLayout";

function DashboardSupervisor() {
  const navigate = useNavigate();

  const { userData } = useContext(AuthContext);

  // 🔥 LOGOUT
  const handleLogout = async () => {
    await signOut(auth);
  };

  // 🔥 MENU
  const menuItems = [
    {
      label: "Dashboard",

      onClick: () => navigate("/supervisor"),
    },

    {
      label: "Hojas Servicio",

      onClick: () => navigate("/supervisor/hojas-hoy"),
    },

    {
      label: "Crear Hoja",

      onClick: () => navigate("/supervisor/hoja-servicio"),
    },

    {
      label: "Recursos",

      onClick: () => navigate("/supervisor/recursos"),
    },

    {
      label: "Gestión Recursos",

      onClick: () => navigate("/supervisor/gestion-recursos"),
    },

    {
      label: "Planificación",

      onClick: () => navigate("/supervisor/planificacion"),
    },
  ];

  return (
    <MainLayout title="Supervisor" menuItems={menuItems}>
      <div>
        {/* 🔥 HEADER */}
        <div
          style={{
            background: "white",

            padding: "20px",

            borderRadius: "12px",

            marginBottom: "20px",

            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          <h1>Panel Supervisor</h1>

          <p>Gestión operativa diaria.</p>

          <hr />

          <p>
            <strong>Supervisor:</strong>{" "}
            {`
              ${userData?.nombre || ""}
              ${userData?.apellido1 || ""}
              ${userData?.apellido2 || ""}
            `}
          </p>

          <p>
            <strong>Región:</strong> {userData?.region_nombre}
          </p>

          <p>
            <strong>Delegación:</strong> {userData?.delegacion_nombre}
          </p>

          <p>
            <strong>Escuadra:</strong>{" "}
            {userData?.escuadra_nombre || "No asignada"}
          </p>
        </div>

        {/* 🔥 MODULOS */}
        <div
          style={{
            display: "grid",

            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",

            gap: "20px",
          }}
        >
          {/* 🔥 HOJAS */}
          <div style={cardStyle}>
            <h2>Hojas Servicio</h2>

            <p>Gestión diaria de operación.</p>

            <button
              style={buttonStyle}
              onClick={() => navigate("/supervisor/hoja-servicio")}
            >
              Crear Hoja
            </button>

            <button
              style={buttonStyle}
              onClick={() => navigate("/supervisor/hojas-hoy")}
            >
              Hojas del Día
            </button>
          </div>

          {/* 🔥 RECURSOS */}
          <div style={cardStyle}>
            <h2>Recursos</h2>

            <p>Recursos operativos y asignaciones.</p>

            <button
              style={buttonStyle}
              onClick={() => navigate("/supervisor/recursos")}
            >
              Recursos Operativos
            </button>

            <button
              style={buttonStyle}
              onClick={() => navigate("/supervisor/gestion-recursos")}
            >
              Gestión Recursos
            </button>
          </div>

          {/* 🔥 PLANIFICACION */}
          <div style={cardStyle}>
            <h2>Planificación</h2>

            <p>Consulta de planificación operativa.</p>

            <button
              style={buttonStyle}
              onClick={() => navigate("/supervisor/planificacion")}
            >
              Ver Planificación
            </button>
          </div>

          {/* 🔥 SESION */}
          <div style={cardStyle}>
            <h2>Sesión</h2>

            <p>Gestión de acceso del usuario.</p>

            <button
              style={{
                ...buttonStyle,

                background: "#991b1b",
              }}
              onClick={handleLogout}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// 🔥 CARD
const cardStyle = {
  background: "white",

  padding: "20px",

  borderRadius: "12px",

  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",

  display: "flex",

  flexDirection: "column",

  gap: "10px",
};

// 🔥 BUTTON
const buttonStyle = {
  padding: "12px",

  border: "none",

  borderRadius: "8px",

  background: "#1e293b",

  color: "white",

  cursor: "pointer",

  width: "100%",
};

export default DashboardSupervisor;
