import { useEffect, useState } from "react";

import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

import { sendPasswordResetEmail } from "firebase/auth";

import { db, auth } from "../../../services/firebase";

function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([]);

  const [regiones, setRegiones] = useState([]);

  const [delegaciones, setDelegaciones] = useState([]);

  const [busqueda, setBusqueda] = useState("");

  const [usuarioEditando, setUsuarioEditando] = useState(null);

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

  // 🔥 CARGAR REGIONES
  const cargarRegiones = async () => {
    try {
      const snapshot = await getDocs(collection(db, "regiones"));

      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setRegiones(lista);
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

      setDelegaciones(lista);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarUsuarios();

    cargarRegiones();

    cargarDelegaciones();
  }, []);

  // 🔥 FILTRADOS
  const usuariosFiltrados = usuarios.filter((u) => {
    const texto = `
        ${u.nombre || ""}
        ${u.apellido1 || ""}
        ${u.apellido2 || ""}
        ${u.cedula || ""}
        ${u.email || ""}
      `.toLowerCase();

    return texto.includes(busqueda.toLowerCase());
  });

  // 🔥 RESET PASSWORD
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);

      alert("Correo de recuperación enviado");
    } catch (error) {
      console.error(error);

      alert("Error enviando recuperación");
    }
  };

  // 🔥 GUARDAR
  const guardarUsuario = async () => {
    try {
      await updateDoc(doc(db, "usuarios", usuarioEditando.id), {
        rol: usuarioEditando.rol,

        estado_usuario: usuarioEditando.estado_usuario,

        region_id: usuarioEditando.region_id,

        region_nombre: usuarioEditando.region_nombre,

        delegacion_id: usuarioEditando.delegacion_id,

        delegacion_nombre: usuarioEditando.delegacion_nombre,

        telefono: usuarioEditando.telefono || "",

        domicilio: usuarioEditando.domicilio || "",
      });

      alert("Usuario actualizado");

      setUsuarioEditando(null);

      await cargarUsuarios();
    } catch (error) {
      console.error(error);

      alert("Error al actualizar");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Gestión Usuarios</h2>

      {/* BUSCADOR */}
      <input
        placeholder="Buscar usuario"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{
          marginBottom: "20px",
          width: "300px",
        }}
      />

      {/* LISTA */}
      <div>
        {usuariosFiltrados.map((u) => (
          <div
            key={u.id}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              marginBottom: "15px",
            }}
          >
            <p>
              <strong>Nombre:</strong> {u.nombre} {u.apellido1} {u.apellido2}
            </p>

            <p>
              <strong>Cédula:</strong> {u.cedula}
            </p>

            <p>
              <strong>Email:</strong> {u.email}
            </p>

            <p>
              <strong>Rol:</strong> {u.rol}
            </p>

            <p>
              <strong>Estado:</strong> {u.estado_usuario}
            </p>

            <p>
              <strong>Región:</strong> {u.region_nombre}
            </p>

            <p>
              <strong>Delegación:</strong> {u.delegacion_nombre}
            </p>

            <p>
              <strong>Escuadra:</strong> {u.escuadra_nombre || "Sin asignar"}
            </p>

            <p>
              <strong>Recurso:</strong> {u.recurso_nombre || "Sin asignar"}
            </p>

            <button
              onClick={() =>
                setUsuarioEditando({
                  ...u,
                })
              }
            >
              Editar
            </button>

            <button
              onClick={() => resetPassword(u.email)}
              style={{
                marginLeft: "10px",
              }}
            >
              Reset Password
            </button>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {usuarioEditando && (
        <div
          style={{
            border: "2px solid #000",
            padding: "20px",
            marginTop: "20px",
          }}
        >
          <h3>Editar Usuario</h3>

          <p>
            <strong>Nombre:</strong> {usuarioEditando.nombre}{" "}
            {usuarioEditando.apellido1}
          </p>

          {/* ROL */}
          <label>Rol</label>

          <br />

          <select
            value={usuarioEditando.rol}
            onChange={(e) =>
              setUsuarioEditando({
                ...usuarioEditando,

                rol: e.target.value,
              })
            }
          >
            <option value="admin">Admin</option>

            <option value="unidad_operativa">Unidad Operativa</option>

            <option value="supervisor">Supervisor</option>

            <option value="agente">Agente</option>
          </select>

          <br />
          <br />

          {/* ESTADO */}
          <label>Estado</label>

          <br />

          <select
            value={usuarioEditando.estado_usuario}
            onChange={(e) =>
              setUsuarioEditando({
                ...usuarioEditando,

                estado_usuario: e.target.value,
              })
            }
          >
            <option value="activo">Activo</option>

            <option value="inactivo">Inactivo</option>
          </select>

          <br />
          <br />

          {/* REGION */}
          <label>Región</label>

          <br />

          <select
            value={usuarioEditando.region_id}
            onChange={(e) => {
              const region = regiones.find((r) => r.id === e.target.value);

              setUsuarioEditando({
                ...usuarioEditando,

                region_id: region.id,

                region_nombre: region.nombre,

                delegacion_id: "",

                delegacion_nombre: "",
              });
            }}
          >
            <option value="">Seleccione región</option>

            {regiones.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>

          <br />
          <br />

          {/* DELEGACION */}
          <label>Delegación</label>

          <br />

          <select
            value={usuarioEditando.delegacion_id}
            onChange={(e) => {
              const delegacion = delegaciones.find(
                (d) => d.id === e.target.value,
              );

              setUsuarioEditando({
                ...usuarioEditando,

                delegacion_id: delegacion.id,

                delegacion_nombre: delegacion.nombre,
              });
            }}
          >
            <option value="">Seleccione delegación</option>

            {delegaciones
              .filter((d) => d.region_id === usuarioEditando.region_id)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
          </select>

          <br />
          <br />

          {/* TELEFONO */}
          <label>Teléfono</label>

          <br />

          <input
            value={usuarioEditando.telefono || ""}
            onChange={(e) =>
              setUsuarioEditando({
                ...usuarioEditando,

                telefono: e.target.value,
              })
            }
          />

          <br />
          <br />

          {/* DOMICILIO */}
          <label>Domicilio</label>

          <br />

          <textarea
            value={usuarioEditando.domicilio || ""}
            onChange={(e) =>
              setUsuarioEditando({
                ...usuarioEditando,

                domicilio: e.target.value,
              })
            }
          />

          <br />
          <br />

          {/* SOLO LECTURA */}
          <p>
            <strong>Escuadra:</strong> {usuarioEditando.escuadra_nombre}
          </p>

          <p>
            <strong>Recurso:</strong> {usuarioEditando.recurso_nombre}
          </p>

          <button
            onClick={guardarUsuario}
            style={{
              marginRight: "10px",
            }}
          >
            Guardar
          </button>

          <button onClick={() => setUsuarioEditando(null)}>Cancelar</button>
        </div>
      )}
    </div>
  );
}

export default GestionUsuarios;
