import { signOut } from "firebase/auth";
import { auth } from "../../services/firebase";

import { useNavigate } from "react-router-dom";

function DashboardAdmin() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Panel Administración</h1>

      <hr />

      <h2>Estructura Organizacional</h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "30px",
        }}
      >
        <button onClick={() => navigate("/admin/regiones")}>Regiones</button>

        <button onClick={() => navigate("/admin/delegaciones")}>
          Delegaciones
        </button>

        <button onClick={() => navigate("/admin/escuadras")}>Escuadras</button>

        <button onClick={() => navigate("/admin/usuarios")}>Usuarios</button>

        <button onClick={() => navigate("/admin/gestion-usuarios")}>
          Gestión Usuarios
        </button>

        <button onClick={() => navigate("/admin/recursos")}>
          Recursos Operativos
        </button>

        <button onClick={() => navigate("/admin/gestion-escuadras")}>
          Gestionar Escuadras
        </button>
        <button onClick={() => navigate("/supervisor/recursos")}>
          Recursos Operativos
        </button>
        <button onClick={() => navigate("/supervisor/gestion-recursos")}>
          Gestión Recursos
        </button>
      </div>

      <hr />

      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
}

export default DashboardAdmin;
