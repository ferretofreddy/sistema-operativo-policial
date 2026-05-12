import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../../services/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function VerPlanificacion() {
  const { id } = useParams();

  const [plan, setPlan] = useState(null);
  const [ordenes, setOrdenes] = useState([]);

  const [form, setForm] = useState({
    orden_id: "",
    accion_id: "",
    hora_inicio: "",
    hora_fin: "",
    sector: "",
    detalle: "",
  });

  const [editando, setEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({});

  // Generar Documento PDF
  const generarPDF = async () => {
    const elemento = document.getElementById("contenido-plan");

    const canvas = await html2canvas(elemento);
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, width, height);

    pdf.save("planificacion.pdf");
  };

  // Generar Excel

  const exportarExcel = (plan, ordenes, usuarioNombre = "Usuario") => {
    const obtenerOrden = (id) => {
      return ordenes.find((o) => o.id === id);
    };

    const obtenerAccion = (ordenId, accionId) => {
      const orden = ordenes.find((o) => o.id === ordenId);
      return orden?.acciones?.find((a) => a.id === accionId);
    };

    const ws = XLSX.utils.aoa_to_sheet([]);

    // 🔹 ENCABEZADO
    XLSX.utils.sheet_add_aoa(
      ws,
      [
        ["MINISTERIO DE SEGURIDAD PÚBLICA"],
        ["DIRECCIÓN REGIONAL DÉCIMA BRUNCA SUR"],
        ["DELEGACIÓN POLICIAL DE PUERTO JIMÉNEZ"],
        [`PLANIFICACIÓN: ${plan.fecha_inicio} - ${plan.fecha_fin}`],
        [`Elaborado por: ${usuarioNombre}`],
        [], // espacio
      ],
      { origin: "A1" },
    );

    // 🔹 FILA DONDE INICIA TABLA
    const startRow = 7;

    // 🔹 ENCABEZADOS DE TABLA
    const headers = [
      [
        "Día",
        "Fecha",
        "Turno",
        "Orden",
        "Código",
        "Acción",
        "Detalle",
        "Hora Inicio",
        "Hora Fin",
        "Sector",
        "Responsable",
      ],
    ];

    XLSX.utils.sheet_add_aoa(ws, headers, { origin: `A${startRow}` });

    // 🔹 DATOS
    const data = [];

    plan.dias.forEach((dia, index) => {
      const actividadesOrdenadas = [...dia.actividades].sort((a, b) =>
        a.hora_inicio.localeCompare(b.hora_inicio),
      );

      if (actividadesOrdenadas.length === 0) {
        data.push([
          index + 1,
          dia.fecha,
          dia.turno,
          "Sin actividades",
          "",
          "",
          "",
          "",
          "",
          "",
          plan.supervisor,
        ]);
      } else {
        actividadesOrdenadas.forEach((act) => {
          const orden = obtenerOrden(act.orden_id);
          const accion = obtenerAccion(act.orden_id, act.accion_id);

          data.push([
            index + 1,
            dia.fecha,
            dia.turno,
            orden?.consecutivo || "",
            orden?.codigo || "",
            accion?.nombre || "",
            act.detalle || "",
            act.hora_inicio || "",
            act.hora_fin || "",
            act.sector || "",
            plan.supervisor,
          ]);
        });
      }
    });

    XLSX.utils.sheet_add_aoa(ws, data, { origin: `A${startRow + 1}` });

    // 🔹 ANCHO DE COLUMNAS
    ws["!cols"] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 10 },
      { wch: 20 },
      { wch: 12 },
      { wch: 25 },
      { wch: 30 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Planificación");

    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    saveAs(file, "planificacion.xlsx");
  };

  useEffect(() => {
    const obtenerDatos = async () => {
      const ref = doc(db, "planificaciones", id);
      const snap = await getDoc(ref);

      if (!snap.exists()) return;

      const planData = { id: snap.id, ...snap.data() };
      setPlan(planData);

      const snapOrdenes = await getDocs(collection(db, "ordenes"));

      const todas = snapOrdenes.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const filtradas = todas.filter((orden) => {
        return (
          orden.fecha_fin >= planData.fecha_inicio &&
          orden.fecha_inicio <= planData.fecha_fin
        );
      });

      setOrdenes(filtradas);
    };

    obtenerDatos();
  }, [id]);

  const agregarActividad = async (indexDia) => {
    if (
      !form.orden_id ||
      !form.accion_id ||
      !form.hora_inicio ||
      !form.hora_fin ||
      !form.detalle ||
      !form.sector
    ) {
      alert("Complete todos los campos");
      return;
    }

    // validar orden de horas
    if (form.hora_inicio >= form.hora_fin) {
      alert("La hora de inicio debe ser menor a la hora fin");
      return;
    }

    const actividadesDia = plan.dias[indexDia].actividades;

    if (hayTraslape(actividadesDia, form)) {
      alert("Hay un traslape de horarios en este día");
      return;
    }

    const nuevaActividad = {
      ...form,
    };

    const nuevosDias = [...plan.dias];
    nuevosDias[indexDia].actividades.push(nuevaActividad);

    await updateDoc(doc(db, "planificaciones", id), {
      dias: nuevosDias,
    });

    setPlan({ ...plan, dias: nuevosDias });

    setForm({
      orden_id: "",
      accion_id: "",
      hora_inicio: "",
      hora_fin: "",
      sector: "",
      detalle: "",
    });
  };

  const accionesDeOrden = () => {
    const orden = ordenes.find((o) => o.id === form.orden_id);
    return orden?.acciones || [];
  };

  const obtenerOrden = (id) => {
    return ordenes.find((o) => o.id === id);
  };

  const obtenerAccion = (ordenId, accionId) => {
    const orden = ordenes.find((o) => o.id === ordenId);
    return orden?.acciones?.find((a) => a.id === accionId);
  };

  const hayTraslape = (actividades, nueva) => {
    const inicioNuevo = nueva.hora_inicio;
    const finNuevo = nueva.hora_fin;

    return actividades.some((act) => {
      return inicioNuevo < act.hora_fin && finNuevo > act.hora_inicio;
    });
  };

  const iniciarEdicion = (act, indexDia, indexAct) => {
    setEditando({ indexDia, indexAct });

    setFormEdit({
      ...act,
    });
  };

  const guardarEdicion = async () => {
    const { indexDia, indexAct } = editando;

    if (
      !formEdit.orden_id ||
      !formEdit.accion_id ||
      !formEdit.hora_inicio ||
      !formEdit.hora_fin ||
      !formEdit.detalle ||
      !formEdit.sector
    ) {
      alert("Complete todos los campos");
      return;
    }

    if (formEdit.hora_inicio >= formEdit.hora_fin) {
      alert("Horario inválido");
      return;
    }

    const nuevas = [...plan.dias];

    const actividades = nuevas[indexDia].actividades.filter(
      (_, i) => i !== indexAct,
    );

    // validar traslape sin incluir la actividad actual
    if (hayTraslape(actividades, formEdit)) {
      alert("Traslape de horario");
      return;
    }

    nuevas[indexDia].actividades[indexAct] = formEdit;

    await updateDoc(doc(db, "planificaciones", id), {
      dias: nuevas,
    });

    setPlan({ ...plan, dias: nuevas });
    setEditando(null);
  };

  const eliminarActividad = async (indexDia, indexAct) => {
    const confirmar = confirm("¿Eliminar esta actividad?");

    if (!confirmar) return;

    const nuevosDias = [...plan.dias];

    nuevosDias[indexDia].actividades = nuevosDias[indexDia].actividades.filter(
      (_, i) => i !== indexAct,
    );

    try {
      await updateDoc(doc(db, "planificaciones", id), {
        dias: nuevosDias,
      });

      setPlan({ ...plan, dias: nuevosDias });
    } catch (error) {
      console.error("Error al eliminar actividad:", error);
    }
  };

  if (!plan) return <p>Cargando...</p>;

  return (
    <div id="contenido-plan">
      <div>
        <h2>Planificación</h2>
        <button onClick={generarPDF}>Descargar PDF</button>
        <button onClick={() => exportarExcel(plan, ordenes)}>
          Exportar a Excel
        </button>

        {plan.dias.map((dia, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "15px",
            }}
          >
            <p>
              <strong>
                Día {index + 1} - {dia.fecha} ({dia.turno})
              </strong>
            </p>

            {/* FORMULARIO */}
            <div>
              <select
                value={form.orden_id}
                onChange={(e) =>
                  setForm({ ...form, orden_id: e.target.value, accion_id: "" })
                }
              >
                <option value="">Seleccione orden</option>
                {ordenes.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.consecutivo}
                  </option>
                ))}
              </select>

              <select
                value={form.accion_id}
                onChange={(e) =>
                  setForm({ ...form, accion_id: e.target.value })
                }
              >
                <option value="">Seleccione acción</option>
                {accionesDeOrden().map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>

              <input
                type="time"
                value={form.hora_inicio}
                onChange={(e) =>
                  setForm({ ...form, hora_inicio: e.target.value })
                }
              />

              <input
                type="time"
                value={form.hora_fin}
                onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
              />

              <input
                placeholder="Sector"
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
              />

              <input
                placeholder="Detalle (cómo)"
                value={form.detalle}
                onChange={(e) => setForm({ ...form, detalle: e.target.value })}
              />

              <button onClick={() => agregarActividad(index)}>Agregar</button>
            </div>

            <hr />

            {/* LISTA */}
            {dia.actividades.map((act, i) => {
              const orden = obtenerOrden(act.orden_id);
              const accion = obtenerAccion(act.orden_id, act.accion_id);

              return (
                <div
                  key={i}
                  style={{
                    marginBottom: "12px",
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    background: "#f9f9f9",
                  }}
                >
                  <p>
                    <strong>ORECPO:</strong>{" "}
                    {orden?.consecutivo || "Orden no encontrada"} -{" "}
                    {orden?.nombre}
                  </p>
                  <p>
                    <strong>Acción policial:</strong>{" "}
                    {accion?.nombre || "Acción no encontrada"}
                  </p>
                  <p>
                    <strong>Detalle:</strong> {act.detalle || "Sin detalle"}
                  </p>
                  <p>
                    <strong>Horario:</strong> {act.hora_inicio} - {act.hora_fin}{" "}
                    | <strong>Sector:</strong> {act.sector || "N/A"}
                  </p>
                  <p>
                    <strong>Responsable:</strong> {plan.supervisor}
                  </p>
                  <p>
                    <strong>Código:</strong> {orden?.codigo || "N/A"}
                  </p>
                  <button onClick={() => iniciarEdicion(act, index, i)}>
                    Editar
                  </button>

                  <button onClick={() => eliminarActividad(index, i)}>
                    Eliminar
                  </button>

                  {editando &&
                    editando.indexDia === index &&
                    editando.indexAct === i && (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "12px",
                          background: "#eef",
                          borderRadius: "6px",
                        }}
                      >
                        <p>
                          <strong>ORECPO: </strong>

                          <select
                            value={formEdit.orden_id}
                            onChange={(e) =>
                              setFormEdit({
                                ...formEdit,
                                orden_id: e.target.value,
                                accion_id: "", // 🔥 reset obligatorio
                              })
                            }
                          >
                            <option value="">Orden</option>
                            {ordenes.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.consecutivo}
                              </option>
                            ))}
                          </select>
                        </p>

                        <p>
                          <strong>Accion policial: </strong>
                          <select
                            value={formEdit.accion_id}
                            onChange={(e) =>
                              setFormEdit({
                                ...formEdit,
                                accion_id: e.target.value,
                              })
                            }
                          >
                            <option value="">Acción</option>
                            {(
                              ordenes.find((o) => o.id === formEdit.orden_id)
                                ?.acciones || []
                            ).map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.nombre}
                              </option>
                            ))}
                          </select>
                        </p>

                        <p>
                          <strong>Horario: </strong>
                          <input
                            type="time"
                            value={formEdit.hora_inicio}
                            onChange={(e) =>
                              setFormEdit({
                                ...formEdit,
                                hora_inicio: e.target.value,
                              })
                            }
                          />

                          <input
                            type="time"
                            value={formEdit.hora_fin}
                            onChange={(e) =>
                              setFormEdit({
                                ...formEdit,
                                hora_fin: e.target.value,
                              })
                            }
                          />
                        </p>

                        <p>
                          <strong>Sector: </strong>
                          <input
                            placeholder="Sector"
                            value={formEdit.sector}
                            onChange={(e) =>
                              setFormEdit({
                                ...formEdit,
                                sector: e.target.value,
                              })
                            }
                          />
                          <strong> Detalle: </strong>
                          <input
                            placeholder="Detalle"
                            value={formEdit.detalle}
                            onChange={(e) =>
                              setFormEdit({
                                ...formEdit,
                                detalle: e.target.value,
                              })
                            }
                          />
                        </p>

                        <button onClick={guardarEdicion}>
                          Guardar cambios
                        </button>

                        <button onClick={() => setEditando(null)}>
                          Cancelar
                        </button>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VerPlanificacion;
