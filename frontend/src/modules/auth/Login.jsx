import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../../services/firebase"
import { useNavigate } from "react-router-dom"

function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleLogin = async () => {
    
    navigate("/")
    
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      )

      console.log("Usuario logueado:", userCredential.user)
      setError("")
    } catch (err) {
      console.error(err)
      setError("Error al iniciar sesión")
    }
  }
  

  return (
    <div>
      <h2>Iniciar Sesión</h2>

      <input
        type="email"
        placeholder="Correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br />

      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br />

      <button onClick={handleLogin}>Ingresar</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  )
}

export default Login