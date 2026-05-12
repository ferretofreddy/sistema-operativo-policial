import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  updateDoc,
  doc,
  setDoc,
} from "firebase/firestore";

import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";

import { initializeApp } from "firebase/app";

import { db, auth, app } from "../../../services/firebase";

function CrearUsuario() {
  // 🔥 SISTEMA
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [rol, setRol] = useState("agente");

  // 🔥 PERSONALES
  const [nombre, setNombre] = useState("");

  const [apellido1, setApellido1] = useState("");

  const [apellido2, setApellido2] = useState("");

  const [cedula, setCedula] = useState("");

  const [telefono, setTelefono] = useState("");

  const [fechaNacimiento, setFechaNacimiento] = useState("");

  // 🔥 LABORALES
  const [fechaAlta, setFechaAlta] = useState("");

  const [condicion, setCondicion] = useState("En servicio");

  const [regionId, setRegionId] = useState("");

  const [delegacionId, setDelegacionId] = useState("");

  // 🔥 LISTAS
  const [usuarios, setUsuarios] = useState([]);

  const [regiones, setRegiones] = useState([]);

  const [delegaciones, setDelegaciones] = useState([]);

  // 🔥 AUTH SECUNDARIO
  const secondaryApp = initializeApp(app.options, "Secondary");

  const secondaryAuth = getAuth(secondaryApp);

  // 🔥 CARGAR REGIONES
  const cargarRegiones = async () => {
    try {
      const snapshot = await getDocs(collection(db, "regiones"));

      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setRegiones(lista.filter((r) => r.estado === "activo"));
    } catch (error) {
      console.error(error);
    }
  };

  // 🔥 CARGAR DELEGACIONES
  const cargarDelegaciones = async () => {
    try {
      const snapshot = await getDocs(collection(db, "delegaciones"));

      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setDelegaciones(lista.filter((d) => d.estado === "activo"));
    } catch (error) {
      console.error(error);
    }
  };

  // 🔥 CARGAR USUARIOS
  const cargarUsuarios = async () => {
    try {
      const snapshot = await getDocs(collection(db, "usuarios"));

      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setUsuarios(lista);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarRegiones();

    cargarDelegaciones();

    cargarUsuarios();
  }, []);

  // 🔥 FILTRAR DELEGACIONES
  const delegacionesFiltradas = delegaciones.filter(
    (d) => d.region_id === regionId,
  );

  // 🔥 CREAR USUARIO REAL
  const crearUsuario = async () => {
    if (
      !nombre ||
      !apellido1 ||
      !cedula ||
      !email ||
      !password ||
      !regionId ||
      !delegacionId
    ) {
      alert("Complete campos obligatorios");

      return;
    }

    try {
      const region = regiones.find((r) => r.id === regionId);

      const delegacion = delegaciones.find((d) => d.id === delegacionId);

      // 🔥 AUTH REAL
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password,
      );

      const uid = userCredential.user.uid;

      // 🔥 FIRESTORE
      await setDoc(doc(db, "usuarios", uid), {
        uid,

        // 🔹 SISTEMA
        email,

        rol,

        estado_usuario: "activo",

        ultimo_login: null,

        // 🔹 PERSONALES
        nombre,

        apellido1,

        apellido2,

        cedula,

        telefono,

        fecha_nacimiento: fechaNacimiento,

        // 🔹 LABORALES
        fecha_alta: fechaAlta,

        condicion,

        region_id: region.id,

        region_nombre: region.nombre,

        delegacion_id: delegacion.id,

        delegacion_nombre: delegacion.nombre,

        escuadra_id: "",

        escuadra_nombre: "",

        recurso_id: "",

        recurso_nombre: "",

        creado: new Date(),
      });

      alert("Usuario creado correctamente");

      // 🔥 LIMPIAR
      setEmail("");

      setPassword("");

      setRol("agente");

      setNombre("");

      setApellido1("");

      setApellido2("");

      setCedula("");

      setTelefono("");

      setFechaNacimiento("");

      setFechaAlta("");

      setCondicion("En servicio");

      setRegionId("");

      setDelegacionId("");

      await cargarUsuarios();
    } catch (error) {
      console.error(error);

      alert(error.message);
    }
  };

  // 🔥 CAMBIAR ESTADO
  const cambiarEstado = async (id, estadoActual) => {
    try {
      await updateDoc(doc(db, "usuarios", id), {
        estado_usuario: estadoActual === "activo" ? "inactivo" : "activo",
      });

      cargarUsuarios();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Usuarios</h2>

      {/* FORMULARIO */}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "15px",
          marginBottom: "20px",
        }}
      >
        <h3>Crear Usuario</h3>

        {/* EMAIL */}
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <br />
        <br />

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Contraseña temporal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <br />
        <br />

        {/* RESTO DEL FORMULARIO */}

        {/* ROL */}
        <select value={rol} onChange={(e) => setRol(e.target.value)}>
          <option value="admin">Admin</option>

          <option value="unidad_operativa">Unidad Operativa</option>

          <option value="jefatura">Jefatura</option>

          <option value="supervisor">Supervisor</option>

          <option value="agente">Agente</option>
        </select>

        <br />
        <br />

        {/* NOMBRE */}
        <input
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <br />
        <br />

        {/* APELLIDO1 */}
        <input
          placeholder="Primer apellido"
          value={apellido1}
          onChange={(e) => setApellido1(e.target.value)}
        />

        <br />
        <br />

        {/* APELLIDO2 */}
        <input
          placeholder="Segundo apellido"
          value={apellido2}
          onChange={(e) => setApellido2(e.target.value)}
        />

        <br />
        <br />

        {/* CEDULA */}
        <input
          placeholder="Cédula"
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
        />

        <br />
        <br />

        {/* TELEFONO */}
        <input
          placeholder="Teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />

        <br />
        <br />

        {/* FECHA NACIMIENTO */}
        <input
          type="date"
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
        />

        <br />
        <br />

        {/* FECHA ALTA */}
        <input
          type="date"
          value={fechaAlta}
          onChange={(e) => setFechaAlta(e.target.value)}
        />

        <br />
        <br />

        {/* CONDICION */}
        <select
          value={condicion}
          onChange={(e) => setCondicion(e.target.value)}
        >
          <option>En servicio</option>

          <option>Vacaciones</option>

          <option>Incapacitado</option>

          <option>Licencia</option>

          <option>Suspendido</option>

          <option>Comisión</option>
        </select>

        <br />
        <br />

        {/* REGION */}
        <select
          value={regionId}
          onChange={(e) => {
            setRegionId(e.target.value);

            setDelegacionId("");
          }}
        >
          <option value="">Seleccione región</option>

          {regiones.map((r) => (
            <option key={r.id} value={r.id}>
              {r.codigo} - {r.nombre}
            </option>
          ))}
        </select>

        <br />
        <br />

        {/* DELEGACION */}
        <select
          value={delegacionId}
          onChange={(e) => setDelegacionId(e.target.value)}
        >
          <option value="">Seleccione delegación</option>

          {delegacionesFiltradas.map((d) => (
            <option key={d.id} value={d.id}>
              {d.codigo} - {d.nombre}
            </option>
          ))}
        </select>

        <br />
        <br />

        <button onClick={crearUsuario}>Crear Usuario</button>
      </div>

      {/* LISTA */}
      <div>
        <h3>Lista Usuarios</h3>

        {usuarios.length === 0 && <p>No hay usuarios registrados</p>}

        {usuarios.map((u) => (
          <div
            key={u.id}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <p>
              <strong>Nombre:</strong> {u.nombre} {u.apellido1}
            </p>

            <p>
              <strong>Email:</strong> {u.email}
            </p>

            <p>
              <strong>Rol:</strong> {u.rol}
            </p>

            <p>
              <strong>Delegación:</strong> {u.delegacion_nombre}
            </p>

            <p>
              <strong>Condición:</strong> {u.condicion}
            </p>

            <p>
              <strong>Estado:</strong> {u.estado_usuario}
            </p>

            <button onClick={() => cambiarEstado(u.id, u.estado_usuario)}>
              {u.estado_usuario === "activo" ? "Inactivar" : "Activar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CrearUsuario;
