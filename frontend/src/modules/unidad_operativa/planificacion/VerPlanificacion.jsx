import { useEffect, useState, useContext } from "react";

import { useParams, useNavigate } from "react-router-dom";

import { db } from "../../../services/firebase";

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";

import { AuthContext } from "../../../context/AuthContext";

import MainLayout from "../../../layouts/MainLayout";

import * as XLSX from "xlsx";

import { saveAs } from "file-saver";

function VerPlanificacion() {
  const { id } = useParams();

  const navigate = useNavigate();

  const { user } = useContext(AuthContext);

  // 🔥 USER DATA
  const [userData, setUserData] = useState(null);

  // 🔥 DATA
  const [plan, setPlan] = useState(null);

  const [ordenes, setOrdenes] = useState([]);

  // 🔥 FORM
  const [form, setForm] = useState({
    orden_id: "",

    accion_id: "",

    hora_inicio: "",

    hora_fin: "",

    sector: "",

    detalle: "",
  });

  // 🔥 EDIT
  const [editando, setEditando] = useState(null);

  const [formEdit, setFormEdit] = useState({});

  // 🔥 CARGAR USERDATA
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        if (!user?.uid) return;

        const ref = doc(db, "usuarios", user.uid);

        const snap = await getDoc(ref);

        if (snap.exists()) {
          setUserData(snap.data());
        }
      } catch (error) {
        console.error(error);
      }
    };

    cargarUsuario();
  }, [user]);

  // 🔥 EXCEL
  const exportarExcel = (plan, ordenes) => {
    const datos = [];

    // 🔥 ENCABEZADO
    datos.push(["MINISTERIO DE SEGURIDAD PÚBLICA"]);

    datos.push([(plan.region_nombre || "").toUpperCase()]);

    datos.push([(plan.delegacion_nombre || "").toUpperCase()]);

    datos.push([`PLANIFICACIÓN OPERATIVA`]);

    datos.push([`PERIODO: ${plan.fecha_inicio} - ${plan.fecha_fin}`]);

    datos.push([`ESCUADRA: ${(plan.escuadra_nombre || "").toUpperCase()}`]);

    datos.push([`SUPERVISOR: ${(plan.supervisor_nombre || "").toUpperCase()}`]);

    datos.push([`CREADO POR: ${(plan.creado_por_nombre || "").toUpperCase()}`]);

    datos.push([]);

    // 🔥 DIAS
    plan.dias.forEach((dia, index) => {
      datos.push([`DÍA ${index + 1}`]);

      datos.push([`FECHA: ${dia.fecha}`]);

      datos.push([`TURNO: ${dia.turno.toUpperCase()}`]);

      datos.push([]);

      // 🔥 CABECERA TABLA
      datos.push([
        "ORDEN",

        "ACCIÓN",

        "HORA INICIO",

        "HORA FIN",

        "SECTOR",

        "DETALLE",
      ]);

      // 🔥 ACTIVIDADES
      dia.actividades.forEach((act) => {
        const orden = ordenes.find((o) => o.id === act.orden_id);

        const accion = orden?.acciones?.find((a) => a.id === act.accion_id);

        datos.push([
          orden?.consecutivo || "",

          accion?.nombre || "",

          act.hora_inicio,

          act.hora_fin,

          act.sector,

          act.detalle,
        ]);
      });

      datos.push([]);
      datos.push([]);
    });

    // 🔥 CREAR SHEET
    const ws = XLSX.utils.aoa_to_sheet(datos);

    // 🔥 ANCHO COLUMNAS
    ws["!cols"] = [
      { wch: 30 },

      { wch: 40 },

      { wch: 15 },

      { wch: 15 },

      { wch: 25 },

      { wch: 50 },
    ];

    // 🔥 WORKBOOK
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Planificación");

    // 🔥 EXPORTAR
    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",

      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    saveAs(file, `PLANIFICACION_${plan.escuadra_nombre}.xlsx`);
  };

  // 🔥 CARGAR PLAN
  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        const ref = doc(db, "planificaciones", id);

        const snap = await getDoc(ref);

        if (!snap.exists()) {
          return;
        }

        const planData = {
          id: snap.id,

          ...snap.data(),
        };

        // 🔥 VALIDAR ACCESO
        if (
          userData &&
          (planData.region_id !== userData.region_id ||
            planData.delegacion_id !== userData.delegacion_id)
        ) {
          alert("No tiene acceso a esta planificación");

          navigate("/unidad_operativa");

          return;
        }

        setPlan(planData);

        // 🔥 ORDENES
        const snapOrdenes = await getDocs(collection(db, "ordenes"));

        const todas = snapOrdenes.docs.map((d) => ({
          id: d.id,

          ...d.data(),
        }));

        // 🔥 FILTRAR
        const filtradas = todas.filter((orden) => {
          const mismaRegion = orden.region_id === planData.region_id;

          const mismaDelegacion =
            orden.delegacion_id === planData.delegacion_id;

          const dentroPeriodo =
            orden.fecha_fin >= planData.fecha_inicio &&
            orden.fecha_inicio <= planData.fecha_fin;

          const activa = orden.estado === "activa";

          return mismaRegion && mismaDelegacion && dentroPeriodo && activa;
        });

        setOrdenes(filtradas);
      } catch (error) {
        console.error(error);
      }
    };

    if (userData) {
      obtenerDatos();
    }
  }, [id, userData]);

  // 🔥 ACCIONES
  const accionesDeOrden = () => {
    const orden = ordenes.find((o) => o.id === form.orden_id);

    return orden?.acciones || [];
  };

  // 🔥 OBTENER ORDEN
  const obtenerOrden = (id) => {
    return ordenes.find((o) => o.id === id);
  };

  // 🔥 OBTENER ACCION
  const obtenerAccion = (ordenId, accionId) => {
    const orden = ordenes.find((o) => o.id === ordenId);

    return orden?.acciones?.find((a) => a.id === accionId);
  };

  // 🔥 AGREGAR ACTIVIDAD
  const agregarActividad = async (indexDia) => {
    if (
      !form.orden_id ||
      !form.accion_id ||
      !form.hora_inicio ||
      !form.hora_fin ||
      !form.sector ||
      !form.detalle
    ) {
      alert("Complete todos los campos");

      return;
    }

    if (form.hora_inicio >= form.hora_fin) {
      alert("Horario inválido");

      return;
    }

    const nuevosDias = [...plan.dias];

    nuevosDias[indexDia].actividades.push({
      ...form,
    });

    await updateDoc(doc(db, "planificaciones", id), {
      dias: nuevosDias,
    });

    setPlan({
      ...plan,

      dias: nuevosDias,
    });

    setForm({
      orden_id: "",

      accion_id: "",

      hora_inicio: "",

      hora_fin: "",

      sector: "",

      detalle: "",
    });
  };

  // 🔥 ELIMINAR
  const eliminarActividad = async (indexDia, indexAct) => {
    const confirmar = confirm("¿Eliminar actividad?");

    if (!confirmar) return;

    const nuevosDias = [...plan.dias];

    nuevosDias[indexDia].actividades = nuevosDias[indexDia].actividades.filter(
      (_, i) => i !== indexAct,
    );

    await updateDoc(doc(db, "planificaciones", id), {
      dias: nuevosDias,
    });

    setPlan({
      ...plan,

      dias: nuevosDias,
    });
  };

  // 🔥 MENU
  const menuItems = [
    {
      label: "Dashboard",

      onClick: () => navigate("/unidad_operativa"),
    },

    {
      label: "Planificaciones",

      onClick: () => navigate("/unidad_operativa/planificacion/crear"),
    },
  ];

  // 🔥 LOADING
  if (!plan) {
    return (
      <MainLayout title="Planificación" menuItems={menuItems}>
        <p>Cargando...</p>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Planificación" menuItems={menuItems}>
      <div id="contenido-plan">
        {/* 🔥 HEADER */}
        <div
          style={{
            background: "white",

            padding: "20px",

            borderRadius: "10px",

            marginBottom: "20px",

            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}
        >
          <h1>Planificación</h1>

          <p>
            <strong>Escuadra:</strong> {plan.escuadra_nombre}
          </p>

          <p>
            <strong>Supervisor:</strong> {plan.supervisor_nombre}
          </p>

          <p>
            <strong>Periodo:</strong> {plan.fecha_inicio} - {plan.fecha_fin}
          </p>

          <div
            style={{
              display: "flex",

              gap: "10px",

              flexWrap: "wrap",

              marginTop: "15px",
            }}
          >
            <button onClick={() => exportarExcel(plan, ordenes)}>
              Exportar Excel
            </button>
          </div>
        </div>

        {/* 🔥 DIAS */}
        {plan.dias.map((dia, index) => (
          <div
            key={index}
            style={{
              background: "white",

              padding: "20px",

              borderRadius: "10px",

              marginBottom: "20px",

              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            }}
          >
            <h2>Día {index + 1}</h2>

            <p>
              {dia.fecha} - {dia.turno}
            </p>

            <hr />

            {/* 🔥 FORM */}
            <div
              style={{
                display: "grid",

                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",

                gap: "10px",

                marginBottom: "20px",
              }}
            >
              <select
                value={form.orden_id}
                onChange={(e) =>
                  setForm({
                    ...form,

                    orden_id: e.target.value,

                    accion_id: "",
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

              <select
                value={form.accion_id}
                onChange={(e) =>
                  setForm({
                    ...form,

                    accion_id: e.target.value,
                  })
                }
              >
                <option value="">Acción</option>

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
                  setForm({
                    ...form,

                    hora_inicio: e.target.value,
                  })
                }
              />

              <input
                type="time"
                value={form.hora_fin}
                onChange={(e) =>
                  setForm({
                    ...form,

                    hora_fin: e.target.value,
                  })
                }
              />

              <input
                placeholder="Sector"
                value={form.sector}
                onChange={(e) =>
                  setForm({
                    ...form,

                    sector: e.target.value,
                  })
                }
              />

              <input
                placeholder="Detalle"
                value={form.detalle}
                onChange={(e) =>
                  setForm({
                    ...form,

                    detalle: e.target.value,
                  })
                }
              />
            </div>

            <button onClick={() => agregarActividad(index)}>
              Agregar Actividad
            </button>

            <hr />

            {/* 🔥 ACTIVIDADES */}
            <div
              style={{
                display: "grid",

                gap: "15px",
              }}
            >
              {dia.actividades.map((act, i) => {
                const orden = obtenerOrden(act.orden_id);

                const accion = obtenerAccion(act.orden_id, act.accion_id);

                return (
                  <div
                    key={i}
                    style={{
                      background: "#f8fafc",

                      padding: "15px",

                      borderRadius: "10px",

                      border: "1px solid #ddd",
                    }}
                  >
                    <p>
                      <strong>Orden:</strong> {orden?.consecutivo}
                    </p>

                    <p>
                      <strong>Acción:</strong> {accion?.nombre}
                    </p>

                    <p>
                      <strong>Horario:</strong> {act.hora_inicio} -{" "}
                      {act.hora_fin}
                    </p>

                    <p>
                      <strong>Sector:</strong> {act.sector}
                    </p>

                    <p>
                      <strong>Detalle:</strong> {act.detalle}
                    </p>

                    <div
                      style={{
                        display: "flex",

                        gap: "10px",

                        marginTop: "10px",
                      }}
                    >
                      <button>Editar</button>

                      <button onClick={() => eliminarActividad(index, i)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  );
}

export default VerPlanificacion;
