import { signOut } from "firebase/auth";

import { auth } from "../../services/firebase";

import { useNavigate } from "react-router-dom";

import MainLayout from "../../layouts/MainLayout";

function DashboardUnidadOperativa() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
  };

  // 🔥 MENU
  const menuItems = [
    {
      label: "Crear Órden Ejecución",

      onClick: () => navigate("/unidad_operativa/ordenes/crear"),
    },

    {
      label: "Planificación",

      onClick: () => navigate("/unidad_operativa/planificacion/crear"),
    },

    {
      label: "Hojas Servicio",

      onClick: () => navigate("/unidad_operativa/hojas-servicio"),
    },

    {
      label: "Escuadras",

      onClick: () => navigate("/admin/escuadras"),
    },

    {
      label: "Gestión Recursos",

      onClick: () => navigate("/supervisor/gestion-recursos"),
    },

    {
      label: "Supervisores",

      onClick: () => navigate("/admin/gestion-usuarios"),
    },

    {
      label: "Cerrar Sesión",

      onClick: handleLogout,
    },
  ];

  return (
    <MainLayout title="Unidad Operativa" menuItems={menuItems}>
      {/* 🔥 CONTENIDO */}
      <div>
        <h1>Centro Operativo</h1>

        <p>Bienvenido al panel de control de la Unidad Operativa.</p>

        <hr />

        {/* 🔥 RESUMEN */}
        <div
          style={{
            display: "grid",

            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",

            gap: "15px",

            marginTop: "20px",
          }}
        >
          {/* CARD */}
          <div
            style={{
              background: "white",

              padding: "20px",

              borderRadius: "10px",

              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            }}
          >
            <h3>Órdenes</h3>

            <p>Gestión de órdenes operativas.</p>
          </div>

          {/* CARD */}
          <div
            style={{
              background: "white",

              padding: "20px",

              borderRadius: "10px",

              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            }}
          >
            <h3>Recursos</h3>

            <p>Administración de recursos operativos.</p>
          </div>

          {/* CARD */}
          <div
            style={{
              background: "white",

              padding: "20px",

              borderRadius: "10px",

              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            }}
          >
            <h3>Supervisión</h3>

            <p>Gestión de escuadras y supervisores.</p>
          </div>

          {/* CARD */}
          <div
            style={{
              background: "white",

              padding: "20px",

              borderRadius: "10px",

              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            }}
          >
            <h3>Hojas Servicio</h3>

            <p>Control y planificación operativa.</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default DashboardUnidadOperativa;
