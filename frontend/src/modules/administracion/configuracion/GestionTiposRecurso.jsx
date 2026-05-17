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

function GestionTiposRecurso() {
  // =========================================
  // DATA
  // =========================================

  const [tipos, setTipos] = useState([]);

  // =========================================
  // FORM
  // =========================================

  const [formData, setFormData] = useState({
    nombre: "",

    siglas: "",

    descripcion: "",

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

  const cargarTipos = async () => {
    try {
      const snapshot = await getDocs(collection(db, "tipos_recurso"));

      const lista = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      setTipos(lista);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarTipos();
  }, []);

  // =========================================
  // CHANGE
  // =========================================

  const handleChange = (field, value) => {
    setFormData({
      ...formData,

      [field]: value,
    });
  };

  // =========================================
  // LIMPIAR
  // =========================================

  const limpiarFormulario = () => {
    setFormData({
      nombre: "",

      siglas: "",

      descripcion: "",

      estado: "activo",
    });

    setEditandoId(null);
  };

  // =========================================
  // GUARDAR
  // =========================================

  const guardarTipo = async () => {
    try {
      setLoading(true);

      const nombre = formData.nombre.trim().toUpperCase();

      const siglas = formData.siglas.trim().toUpperCase();

      // =========================================
      // VALIDAR
      // =========================================

      if (!nombre) {
        alert("Ingrese el nombre");

        return;
      }

      if (!siglas) {
        alert("Ingrese las siglas");

        return;
      }

      // =========================================
      // DUPLICADOS
      // =========================================

      const nombreExiste = tipos.find(
        (t) => t.nombre === nombre && t.id !== editandoId,
      );

      if (nombreExiste) {
        alert("Este tipo ya existe");

        return;
      }

      const siglasExiste = tipos.find(
        (t) => t.siglas === siglas && t.id !== editandoId,
      );

      if (siglasExiste) {
        alert("Estas siglas ya existen");

        return;
      }

      const datos = {
        nombre,

        siglas,

        descripcion: formData.descripcion.trim(),

        estado: formData.estado,

        actualizado: Timestamp.now(),
      };

      // =========================================
      // CREAR
      // =========================================

      if (!editandoId) {
        await addDoc(
          collection(db, "tipos_recurso"),

          {
            ...datos,

            creado: Timestamp.now(),
          },
        );

        alert("Tipo creado");
      } else {
        // =========================================
        // ACTUALIZAR
        // =========================================

        await updateDoc(
          doc(db, "tipos_recurso", editandoId),

          datos,
        );

        alert("Tipo actualizado");
      }

      limpiarFormulario();

      await cargarTipos();
    } catch (error) {
      console.error(error);

      alert("Error guardando tipo");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // EDITAR
  // =========================================

  const editarTipo = (tipo) => {
    setEditandoId(tipo.id);

    setFormData({
      nombre: tipo.nombre || "",

      siglas: tipo.siglas || "",

      descripcion: tipo.descripcion || "",

      estado: tipo.estado || "activo",
    });
  };

  // =========================================
  // ESTADO
  // =========================================

  const cambiarEstado = async (tipo) => {
    try {
      const nuevoEstado = tipo.estado === "activo" ? "inactivo" : "activo";

      await updateDoc(
        doc(db, "tipos_recurso", tipo.id),

        {
          estado: nuevoEstado,

          actualizado: Timestamp.now(),
        },
      );

      await cargarTipos();
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
      Gestión Tipos Recurso
      "
      subtitulo="
      Administración de tipos de recursos operativos
      "
      // =========================================
      // FORM
      // =========================================

      formTitle={editandoId ? "Editar Tipo" : "Nuevo Tipo"}
      formData={formData}
      onChange={handleChange}
      onSubmit={guardarTipo}
      onCancel={limpiarFormulario}
      editando={!!editandoId}
      loading={loading}
      fields={[
        {
          name: "nombre",

          label: "Nombre",

          placeholder: "Ej: Patrulla",
        },

        {
          name: "siglas",

          label: "Siglas",

          placeholder: "Ej: PAT",
        },

        {
          name: "descripcion",

          label: "Descripción",

          type: "textarea",

          rows: 4,

          placeholder: "Descripción opcional",
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

      items={tipos}
      renderItemTitle={(t) => `${t.siglas} - ${t.nombre}`}
      renderItemSubtitle={(t) => t.descripcion || "Sin descripción"}
      onEdit={editarTipo}
      onToggleEstado={cambiarEstado}
    />
  );
}

export default GestionTiposRecurso;
