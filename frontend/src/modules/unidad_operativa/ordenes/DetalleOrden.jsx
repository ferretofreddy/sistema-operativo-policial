import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

function DetalleOrden() {
  const { id } = useParams();

  const [orden, setOrden] = useState(null);
  const [nuevaAccion, setNuevaAccion] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [textoEditado, setTextoEditado] = useState("");

  useEffect(() => {
    const obtenerOrden = async () => {
      try {
        const docRef = doc(db, "ordenes", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          setOrden({
            id: docSnap.id,
            ...data,
            acciones: data.acciones || [],
          });
        }
      } catch (error) {
        console.error("Error al cargar orden:", error);
      }
    };

    obtenerOrden();
  }, [id]);

  // ➕ AGREGAR ACCIÓN
  const agregarAccion = async () => {
    const texto = nuevaAccion.trim();

    if (!texto) {
      alert("Ingrese una acción");
      return;
    }

    // 🔒 evitar duplicados
    const existe = orden.acciones.some(
      (a) => a.nombre.toLowerCase() === texto.toLowerCase(),
    );

    if (existe) {
      alert("Esta acción ya existe en la orden");
      return;
    }

    const nueva = {
      id: Date.now().toString(),
      nombre: texto,
    };

    const nuevasAcciones = [...orden.acciones, nueva];

    try {
      await updateDoc(doc(db, "ordenes", id), {
        acciones: nuevasAcciones,
      });

      setOrden({ ...orden, acciones: nuevasAcciones });
      setNuevaAccion("");
    } catch (error) {
      console.error("Error al agregar acción:", error);
    }
  };

  // ❌ ELIMINAR ACCIÓN
  const eliminarAccion = async (accionId) => {
    const confirmar = confirm("¿Eliminar esta acción?");

    if (!confirmar) return;

    const nuevasAcciones = orden.acciones.filter((a) => a.id !== accionId);

    try {
      await updateDoc(doc(db, "ordenes", id), {
        acciones: nuevasAcciones,
      });

      setOrden({ ...orden, acciones: nuevasAcciones });
    } catch (error) {
      console.error("Error al eliminar acción:", error);
    }
  };

  const guardarEdicion = async (accionId) => {
    const texto = textoEditado.trim();

    if (!texto) {
      alert("Texto inválido");
      return;
    }

    const nuevasAcciones = orden.acciones.map((a) =>
      a.id === accionId ? { ...a, nombre: texto } : a,
    );

    try {
      await updateDoc(doc(db, "ordenes", id), {
        acciones: nuevasAcciones,
      });

      setOrden({ ...orden, acciones: nuevasAcciones });
      setEditandoId(null);
      setTextoEditado("");
    } catch (error) {
      console.error("Error al editar:", error);
    }
  };

  if (!orden) return <p>Cargando...</p>;

  return (
    <div>
      <h2>Detalle de Orden</h2>

      <p>
        <strong>{orden.consecutivo}</strong>
      </p>
      <p>{orden.nombre}</p>
      <p>
        {orden.fecha_inicio} - {orden.fecha_fin}
      </p>

      <hr />

      <h3>Acciones</h3>

      {orden.acciones.length === 0 && <p>No hay acciones registradas</p>}

      {orden.acciones.map((accion) => (
        <div
          key={accion.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          {editandoId === accion.id ? (
            <>
              <input
                value={textoEditado}
                onChange={(e) => setTextoEditado(e.target.value)}
              />
              <button onClick={() => guardarEdicion(accion.id)}>Guardar</button>
            </>
          ) : (
            <>
              <span>{accion.nombre}</span>

              <div>
                <button
                  onClick={() => {
                    setEditandoId(accion.id);
                    setTextoEditado(accion.nombre);
                  }}
                >
                  Editar
                </button>

                <button onClick={() => eliminarAccion(accion.id)}>
                  Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      <hr />

      <input
        placeholder="Nueva acción"
        value={nuevaAccion}
        onChange={(e) => setNuevaAccion(e.target.value)}
        style={{ width: "60%" }}
      />

      <button onClick={agregarAccion}>Agregar acción</button>
    </div>
  );
}

export default DetalleOrden;
