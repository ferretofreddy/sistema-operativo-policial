import { useState, useContext } from "react"
import { db } from "../../../services/firebase"
import { collection, addDoc } from "firebase/firestore"
import { AuthContext } from "../../../context/AuthContext"
import { query, where, getDocs } from "firebase/firestore"

function CrearOrden() {
  const { user } = useContext(AuthContext)
  const [consecutivo, setConsecutivo] = useState("")

  const [nombre, setNombre] = useState("")
  const [codigo, setCodigo] = useState("")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")

  const handleCrear = async () => {
    try {

        // 🧱 VALIDACIÓN BÁSICA
        if (!consecutivo || !nombre || !fechaInicio || !fechaFin) {
        alert("Complete todos los campos obligatorios")
        return
        }

        // 🔍 VALIDAR DUPLICADO
        const q = query(
        collection(db, "ordenes"),
        where("consecutivo", "==", consecutivo)
        )

        const snapshot = await getDocs(q)

        if (!snapshot.empty) {
        alert("Esta orden ya fue registrada")
        return
        }

        // 💾 GUARDAR SI NO EXISTE
        await addDoc(collection(db, "ordenes"), {
        consecutivo,
        nombre,
        codigo,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        creado_por: user.uid,
        fecha_creacion: new Date()
        })

        alert("Orden registrada correctamente")

        setConsecutivo("")
        setNombre("")
        setCodigo("")
        setFechaInicio("")
        setFechaFin("")

    } catch (error) {
        console.error(error)
        alert("Error al crear orden")
    }
  }

  return (
    <div>
      <h2>Crear Orden de Ejecución</h2>

      <input
        placeholder="Consecutivo (ej: ORECPO N° 006-01-2026)"
        value={consecutivo}
        onChange={(e) => setConsecutivo(e.target.value)}
     />
    <br />    
      <input
        placeholder="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <br />

      <input
        placeholder="Código"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
      />
      <br />

      <input
        type="date"
        value={fechaInicio}
        onChange={(e) => setFechaInicio(e.target.value)}
      />
      <br />

      <input
        type="date"
        value={fechaFin}
        onChange={(e) => setFechaFin(e.target.value)}
      />
      <br />

      <button onClick={handleCrear}>Crear Orden</button>
    </div>
  )
}

export default CrearOrden