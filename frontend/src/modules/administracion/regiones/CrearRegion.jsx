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

function CrearRegion() {
  // =========================================
  // FORM
  // =========================================

  const [formData, setFormData] = useState({
    nombre: "",

    codigo: "",
  });

  // =========================================
  // DATA
  // =========================================

  const [regiones, setRegiones] = useState([]);

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

  useEffect(() => {
    cargarRegiones();
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

      codigo: "",
    });

    setEditandoId(null);
  };

  // =========================================
  // GUARDAR
  // =========================================

  const guardarRegion = async () => {
    try {
      setLoading(true);

      const nombre = formData.nombre.trim().toUpperCase();

      const codigo = formData.codigo.trim().toUpperCase();

      if (!nombre || !codigo) {
        alert("Complete todos los campos");

        return;
      }

      // =========================================
      // VALIDAR
      // =========================================

      const nombreExiste = regiones.find(
        (r) => r.nombre === nombre && r.id !== editandoId,
      );

      if (nombreExiste) {
        alert("Ya existe una región con ese nombre");

        return;
      }

      const codigoExiste = regiones.find(
        (r) => r.codigo === codigo && r.id !== editandoId,
      );

      if (codigoExiste) {
        alert("Ya existe una región con ese código");

        return;
      }

      const datos = {
        nombre,

        codigo,

        actualizado: Timestamp.now(),
      };

      // =========================================
      // CREAR
      // =========================================

      if (!editandoId) {
        await addDoc(
          collection(db, "regiones"),

          {
            ...datos,

            estado: "activo",

            creado: Timestamp.now(),
          },
        );

        alert("Región creada correctamente");
      } else {
        // =========================================
        // UPDATE
        // =========================================

        await updateDoc(
          doc(db, "regiones", editandoId),

          datos,
        );

        alert("Región actualizada");
      }

      limpiarFormulario();

      await cargarRegiones();
    } catch (error) {
      console.error(error);

      alert("Error guardando región");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // EDITAR
  // =========================================

  const editarRegion = (region) => {
    setEditandoId(region.id);

    setFormData({
      nombre: region.nombre || "",

      codigo: region.codigo || "",
    });
  };

  // =========================================
  // ESTADO
  // =========================================

  const cambiarEstado = async (region) => {
    try {
      const nuevoEstado = region.estado === "activo" ? "inactivo" : "activo";

      await updateDoc(
        doc(db, "regiones", region.id),

        {
          estado: nuevoEstado,

          actualizado: Timestamp.now(),
        },
      );

      await cargarRegiones();
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

      titulo="Gestión Regiones"
      subtitulo="
      Administración de regiones operativas
      "
      // =========================================
      // FORM
      // =========================================

      formTitle={editandoId ? "Editar Región" : "Nueva Región"}
      formData={formData}
      onChange={handleChange}
      onSubmit={guardarRegion}
      onCancel={limpiarFormulario}
      editando={!!editandoId}
      loading={loading}
      fields={[
        {
          name: "nombre",

          label: "Nombre Región",

          placeholder: "Ej: Pacífico Sur",
        },

        {
          name: "codigo",

          label: "Código",

          placeholder: "Ej: PS",
        },
      ]}
      // =========================================
      // LISTA
      // =========================================

      items={regiones}
      renderItemTitle={(r) => r.nombre}
      renderItemSubtitle={(r) => `Código: ${r.codigo}`}
      onEdit={editarRegion}
      onToggleEstado={cambiarEstado}
    />
  );
}

export default CrearRegion;
