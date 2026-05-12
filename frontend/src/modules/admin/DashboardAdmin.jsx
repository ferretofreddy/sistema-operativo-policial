import { signOut } from "firebase/auth"
import { auth } from "../../services/firebase"

function DashboardAdmin() {

  const handleLogout = async () => {
    await signOut(auth)
  }

  return (
    <div>
      <h1>Panel Admin</h1>
      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  )
}

export default DashboardAdmin