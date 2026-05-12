import { signOut } from "firebase/auth"
import { auth } from "../../services/firebase"

function DashboardJefatura() {

  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <div>
      <h1>Panel Jefatura</h1>
      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  )
}

export default DashboardJefatura