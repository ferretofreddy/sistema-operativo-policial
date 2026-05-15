// frontend/src/modules/supervisor/recursos/CrearRecurso.jsx

import { useContext, useEffect, useMemo, useState } from "react";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../../services/firebase";

import { AuthContext } from "../../../context/AuthContext";

import GestionLayout from "../../../layouts/GestionLayout";

function CrearRecurso() {
  // =========================================
  // AUTH
  // =========================================

  const { userData } = useContext(AuthContext);

  const esAdmin = userData?.rol === "admin";

  const esUnidadOperativa = userData?.rol === "unidad_operativa";

  // =========================================
  // STATES
  // =========================================

  const [regiones, setRegiones] = useState([]);

  const [delegaciones, setDelegaciones] = useState([]);

  const [tiposRecurso, setTiposRecurso] = useState([]);

  const [recursos, setRecursos] = useState([]);

  const [loading, setLoading] = useState(false);

  const [editandoId, setEditandoId] = useState(null);

  // =========================================
  // FILTROS
  // =========================================

  const [filtros, setFiltros] = useState({
    region_id: "",

    delegacion_id: "",

    busqueda: "",
  });

  // =========================================
  // FORM
  // =========================================

  const [formData, setFormData] = useState({
    region_id: "",

    delegacion_id: "",

    tipo_recurso_id: "",

    unidad: "",

    indicativo: "",

    estado: "activo",
  });

  // =========================================
  // INIT USER FILTERS
  // =========================================

  useEffect(() => {
    if (esUnidadOperativa && userData) {
      setFiltros({
        region_id: userData.region_id || "",

        delegacion_id: userData.delegacion_id || "",

        busqueda: "",
      });

      setFormData((prev) => ({
        ...prev,

        region_id: userData.region_id || "",

        delegacion_id: userData.delegacion_id || "",
      }));
    }
  }, [esUnidadOperativa, userData]);

  // =========================================
  // CARGAR REGIONES
  // =========================================

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

  // =========================================
  // CARGAR DELEGACIONES
  // =========================================

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

  // =========================================
  // CARGAR TIPOS
  // =========================================

  const cargarTipos = async () => {
    try {
      const snapshot = await getDocs(collection(db, "tipos_recurso"));

      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setTiposRecurso(lista);
    } catch (error) {
      console.error(error);
    }
  };

  // =========================================
  // CARGAR RECURSOS
  // =========================================

  const cargarRecursos = async () => {
    try {
      const snapshot = await getDocs(collection(db, "recursos_operativos"));

      let lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // =========================================
      // FILTRO UO
      // =========================================

      if (esUnidadOperativa && userData) {
        lista = lista.filter(
          (r) =>
            r.region_id === userData.region_id &&
            r.delegacion_id === userData.delegacion_id,
        );
      }

      setRecursos(lista);
    } catch (error) {
      console.error(error);
    }
  };

  // =========================================
  // INIT
  // =========================================

  useEffect(() => {
    cargarRegiones();

    cargarDelegaciones();

    cargarTipos();
  }, []);

  useEffect(() => {
    if (userData) {
      cargarRecursos();
    }
  }, [userData]);

  // =========================================
  // DELEGACIONES FORM
  // =========================================

  const delegacionesForm = useMemo(() => {
    if (!formData.region_id) {
      return [];
    }

    return delegaciones.filter((d) => d.region_id === formData.region_id);
  }, [delegaciones, formData.region_id]);

  // =========================================
  // DELEGACIONES FILTROS
  // =========================================

  const delegacionesFiltro = useMemo(() => {
    if (!filtros.region_id) {
      return [];
    }

    return delegaciones.filter((d) => d.region_id === filtros.region_id);
  }, [delegaciones, filtros.region_id]);

  // =========================================
  // NOMBRE RECURSO AUTO
  // =========================================

  const nombreRecurso = useMemo(() => {
    const tipo = tiposRecurso.find((t) => t.id === formData.tipo_recurso_id);

    const delegacion = delegaciones.find(
      (d) => d.id === formData.delegacion_id,
    );

    if (!tipo || !delegacion || !formData.unidad) {
      return "";
    }

    return `${tipo.siglas}-${delegacion.codigo}-${formData.unidad}`
      .toUpperCase()
      .trim();
  }, [
    tiposRecurso,
    delegaciones,
    formData.tipo_recurso_id,
    formData.delegacion_id,
    formData.unidad,
  ]);

  // =========================================
  // FILTRO RECURSOS
  // =========================================

  const recursosFiltrados = useMemo(() => {
    return recursos.filter((r) => {
      const region = !filtros.region_id || r.region_id === filtros.region_id;

      const delegacion =
        !filtros.delegacion_id || r.delegacion_id === filtros.delegacion_id;

      const texto = filtros.busqueda.toLowerCase().trim();

      const busqueda =
        !texto ||
        r.nombre_recurso?.toLowerCase().includes(texto) ||
        r.indicativo?.toLowerCase().includes(texto) ||
        r.unidad?.toLowerCase().includes(texto);

      return region && delegacion && busqueda;
    });
  }, [recursos, filtros]);

  // =========================================
  // HANDLE FILTROS
  // =========================================

  const handleFiltroChange = (field, value) => {
    const nuevos = {
      ...filtros,

      [field]: value,
    };

    if (field === "region_id") {
      nuevos.delegacion_id = "";
    }

    setFiltros(nuevos);
  };

  // =========================================
  // HANDLE FORM
  // =========================================

  const handleFormChange = (field, value) => {
    const nuevos = {
      ...formData,

      [field]: value,
    };

    if (field === "region_id") {
      nuevos.delegacion_id = "";
    }

    setFormData(nuevos);
  };

  // =========================================
  // LIMPIAR
  // =========================================

  const limpiarFormulario = () => {
    setEditandoId(null);

    setFormData({
      region_id: esUnidadOperativa ? userData.region_id : "",

      delegacion_id: esUnidadOperativa ? userData.delegacion_id : "",

      tipo_recurso_id: "",

      unidad: "",

      indicativo: "",

      estado: "activo",
    });
  };

  // =========================================
  // GUARDAR
  // =========================================

  const guardarRecurso = async () => {
    try {
      setLoading(true);

      // =========================================
      // VALIDACIONES
      // =========================================

      if (!formData.region_id) {
        alert("Seleccione región");

        return;
      }

      if (!formData.delegacion_id) {
        alert("Seleccione delegación");

        return;
      }

      if (!formData.tipo_recurso_id) {
        alert("Seleccione tipo recurso");

        return;
      }

      if (!formData.unidad.trim()) {
        alert("Ingrese unidad");

        return;
      }

      if (!formData.indicativo.trim()) {
        alert("Ingrese indicativo");

        return;
      }

      // =========================================
      // DATA RELACIONAL
      // =========================================

      const region = regiones.find((r) => r.id === formData.region_id);

      const delegacion = delegaciones.find(
        (d) => d.id === formData.delegacion_id,
      );

      const tipo = tiposRecurso.find((t) => t.id === formData.tipo_recurso_id);

      // =========================================
      // VALIDAR DUPLICADOS
      // =========================================

      const unidadExiste = recursos.find(
        (r) =>
          r.unidad === formData.unidad.trim().toUpperCase() &&
          r.delegacion_id === delegacion.id &&
          r.id !== editandoId,
      );

      if (unidadExiste) {
        alert("La unidad ya existe");

        return;
      }

      const indicativoExiste = recursos.find(
        (r) =>
          r.indicativo === formData.indicativo.trim().toUpperCase() &&
          r.id !== editandoId,
      );

      if (indicativoExiste) {
        alert("El indicativo ya existe");

        return;
      }

      // =========================================
      // DATA
      // =========================================

      const datos = {
        estado: formData.estado,

        region_id: region.id,

        region_nombre: region.nombre,

        delegacion_id: delegacion.id,

        delegacion_nombre: delegacion.nombre,

        tipo_recurso_id: tipo.id,

        tipo_recurso: tipo.nombre,

        tipo_recurso_siglas: tipo.siglas,

        unidad: formData.unidad.trim().toUpperCase(),

        indicativo: formData.indicativo.trim().toUpperCase(),

        nombre_recurso: nombreRecurso,

        actualizado: Timestamp.now(),
      };

      // =========================================
      // CREAR
      // =========================================

      if (!editandoId) {
        await addDoc(
          collection(db, "recursos_operativos"),

          {
            ...datos,

            creado: Timestamp.now(),

            oficiales: [],

            escuadra_id: "",

            escuadra_nombre: "",
          },
        );

        alert("Recurso creado");
      } else {
        await updateDoc(
          doc(db, "recursos_operativos", editandoId),

          datos,
        );

        alert("Recurso actualizado");
      }

      limpiarFormulario();

      await cargarRecursos();
    } catch (error) {
      console.error(error);

      alert("Error guardando recurso");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // EDITAR
  // =========================================

  const editarRecurso = (recurso) => {
    setEditandoId(recurso.id);

    setFormData({
      region_id: recurso.region_id,

      delegacion_id: recurso.delegacion_id,

      tipo_recurso_id: recurso.tipo_recurso_id,

      unidad: recurso.unidad,

      indicativo: recurso.indicativo,

      estado: recurso.estado,
    });
  };

  // =========================================
  // CAMBIAR ESTADO
  // =========================================

  const cambiarEstado = async (recurso) => {
    try {
      setLoading(true);

      const nuevoEstado = recurso.estado === "activo" ? "inactivo" : "activo";

      // =========================================
      // INACTIVAR
      // =========================================

      if (nuevoEstado === "inactivo") {
        const q = query(
          collection(db, "usuarios"),

          where("recurso_id", "==", recurso.id),
        );

        const snapshot = await getDocs(q);

        // =========================================
        // LIBERAR USERS
        // =========================================

        for (const d of snapshot.docs) {
          await updateDoc(
            doc(db, "usuarios", d.id),

            {
              recurso_id: "",

              recurso_nombre: "",

              actualizado: Timestamp.now(),
            },
          );
        }

        // =========================================
        // LIMPIAR RECURSO
        // =========================================

        await updateDoc(
          doc(db, "recursos_operativos", recurso.id),

          {
            estado: "inactivo",

            escuadra_id: "",

            escuadra_nombre: "",

            oficiales: [],

            actualizado: Timestamp.now(),
          },
        );
      } else {
        await updateDoc(
          doc(db, "recursos_operativos", recurso.id),

          {
            estado: "activo",

            actualizado: Timestamp.now(),
          },
        );
      }

      await cargarRecursos();
    } catch (error) {
      console.error(error);

      alert("Error actualizando estado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GestionLayout
      // =========================================
      // HEADER
      // =========================================

      titulo="
      Gestión Recursos Operativos
      "
      subtitulo="
      Administración estructural de recursos institucionales
      "
      // =========================================
      // FILTROS
      // =========================================

      filtros={[
        {
          name: "region_id",

          label: "Región",

          type: "select",

          hidden: !esAdmin,

          options: [
            {
              label: "Todas",

              value: "",
            },

            ...regiones.map((r) => ({
              label: `${r.codigo} - ${r.nombre}`,

              value: r.id,
            })),
          ],
        },

        {
          name: "delegacion_id",

          label: "Delegación",

          type: "select",

          hidden: !esAdmin,

          disabled: !filtros.region_id,

          options: [
            {
              label: "Todas",

              value: "",
            },

            ...delegacionesFiltro.map((d) => ({
              label: `${d.codigo} - ${d.nombre}`,

              value: d.id,
            })),
          ],
        },

        {
          name: "busqueda",

          label: "Buscar",

          placeholder: "Unidad, indicativo o nombre",
        },
      ]}
      filtrosData={filtros}
      onFiltroChange={handleFiltroChange}
      // =========================================
      // TABLA
      // =========================================

      columnas={["Recurso", "Unidad", "Indicativo", "Delegación", "Estado"]}
      items={recursosFiltrados}
      renderCelda={(item, columna) => {
        switch (columna) {
          case "Recurso":
            return item.nombre_recurso;

          case "Unidad":
            return item.unidad;

          case "Indicativo":
            return item.indicativo;

          case "Delegación":
            return item.delegacion_nombre;

          case "Estado":
            return (
              <span
                style={{
                  background: item.estado === "activo" ? "#dcfce7" : "#fee2e2",

                  color: item.estado === "activo" ? "#166534" : "#991b1b",

                  padding: "4px 10px",

                  borderRadius: "20px",

                  fontSize: "12px",

                  fontWeight: "bold",

                  textTransform: "uppercase",
                }}
              >
                {item.estado}
              </span>
            );

          default:
            return "";
        }
      }}
      // =========================================
      // ACTIONS
      // =========================================

      onEditar={editarRecurso}
      onCambiarEstado={cambiarEstado}
      // =========================================
      // FORM
      // =========================================

      formTitle={editandoId ? "Editar Recurso" : "Nuevo Recurso"}
      formFields={[
        {
          name: "region_id",

          label: "Región",

          type: "select",

          hidden: !esAdmin,

          disabled: esUnidadOperativa,

          options: [
            {
              label: "Seleccione región",

              value: "",
            },

            ...regiones.map((r) => ({
              label: `${r.codigo} - ${r.nombre}`,

              value: r.id,
            })),
          ],
        },

        {
          name: "delegacion_id",

          label: "Delegación",

          type: "select",

          hidden: !esAdmin,

          disabled: !formData.region_id || esUnidadOperativa,

          options: [
            {
              label: "Seleccione delegación",

              value: "",
            },

            ...delegacionesForm.map((d) => ({
              label: `${d.codigo} - ${d.nombre}`,

              value: d.id,
            })),
          ],
        },

        {
          name: "tipo_recurso_id",

          label: "Tipo Recurso",

          type: "select",

          options: [
            {
              label: "Seleccione tipo",

              value: "",
            },

            ...tiposRecurso.map((t) => ({
              label: `${t.siglas} - ${t.nombre}`,

              value: t.id,
            })),
          ],
        },

        {
          name: "unidad",

          label: "Unidad",

          placeholder: "Ej: 4051",
        },

        {
          name: "indicativo",

          label: "Indicativo",

          placeholder: "Ej: LINCE 1",
        },

        {
          name: "estado",

          label: "Estado",

          type: "select",

          options: [
            {
              label: "Activo",

              value: "activo",
            },

            {
              label: "Mantenimiento",

              value: "mantenimiento",
            },

            {
              label: "Inactivo",

              value: "inactivo",
            },
          ],
        },
      ]}
      formData={formData}
      onFormChange={handleFormChange}
      onSubmit={guardarRecurso}
      onCancel={limpiarFormulario}
      editando={!!editandoId}
      loading={loading}
      panelWidth={430}
      // =========================================
      // EXTRA INFO
      // =========================================

      extraContent={
        <div
          style={{
            marginTop: "15px",

            padding: "12px",

            border: "1px solid #e5e7eb",

            borderRadius: "10px",

            background: "#f8fafc",
          }}
        >
          <strong>Nombre Recurso:</strong>

          <div
            style={{
              marginTop: "6px",

              fontSize: "18px",

              fontWeight: "bold",
            }}
          >
            {nombreRecurso || "Pendiente"}
          </div>
        </div>
      }
    />
  );
}
export default CrearRecurso;
