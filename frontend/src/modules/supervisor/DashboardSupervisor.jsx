import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../services/firebase";

function DashboardSupervisor() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div>
      <h1>Panel Supervisor</h1>

      <button onClick={() => navigate("/supervisor/hoja-servicio")}>
        Crear Hoja de Servicio
      </button>

      <button onClick={() => navigate("/supervisor/hojas-hoy")}>
        Ver Hojas del Día
      </button>
      <button onClick={() => navigate("/supervisor/recursos")}>
        Recursos Operativos
      </button>
      <button onClick={() => navigate("/supervisor/gestion-recursos")}>
        Gestión Recursos
      </button>

      <br />
      <br />

      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
}

export default DashboardSupervisor;
