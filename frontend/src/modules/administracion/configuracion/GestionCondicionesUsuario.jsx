import { useEffect, useState } from "react";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

import { db } from "../../../services/firebase";

import CatalogoSimpleLayout from "../../../shared/layouts/CatalogoSimpleLayout";

function GestionCondicionesUsuario() {
  // =========================================
  // DATA
  // =========================================

  const [condiciones, setCondiciones] = useState([]);

  // =========================================
  // FORM
  // =========================================

  const [formData, setFormData] = useState({
    nombre: "",

    descripcion: "",

    bloquea_operaciones: false,

    estado: "activo",
  });

  // =========================================
  // EDITAR
  // =========================================

  const [editandoId, setEditandoId] = useState(null);

  // =========================================
  // LOADING
  // =========================================

  const [loading, setLoading] = useState(false);

  // =========================================
  // CARGAR
  // =========================================

  const cargarCondiciones = async () => {
    try {
      const snapshot = await getDocs(collection(db, "condiciones_usuario"));

      const lista = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      setCondiciones(lista);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarCondiciones();
  }, []);

  // =========================================
  // CHANGE
  // =========================================

  const handleChange = (field, value) => {
    setFormData({
      ...formData,

      [field]: field === "bloquea_operaciones" ? value === "true" : value,
    });
  };

  // =========================================
  // LIMPIAR
  // =========================================

  const limpiarFormulario = () => {
    setFormData({
      nombre: "",

      descripcion: "",

      bloquea_operaciones: false,

      estado: "activo",
    });

    setEditandoId(null);
  };

  // =========================================
  // GUARDAR
  // =========================================

  const guardarCondicion = async () => {
    try {
      setLoading(true);

      const nombre = formData.nombre.trim().toUpperCase();

      if (!nombre) {
        alert("Ingrese el nombre");

        return;
      }

      // =========================================
      // VALIDAR
      // =========================================

      const existe = condiciones.find(
        (c) => c.nombre === nombre && c.id !== editandoId,
      );

      if (existe) {
        alert("Esta condición ya existe");

        return;
      }

      const datos = {
        nombre,

        descripcion: formData.descripcion.trim(),

        bloquea_operaciones: formData.bloquea_operaciones,

        estado: formData.estado,

        actualizado: Timestamp.now(),
      };

      // =========================================
      // CREAR
      // =========================================

      if (!editandoId) {
        await addDoc(
          collection(db, "condiciones_usuario"),

          {
            ...datos,

            creado: Timestamp.now(),
          },
        );

        alert("Condición creada");
      } else {
        // =========================================
        // ACTUALIZAR
        // =========================================

        await updateDoc(
          doc(db, "condiciones_usuario", editandoId),

          datos,
        );

        alert("Condición actualizada");
      }

      limpiarFormulario();

      await cargarCondiciones();
    } catch (error) {
      console.error(error);

      alert("Error guardando condición");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // EDITAR
  // =========================================

  const editarCondicion = (condicion) => {
    setEditandoId(condicion.id);

    setFormData({
      nombre: condicion.nombre || "",

      descripcion: condicion.descripcion || "",

      bloquea_operaciones: condicion.bloquea_operaciones || false,

      estado: condicion.estado || "activo",
    });
  };

  // =========================================
  // ESTADO
  // =========================================

  const cambiarEstado = async (condicion) => {
    try {
      const nuevoEstado = condicion.estado === "activo" ? "inactivo" : "activo";

      await updateDoc(
        doc(db, "condiciones_usuario", condicion.id),

        {
          estado: nuevoEstado,

          actualizado: Timestamp.now(),
        },
      );

      await cargarCondiciones();
    } catch (error) {
      console.error(error);

      alert("Error actualizando estado");
    }
  };

  return (
    <CatalogoSimpleLayout
      // =========================================
      // HEADER
      // =========================================

      titulo="
      Gestión Condiciones Usuario
      "
      subtitulo="
      Administración de condiciones operativas del personal
      "
      // =========================================
      // FORM
      // =========================================

      formTitle={editandoId ? "Editar Condición" : "Nueva Condición"}
      formData={formData}
      onChange={handleChange}
      onSubmit={guardarCondicion}
      onCancel={limpiarFormulario}
      editando={!!editandoId}
      loading={loading}
      fields={[
        {
          name: "nombre",

          label: "Nombre",

          placeholder: "Ej: Vacaciones",
        },

        {
          name: "descripcion",

          label: "Descripción",

          placeholder: "Descripción opcional",
        },

        {
          name: "bloquea_operaciones",

          label: "Bloquea Operaciones",

          type: "select",

          options: [
            {
              label: "No",

              value: "false",
            },

            {
              label: "Sí",

              value: "true",
            },
          ],
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
      // =========================================
      // LISTA
      // =========================================

      items={condiciones}
      renderItemTitle={(c) => c.nombre}
      renderItemSubtitle={(c) =>
        `
        ${
          c.bloquea_operaciones
            ? "Bloquea operaciones"
            : "No bloquea operaciones"
        }
        `
      }
      onEdit={editarCondicion}
      onToggleEstado={cambiarEstado}
    />
  );
}

export default GestionCondicionesUsuario;
