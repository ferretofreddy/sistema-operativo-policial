import { useEffect, useState, useContext } from "react";

import { useParams, useNavigate } from "react-router-dom";

import { db } from "../../../services/firebase";

import { doc, getDoc, updateDoc } from "firebase/firestore";

import { AuthContext } from "../../../context/AuthContext";

import MainLayout from "../../../layouts/MainLayout";

function DetalleOrden() {
  const { id } = useParams();

  const navigate = useNavigate();

  const { user } = useContext(AuthContext);

  const [orden, setOrden] = useState(null);

  const [loading, setLoading] = useState(true);

  const [nuevaAccion, setNuevaAccion] = useState("");

  const [editandoId, setEditandoId] = useState(null);

  const [textoEditado, setTextoEditado] = useState("");

  // 🔥 CARGAR
  useEffect(() => {
    const obtenerOrden = async () => {
      try {
        const docRef = doc(db, "ordenes", id);

        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          // 🔥 VALIDAR ACCESO
          if (
            data.region_id !== user.region_id ||
            data.delegacion_id !== user.delegacion_id
          ) {
            alert("No tiene acceso a esta orden");

            navigate("/unidad_operativa/ordenes");

            return;
          }

          setOrden({
            id: docSnap.id,

            ...data,

            acciones: data.acciones || [],
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      obtenerOrden();
    }
  }, [id, user]);

  // 🔥 AGREGAR
  const agregarAccion = async () => {
    const texto = nuevaAccion.trim();

    if (!texto) {
      alert("Ingrese una acción");

      return;
    }

    // 🔥 DUPLICADO
    const existe = orden.acciones.some(
      (a) => a.nombre.toLowerCase() === texto.toLowerCase(),
    );

    if (existe) {
      alert("Esta acción ya existe");

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

        actualizado: new Date(),
      });

      setOrden({
        ...orden,

        acciones: nuevasAcciones,
      });

      setNuevaAccion("");
    } catch (error) {
      console.error(error);
    }
  };

  // 🔥 ELIMINAR
  const eliminarAccion = async (accionId) => {
    const confirmar = confirm("¿Eliminar acción?");

    if (!confirmar) return;

    const nuevasAcciones = orden.acciones.filter((a) => a.id !== accionId);

    try {
      await updateDoc(doc(db, "ordenes", id), {
        acciones: nuevasAcciones,

        actualizado: new Date(),
      });

      setOrden({
        ...orden,

        acciones: nuevasAcciones,
      });
    } catch (error) {
      console.error(error);
    }
  };

  // 🔥 EDITAR
  const guardarEdicion = async (accionId) => {
    const texto = textoEditado.trim();

    if (!texto) {
      alert("Texto inválido");

      return;
    }

    const nuevasAcciones = orden.acciones.map((a) =>
      a.id === accionId
        ? {
            ...a,
            nombre: texto,
          }
        : a,
    );

    try {
      await updateDoc(doc(db, "ordenes", id), {
        acciones: nuevasAcciones,

        actualizado: new Date(),
      });

      setOrden({
        ...orden,

        acciones: nuevasAcciones,
      });

      setEditandoId(null);

      setTextoEditado("");
    } catch (error) {
      console.error(error);
    }
  };

  // 🔥 MENU
  const menuItems = [
    {
      label: "Lista Órdenes",

      onClick: () => navigate("/unidad_operativa/ordenes"),
    },

    {
      label: "Dashboard",

      onClick: () => navigate("/unidad_operativa"),
    },
  ];

  // 🔥 LOADING
  if (loading) {
    return (
      <MainLayout title="Orden" menuItems={menuItems}>
        <p>Cargando orden...</p>
      </MainLayout>
    );
  }

  // 🔥 NO EXISTE
  if (!orden) {
    return (
      <MainLayout title="Orden" menuItems={menuItems}>
        <p>Orden no encontrada.</p>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Detalle Orden" menuItems={menuItems}>
      <div>
        {/* 🔥 INFO */}
        <div
          style={{
            background: "white",

            padding: "20px",

            borderRadius: "10px",

            marginBottom: "20px",

            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}
        >
          <h1>{orden.consecutivo}</h1>

          <p>{orden.nombre}</p>

          <hr />

          <p>
            <strong>Código:</strong> {orden.codigo || "N/A"}
          </p>

          <p>
            <strong>Periodo:</strong> {orden.fecha_inicio} - {orden.fecha_fin}
          </p>

          <p>
            <strong>Delegación:</strong> {orden.delegacion_nombre}
          </p>
        </div>

        {/* 🔥 AGREGAR */}
        <div
          style={{
            background: "white",

            padding: "20px",

            borderRadius: "10px",

            marginBottom: "20px",

            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}
        >
          <h2>Acciones Operativas</h2>

          <div
            style={{
              display: "flex",

              gap: "10px",

              flexWrap: "wrap",
            }}
          >
            <input
              placeholder="Nueva acción"
              value={nuevaAccion}
              onChange={(e) => setNuevaAccion(e.target.value)}
              style={{
                flex: 1,

                minWidth: "250px",

                padding: "10px",

                borderRadius: "8px",

                border: "1px solid #ccc",
              }}
            />

            <button
              onClick={agregarAccion}
              style={{
                padding: "10px 20px",

                border: "none",

                borderRadius: "8px",

                background: "#1e293b",

                color: "white",

                cursor: "pointer",
              }}
            >
              Agregar
            </button>
          </div>
        </div>

        {/* 🔥 LISTA */}
        <div
          style={{
            display: "grid",

            gap: "15px",
          }}
        >
          {orden.acciones.length === 0 && (
            <p>No existen acciones registradas.</p>
          )}

          {orden.acciones.map((accion, index) => (
            <div
              key={accion.id}
              style={{
                background: "white",

                padding: "20px",

                borderRadius: "10px",

                boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
              }}
            >
              {editandoId === accion.id ? (
                <>
                  <input
                    value={textoEditado}
                    onChange={(e) => setTextoEditado(e.target.value)}
                    style={{
                      width: "100%",

                      padding: "10px",

                      marginBottom: "10px",

                      borderRadius: "8px",

                      border: "1px solid #ccc",
                    }}
                  />

                  <button onClick={() => guardarEdicion(accion.id)}>
                    Guardar
                  </button>
                </>
              ) : (
                <>
                  <h3>Acción {index + 1}</h3>

                  <p>{accion.nombre}</p>

                  <div
                    style={{
                      display: "flex",

                      gap: "10px",
                    }}
                  >
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
        </div>
      </div>
    </MainLayout>
  );
}

export default DetalleOrden;
