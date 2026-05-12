import { signOut } from "firebase/auth"
import { auth } from "../../services/firebase"

function DashboardAgente() {

  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <div>
      <h1>Panel Agente</h1>
      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  )
}

export default DashboardAgente