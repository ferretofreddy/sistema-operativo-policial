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

function GestionRangosUsuario() {
  // =========================================
  // 🔥 DATA
  // =========================================

  const [rangos, setRangos] = useState([]);

  // =========================================
  // 🔥 FORM
  // =========================================

  const [formData, setFormData] = useState({
    nombre: "",

    siglas: "",

    orden_jerarquico: "",

    estado: "activo",
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
  // 🔥 CARGAR
  // =========================================

  const cargarRangos = async () => {
    try {
      const snapshot = await getDocs(collection(db, "rangos_usuario"));

      const lista = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .sort((a, b) => (a.orden_jerarquico || 0) - (b.orden_jerarquico || 0));

      setRangos(lista);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarRangos();
  }, []);

  // =========================================
  // 🔥 CHANGE
  // =========================================

  const handleChange = (field, value) => {
    setFormData({
      ...formData,

      [field]: value,
    });
  };

  // =========================================
  // 🔥 LIMPIAR
  // =========================================

  const limpiarFormulario = () => {
    setFormData({
      nombre: "",

      siglas: "",

      orden_jerarquico: "",

      estado: "activo",
    });

    setEditandoId(null);
  };

  // =========================================
  // 🔥 GUARDAR
  // =========================================

  const guardarRango = async () => {
    try {
      setLoading(true);

      const nombre = formData.nombre.trim().toUpperCase();

      const siglas = formData.siglas.trim().toUpperCase();

      const orden = Number(formData.orden_jerarquico);

      // =========================================
      // 🔥 VALIDAR
      // =========================================

      if (!nombre) {
        alert("Ingrese el nombre");

        return;
      }

      if (!siglas) {
        alert("Ingrese las siglas");

        return;
      }

      if (!orden) {
        alert("Ingrese el orden jerárquico");

        return;
      }

      // =========================================
      // 🔥 DUPLICADOS
      // =========================================

      const nombreExiste = rangos.find(
        (r) => r.nombre === nombre && r.id !== editandoId,
      );

      if (nombreExiste) {
        alert("Este rango ya existe");

        return;
      }

      const siglasExiste = rangos.find(
        (r) => r.siglas === siglas && r.id !== editandoId,
      );

      if (siglasExiste) {
        alert("Estas siglas ya existen");

        return;
      }

      const ordenExiste = rangos.find(
        (r) => Number(r.orden_jerarquico) === orden && r.id !== editandoId,
      );

      if (ordenExiste) {
        alert("Ese orden ya existe");

        return;
      }

      const datos = {
        nombre,

        siglas,

        orden_jerarquico: orden,

        estado: formData.estado,

        actualizado: Timestamp.now(),
      };

      // =========================================
      // 🔥 CREAR
      // =========================================

      if (!editandoId) {
        await addDoc(
          collection(db, "rangos_usuario"),

          {
            ...datos,

            creado: Timestamp.now(),
          },
        );

        alert("Rango creado");
      } else {
        // =========================================
        // 🔥 ACTUALIZAR
        // =========================================

        await updateDoc(
          doc(db, "rangos_usuario", editandoId),

          datos,
        );

        alert("Rango actualizado");
      }

      limpiarFormulario();

      await cargarRangos();
    } catch (error) {
      console.error(error);

      alert("Error guardando rango");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // 🔥 EDITAR
  // =========================================

  const editarRango = (rango) => {
    setEditandoId(rango.id);

    setFormData({
      nombre: rango.nombre || "",

      siglas: rango.siglas || "",

      orden_jerarquico: rango.orden_jerarquico || "",

      estado: rango.estado || "activo",
    });
  };

  // =========================================
  // 🔥 ESTADO
  // =========================================

  const cambiarEstado = async (rango) => {
    try {
      const nuevoEstado = rango.estado === "activo" ? "inactivo" : "activo";

      await updateDoc(
        doc(db, "rangos_usuario", rango.id),

        {
          estado: nuevoEstado,

          actualizado: Timestamp.now(),
        },
      );

      await cargarRangos();
    } catch (error) {
      console.error(error);

      alert("Error actualizando estado");
    }
  };

  return (
    <CatalogoSimpleLayout
      // =========================================
      // 🔥 HEADER
      // =========================================

      titulo="
      Gestión Rangos Usuario
      "
      subtitulo="
      Administración de rangos jerárquicos institucionales
      "
      // =========================================
      // 🔥 FORM
      // =========================================

      formTitle={editandoId ? "Editar Rango" : "Nuevo Rango"}
      formData={formData}
      onChange={handleChange}
      onSubmit={guardarRango}
      onCancel={limpiarFormulario}
      editando={!!editandoId}
      loading={loading}
      fields={[
        {
          name: "nombre",

          label: "Nombre",

          placeholder: "Ej: Oficial",
        },

        {
          name: "siglas",

          label: "Siglas",

          placeholder: "Ej: OF",
        },

        {
          name: "orden_jerarquico",

          label: "Orden Jerárquico",

          type: "number",

          placeholder: "Ej: 1",
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
      // 🔥 LISTA
      // =========================================

      items={rangos}
      renderItemTitle={(r) => `${r.siglas} - ${r.nombre}`}
      renderItemSubtitle={(r) => `Orden jerárquico: ${r.orden_jerarquico}`}
      onEdit={editarRango}
      onToggleEstado={cambiarEstado}
    />
  );
}

export default GestionRangosUsuario;
