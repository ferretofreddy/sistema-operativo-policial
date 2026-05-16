import { useEffect, useMemo, useState } from "react";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

import { db } from "../../../services/firebase";

import GestionLayout from "../../../shared/layouts/GestionLayout";

function CrearDelegacion() {
  // =========================================
  // 🔥 DATA
  // =========================================

  const [regiones, setRegiones] = useState([]);

  const [delegaciones, setDelegaciones] = useState([]);

  // =========================================
  // 🔥 FILTROS
  // =========================================

  const [filtros, setFiltros] = useState({
    region_id: "",

    busqueda: "",
  });

  // =========================================
  // 🔥 FORM
  // =========================================

  const [formData, setFormData] = useState({
    region_id: "",

    nombre: "",

    codigo: "",
  });

  // =========================================
  // 🔥 EDITAR
  // =========================================

  const [editandoId, setEditandoId] = useState(null);

  // =========================================
  // 🔥 LOADING
  // =========================================

  const [loading, setLoading] = useState(false);

  // =========================================
  // 🔥 CARGAR REGIONES
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
  // 🔥 CARGAR DELEGACIONES
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

  useEffect(() => {
    cargarRegiones();

    cargarDelegaciones();
  }, []);

  // =========================================
  // 🔥 FILTRAR
  // =========================================

  const delegacionesFiltradas = useMemo(() => {
    return delegaciones.filter((d) => {
      const filtroRegion =
        !filtros.region_id || d.region_id === filtros.region_id;

      const texto = filtros.busqueda.toLowerCase().trim();

      const filtroBusqueda =
        !texto ||
        d.nombre?.toLowerCase().includes(texto) ||
        d.codigo?.toLowerCase().includes(texto) ||
        d.region_nombre?.toLowerCase().includes(texto);

      return filtroRegion && filtroBusqueda;
    });
  }, [delegaciones, filtros]);

  // =========================================
  // 🔥 CHANGE FORM
  // =========================================

  const handleFormChange = (field, value) => {
    setFormData({
      ...formData,

      [field]: value,
    });
  };

  // =========================================
  // 🔥 CHANGE FILTRO
  // =========================================

  const handleFiltroChange = (field, value) => {
    setFiltros({
      ...filtros,

      [field]: value,
    });
  };

  // =========================================
  // 🔥 LIMPIAR FORM
  // =========================================

  const limpiarFormulario = () => {
    setFormData({
      region_id: "",

      nombre: "",

      codigo: "",
    });

    setEditandoId(null);
  };

  // =========================================
  // 🔥 GUARDAR
  // =========================================

  const guardarDelegacion = async () => {
    try {
      setLoading(true);

      const nombre = formData.nombre.trim().toUpperCase();

      const codigo = formData.codigo.trim().toUpperCase();

      // =========================================
      // 🔥 VALIDAR
      // =========================================

      if (!formData.region_id) {
        alert("Seleccione región");

        return;
      }

      if (!nombre) {
        alert("Ingrese nombre");

        return;
      }

      if (!codigo) {
        alert("Ingrese código");

        return;
      }

      // =========================================
      // 🔥 REGION
      // =========================================

      const region = regiones.find((r) => r.id === formData.region_id);

      if (!region) {
        alert("Región inválida");

        return;
      }

      // =========================================
      // 🔥 DUPLICADOS
      // =========================================

      const nombreExiste = delegaciones.find(
        (d) =>
          d.nombre === nombre &&
          d.region_id === region.id &&
          d.id !== editandoId,
      );

      if (nombreExiste) {
        alert("Ya existe una delegación con ese nombre en esa región");

        return;
      }

      const codigoExiste = delegaciones.find(
        (d) => d.codigo === codigo && d.id !== editandoId,
      );

      if (codigoExiste) {
        alert("Ese código ya existe");

        return;
      }

      // =========================================
      // 🔥 DATOS
      // =========================================

      const datos = {
        nombre,

        codigo,

        region_id: region.id,

        region_nombre: region.nombre,

        actualizado: Timestamp.now(),
      };

      // =========================================
      // 🔥 CREAR
      // =========================================

      if (!editandoId) {
        await addDoc(
          collection(db, "delegaciones"),

          {
            ...datos,

            creado: Timestamp.now(),
          },
        );

        alert("Delegación creada");
      } else {
        // =========================================
        // 🔥 UPDATE
        // =========================================

        await updateDoc(
          doc(db, "delegaciones", editandoId),

          datos,
        );

        alert("Delegación actualizada");
      }

      limpiarFormulario();

      await cargarDelegaciones();
    } catch (error) {
      console.error(error);

      alert("Error guardando delegación");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // 🔥 EDITAR
  // =========================================

  const editarDelegacion = (delegacion) => {
    setEditandoId(delegacion.id);

    setFormData({
      region_id: delegacion.region_id || "",

      nombre: delegacion.nombre || "",

      codigo: delegacion.codigo || "",
    });
  };

  return (
    <GestionLayout
      // =========================================
      // 🔥 HEADER
      // =========================================

      titulo="
      Gestión Delegaciones
      "
      subtitulo="
      Administración territorial de delegaciones operativas
      "
      // =========================================
      // 🔥 FILTROS
      // =========================================

      filtros={[
        {
          name: "region_id",

          label: "Región",

          type: "select",

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
          name: "busqueda",

          label: "Buscar",

          placeholder: "Nombre, código o región",
        },
      ]}
      filtrosData={filtros}
      onFiltroChange={handleFiltroChange}
      // =========================================
      // 🔥 TABLA
      // =========================================

      columnas={["Código", "Delegación", "Región"]}
      items={delegacionesFiltradas}
      renderCelda={(item, columna) => {
        switch (columna) {
          case "Código":
            return item.codigo;

          case "Delegación":
            return item.nombre;

          case "Región":
            return item.region_nombre;

          default:
            return "";
        }
      }}
      // =========================================
      // 🔥 ACTIONS
      // =========================================

      onEditar={editarDelegacion}
      // =========================================
      // 🔥 FORM
      // =========================================

      formTitle={editandoId ? "Editar Delegación" : "Nueva Delegación"}
      formFields={[
        {
          name: "region_id",

          label: "Región",

          type: "select",

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
          name: "nombre",

          label: "Nombre",

          placeholder: "Ej: Puerto Jiménez",
        },

        {
          name: "codigo",

          label: "Código",

          placeholder: "Ej: PJ",
        },
      ]}
      formData={formData}
      onFormChange={handleFormChange}
      onSubmit={guardarDelegacion}
      onCancel={limpiarFormulario}
      editando={!!editandoId}
      loading={loading}
    />
  );
}

export default CrearDelegacion;
