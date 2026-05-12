import { signOut } from "firebase/auth"
import { auth } from "../../services/firebase"
import CrearOrden from "./ordenes/CrearOrden"
import ListaOrdenes from "./ordenes/ListaOrdenes"
import { useNavigate } from "react-router-dom"

function DashboardUnidadOperativa() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <div>
      <h1>Panel Unidad Operativa</h1>
      <button onClick={handleLogout}>Cerrar sesión</button>
      <button onClick={() => navigate("/unidad_operativa/planificacion/crear")}>
        Crear Planificación
      </button>
      <CrearOrden />
      <hr />
      <ListaOrdenes />
    </div>
  )
}

export default DashboardUnidadOperativa