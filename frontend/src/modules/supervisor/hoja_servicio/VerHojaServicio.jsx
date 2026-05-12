import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { generarPDFHojaServicio } from "../../../utils/generarPDFHojaServicio";

function VerHojaServicio() {
  const { id } = useParams();
  const [hoja, setHoja] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      const ref = doc(db, "hojas_servicio", id);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setHoja({
          id: snap.id,
          ...snap.data(),
        });
      }
    };

    cargar();
  }, [id]);

  if (!hoja) return <p>Cargando...</p>;

  const ordenes = [
    ...new Set(hoja.actividades.map((a) => a.orden_consecutivo)),
  ];

  const sectores = [...new Set(hoja.actividades.map((a) => a.sector))];

  return (
    <div
      style={{
        padding: "20px",
        background: "#f4f4f4",
        minHeight: "100vh",
      }}
    >
      {/* 🔥 BOTÓN PDF */}
      <div style={{ marginBottom: "15px" }}>
        <button
          onClick={() => generarPDFHojaServicio(hoja)}
          style={{
            padding: "10px 20px",
            cursor: "pointer",
          }}
        >
          Generar PDF
        </button>
      </div>

      {/* 🔥 DOCUMENTO */}
      <div
        style={{
          background: "white",
          width: "816px",
          margin: "0 auto",
          padding: "20px",
          boxShadow: "0px 0px 10px rgba(0,0,0,0.2)",
        }}
      >
        <table
          border="1"
          cellPadding="4"
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "11px",
            fontFamily: "Arial",
          }}
        >
          <tbody>
            {/* 🔹 ENCABEZADO */}
            <tr>
              <td
                colSpan="6"
                style={{
                  textAlign: "center",
                  padding: "10px",
                  fontSize: "12px",
                }}
              >
                <strong>MINISTERIO SEGURIDAD PUBLICA</strong>
                <br />
                FUERZA PUBLICA DE COSTA RICA
                <br />
                DIRECCION REGIONAL DÉCIMA BRUNCA SUR
                <br />
                DELEGACION CANTONAL PUERTO JIMENEZ
                <br />
                <br />
                <strong
                  style={{
                    fontSize: "18px",
                  }}
                >
                  HOJA DE SERVICIO
                </strong>
              </td>
            </tr>

            {/* 🔹 NUMERO HOJA */}
            <tr>
              <td colSpan="6">
                <strong>HOJA DE SERVICIO N°:</strong> {hoja.numero_hoja}
              </td>
            </tr>

            {/* 🔹 ORDENES */}
            <tr>
              <td colSpan="6">
                <strong>ORDEN DE EJECUCIÓN:</strong>

                <br />

                {ordenes.map((o, i) => (
                  <div key={i}>{o}</div>
                ))}
              </td>
            </tr>

            {/* 🔹 FECHA / TURNO */}
            <tr>
              <td>
                <strong>FECHA</strong>
              </td>

              <td>{hoja.fecha}</td>

              <td>
                <strong>TURNO</strong>
              </td>

              <td colSpan="3">{hoja.turno_operativo}</td>
            </tr>

            {/* 🔹 ESCUADRA / SUPERVISOR */}
            <tr>
              <td>
                <strong>ESCUADRA</strong>
              </td>

              <td>{hoja.escuadra}</td>

              <td>
                <strong>SUPERVISOR</strong>
              </td>

              <td colSpan="3">{hoja.supervisor}</td>
            </tr>

            {/* 🔹 PERSONAL */}
            <tr>
              <td
                colSpan="6"
                style={{
                  background: "#eaeaea",
                }}
              >
                <strong>PERSONAL</strong>
              </td>
            </tr>

            <tr>
              <th>Grado</th>
              <th>Nombre</th>
              <th>Unidad</th>
              <th>Indicativo</th>
              <th>Alimentación</th>
              <th>Hora</th>
            </tr>

            {hoja.recursos.map((r, i) => (
              <tr key={i}>
                <td>{r.rango}</td>

                <td>{r.nombre}</td>

                <td>{r.unidad}</td>

                <td>{r.indicativo}</td>

                <td>{hoja.horario?.comida}</td>

                <td>{hoja.horario?.inicio}</td>
              </tr>
            ))}

            {/* 🔹 MISION */}
            <tr>
              <td
                colSpan="6"
                style={{
                  background: "#eaeaea",
                }}
              >
                <strong>MISIONES DEL SERVICIO POLICIAL</strong>
              </td>
            </tr>

            <tr>
              <td
                colSpan="6"
                style={{
                  padding: "10px",
                }}
              >
                {hoja.mision}
              </td>
            </tr>

            {/* 🔹 SECTORES */}
            <tr>
              <td
                colSpan="6"
                style={{
                  background: "#eaeaea",
                }}
              >
                <strong>SECTORES</strong>
              </td>
            </tr>

            <tr>
              <td
                colSpan="6"
                style={{
                  padding: "10px",
                }}
              >
                {sectores.map((s, i) => (
                  <div key={i}>
                    {i + 1}. {s}
                  </div>
                ))}
              </td>
            </tr>

            {/* 🔹 NOTICIA */}
            <tr>
              <td
                colSpan="6"
                style={{
                  background: "#eaeaea",
                }}
              >
                <strong>NOTICIA CRIMINIS</strong>
              </td>
            </tr>

            <tr>
              <td
                colSpan="6"
                style={{
                  padding: "10px",
                }}
              >
                {hoja.noticia_criminis}
              </td>
            </tr>

            {/* 🔹 TAREAS */}
            <tr>
              <td
                colSpan="6"
                style={{
                  background: "#eaeaea",
                }}
              >
                <strong>
                  TAREAS A DESARROLLAR DURANTE EL SERVICIO POLICIAL
                </strong>
              </td>
            </tr>

            <tr>
              <th>No</th>
              <th>Hora Inicio</th>
              <th>Hora Fin</th>
              <th colSpan="2">Tarea</th>
              <th>Sector</th>
            </tr>

            {hoja.actividades.map((act, i) => (
              <tr key={i}>
                <td
                  style={{
                    textAlign: "center",
                  }}
                >
                  {i + 1}
                </td>

                <td>{act.hora_inicio}</td>

                <td>{act.hora_fin}</td>

                <td colSpan="2">
                  <strong>{act.orden_consecutivo}</strong>

                  {" - "}

                  {act.accion_nombre}
                </td>

                <td>{act.sector}</td>
              </tr>
            ))}

            {/* 🔹 OBSERVACIONES */}
            <tr>
              <td
                colSpan="6"
                style={{
                  background: "#eaeaea",
                }}
              >
                <strong>OBSERVACIONES</strong>
              </td>
            </tr>

            <tr>
              <td
                colSpan="6"
                style={{
                  height: "100px",
                  verticalAlign: "top",
                  padding: "10px",
                }}
              >
                {hoja.observaciones}
              </td>
            </tr>

            {/* 🔹 FIRMAS */}
            <tr>
              <td colSpan="2">
                <strong>Entregado a:</strong>

                <br />
                <br />

                {hoja.entregado_a}
              </td>

              <td colSpan="2">
                <strong>Encargado:</strong>

                <br />
                <br />

                {hoja.supervisor}
              </td>

              <td colSpan="2">
                <strong>Jefatura:</strong>

                <br />
                <br />

                {hoja.jefatura}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VerHojaServicio;
