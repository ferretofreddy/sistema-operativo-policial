// frontend/src/modules/administracion/escuadras/CrearEscuadra.jsx

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

import GestionLayout from "../../../layouts/GestionLayout";

import { AuthContext } from "../../../context/AuthContext";

function CrearEscuadra() {
  // =========================================
  // AUTH
  // =========================================

  const { userData } = useContext(AuthContext);

  const esAdmin = userData?.rol === "admin";

  const esUnidadOperativa = userData?.rol === "unidad_operativa";

  // =========================================
  // DATA
  // =========================================

  const [regiones, setRegiones] = useState([]);

  const [delegaciones, setDelegaciones] = useState([]);

  const [escuadras, setEscuadras] = useState([]);

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

    nombre: "",

    codigo: "",

    estado: "activo",
  });

  // =========================================
  // EDITANDO
  // =========================================

  const [editandoId, setEditandoId] = useState(null);

  // =========================================
  // LOADING
  // =========================================

  const [loading, setLoading] = useState(false);

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

      const lista = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

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

      const lista = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      setDelegaciones(lista);
    } catch (error) {
      console.error(error);
    }
  };

  // =========================================
  // CARGAR ESCUADRAS
  // =========================================

  const cargarEscuadras = async () => {
    try {
      const snapshot = await getDocs(collection(db, "escuadras"));

      let lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // =========================================
      // FILTRO TERRITORIAL
      // =========================================

      if (esUnidadOperativa && userData) {
        lista = lista.filter(
          (e) =>
            e.region_id === userData.region_id &&
            e.delegacion_id === userData.delegacion_id,
        );
      }

      lista.sort((a, b) => a.nombre.localeCompare(b.nombre));

      setEscuadras(lista);
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
  }, []);

  useEffect(() => {
    if (userData) {
      cargarEscuadras();
    }
  }, [userData]);

  // =========================================
  // DELEGACIONES FORM
  // =========================================

  const delegacionesFiltradas = useMemo(() => {
    if (!formData.region_id) {
      return [];
    }

    return delegaciones.filter((d) => d.region_id === formData.region_id);
  }, [delegaciones, formData.region_id]);

  // =========================================
  // DELEGACIONES FILTRO
  // =========================================

  const delegacionesFiltro = useMemo(() => {
    if (!filtros.region_id) {
      return [];
    }

    return delegaciones.filter((d) => d.region_id === filtros.region_id);
  }, [delegaciones, filtros.region_id]);

  // =========================================
  // ESCUADRAS FILTRADAS
  // =========================================

  const escuadrasFiltradas = useMemo(() => {
    return escuadras.filter((e) => {
      const filtroRegion =
        !filtros.region_id || e.region_id === filtros.region_id;

      const filtroDelegacion =
        !filtros.delegacion_id || e.delegacion_id === filtros.delegacion_id;

      const texto = filtros.busqueda.toLowerCase().trim();

      const filtroBusqueda =
        !texto ||
        e.nombre?.toLowerCase().includes(texto) ||
        e.codigo?.toLowerCase().includes(texto);

      return filtroRegion && filtroDelegacion && filtroBusqueda;
    });
  }, [escuadras, filtros]);

  // =========================================
  // CHANGE FILTROS
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
  // CHANGE FORM
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
  // LIMPIAR FORM
  // =========================================

  const limpiarFormulario = () => {
    setEditandoId(null);

    setFormData({
      region_id: esUnidadOperativa ? userData.region_id : "",

      delegacion_id: esUnidadOperativa ? userData.delegacion_id : "",

      nombre: "",

      codigo: "",

      estado: "activo",
    });
  };

  // =========================================
  // GUARDAR
  // =========================================

  const guardarEscuadra = async () => {
    try {
      setLoading(true);

      // =========================================
      // VALIDAR
      // =========================================

      if (!formData.region_id) {
        alert("Seleccione región");

        return;
      }

      if (!formData.delegacion_id) {
        alert("Seleccione delegación");

        return;
      }

      if (!formData.nombre.trim()) {
        alert("Ingrese nombre");

        return;
      }

      if (!formData.codigo.trim()) {
        alert("Ingrese código");

        return;
      }

      // =========================================
      // REGION
      // =========================================

      const region = regiones.find((r) => r.id === formData.region_id);

      if (!region) {
        alert("Región inválida");

        return;
      }

      // =========================================
      // DELEGACION
      // =========================================

      const delegacion = delegaciones.find(
        (d) => d.id === formData.delegacion_id,
      );

      if (!delegacion) {
        alert("Delegación inválida");

        return;
      }

      // =========================================
      // VALIDAR RELACION
      // =========================================

      if (delegacion.region_id !== region.id) {
        alert("La delegación no pertenece a la región seleccionada");

        return;
      }

      // =========================================
      // NORMALIZAR
      // =========================================

      const nombre = formData.nombre.trim().toUpperCase();

      const codigo = formData.codigo.trim().toUpperCase();

      // =========================================
      // DUPLICADOS
      // =========================================

      const codigoExiste = escuadras.find(
        (e) => e.codigo === codigo && e.id !== editandoId,
      );

      if (codigoExiste) {
        alert("Ese código ya existe");

        return;
      }

      const nombreExiste = escuadras.find(
        (e) =>
          e.nombre === nombre &&
          e.delegacion_id === delegacion.id &&
          e.id !== editandoId,
      );

      if (nombreExiste) {
        alert("Ya existe una escuadra con ese nombre en esa delegación");

        return;
      }

      // =========================================
      // DATA
      // =========================================

      const datos = {
        nombre,

        codigo,

        estado: formData.estado,

        region_id: region.id,

        region_nombre: region.nombre,

        delegacion_id: delegacion.id,

        delegacion_nombre: delegacion.nombre,

        actualizado: Timestamp.now(),
      };

      // =========================================
      // CREATE
      // =========================================

      if (!editandoId) {
        await addDoc(
          collection(db, "escuadras"),

          {
            ...datos,

            creado: Timestamp.now(),

            oficiales: [],

            supervisor_uid: "",

            supervisor_nombre: "",
          },
        );

        alert("Escuadra creada");
      } else {
        await updateDoc(
          doc(db, "escuadras", editandoId),

          datos,
        );

        alert("Escuadra actualizada");
      }

      limpiarFormulario();

      await cargarEscuadras();
    } catch (error) {
      console.error(error);

      alert("Error guardando escuadra");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // EDITAR
  // =========================================

  const editarEscuadra = (escuadra) => {
    setEditandoId(escuadra.id);

    setFormData({
      region_id: escuadra.region_id,

      delegacion_id: escuadra.delegacion_id,

      nombre: escuadra.nombre,

      codigo: escuadra.codigo,

      estado: escuadra.estado,
    });
  };

  // =========================================
  // CAMBIAR ESTADO
  // =========================================

  const cambiarEstado = async (escuadra) => {
    try {
      setLoading(true);

      const nuevoEstado = escuadra.estado === "activo" ? "inactivo" : "activo";

      // =========================================
      // SI SE INACTIVA
      // =========================================

      if (nuevoEstado === "inactivo") {
        // =========================================
        // OBTENER USUARIOS
        // =========================================

        const q = query(
          collection(db, "usuarios"),

          where("escuadra_id", "==", escuadra.id),
        );

        const snapshot = await getDocs(q);

        // =========================================
        // LIMPIAR USERS
        // =========================================

        for (const d of snapshot.docs) {
          await updateDoc(
            doc(db, "usuarios", d.id),

            {
              escuadra_id: "",

              escuadra_nombre: "",

              actualizado: Timestamp.now(),
            },
          );
        }

        // =========================================
        // LIMPIAR ESCUADRA
        // =========================================

        await updateDoc(
          doc(db, "escuadras", escuadra.id),

          {
            estado: "inactivo",

            oficiales: [],

            supervisor_uid: "",

            supervisor_nombre: "",

            actualizado: Timestamp.now(),
          },
        );
      } else {
        // =========================================
        // ACTIVAR
        // =========================================

        await updateDoc(
          doc(db, "escuadras", escuadra.id),

          {
            estado: "activo",

            actualizado: Timestamp.now(),
          },
        );
      }

      await cargarEscuadras();
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
      Gestión Escuadras
      "
      subtitulo="
      Administración estructural de escuadras institucionales
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

          placeholder: "Nombre o código",
        },
      ]}
      filtrosData={filtros}
      onFiltroChange={handleFiltroChange}
      // =========================================
      // TABLA
      // =========================================

      columnas={["Código", "Escuadra", "Delegación", "Región", "Estado"]}
      items={escuadrasFiltradas}
      renderCelda={(item, columna) => {
        switch (columna) {
          case "Código":
            return item.codigo;

          case "Escuadra":
            return item.nombre;

          case "Delegación":
            return item.delegacion_nombre;

          case "Región":
            return item.region_nombre;

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

      onEditar={editarEscuadra}
      onCambiarEstado={cambiarEstado}
      // =========================================
      // FORM
      // =========================================

      formTitle={editandoId ? "Editar Escuadra" : "Nueva Escuadra"}
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

            ...delegacionesFiltradas.map((d) => ({
              label: `${d.codigo} - ${d.nombre}`,

              value: d.id,
            })),
          ],
        },

        {
          name: "nombre",

          label: "Nombre",

          placeholder: "Ej: PON1",
        },

        {
          name: "codigo",

          label: "Código",

          placeholder: "Ej: PON1",
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
              label: "Inactivo",

              value: "inactivo",
            },
          ],
        },
      ]}
      formData={formData}
      onFormChange={handleFormChange}
      onSubmit={guardarEscuadra}
      onCancel={limpiarFormulario}
      editando={!!editandoId}
      loading={loading}
      panelWidth={430}
    />
  );
}

export default CrearEscuadra;
