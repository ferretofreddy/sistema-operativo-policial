// frontend/src/modules/administracion/regiones/CrearRegion.jsx
import { useEffect, useState, useCallback } from "react";
import { RegionRepository } from "../../../core";
import CatalogoSimpleLayout from "../../../shared/layouts/CatalogoSimpleLayout";

function CrearRegion() {
  const [formData,   setFormData]   = useState({ nombre: "", codigo: "" });
  const [regiones,   setRegiones]   = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  // =========================================
  // CARGAR
  // =========================================

  const cargarRegiones = useCallback(async () => {
    try {
      const data = await RegionRepository.getAll({}, { includeInactive: true });
      setRegiones(data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch (err) {
      setError("Error al cargar regiones: " + err.message);
    }
  }, []);

  useEffect(() => { cargarRegiones(); }, [cargarRegiones]);

  // =========================================
  // HANDLERS
  // =========================================

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const limpiarFormulario = () => {
    setFormData({ nombre: "", codigo: "" });
    setEditandoId(null);
    setError("");
  };

  const guardarRegion = async () => {
    const nombre = formData.nombre.trim().toUpperCase();
    const codigo = formData.codigo.trim().toUpperCase();

    if (!nombre || !codigo) {
      setError("Complete todos los campos.");
      return;
    }

    // Validar duplicados localmente
    const nombreExiste = regiones.find(
      (r) => r.nombre === nombre && r.id !== editandoId,
    );
    if (nombreExiste) { setError("Ya existe una región con ese nombre."); return; }

    const codigoExiste = regiones.find(
      (r) => r.codigo === codigo && r.id !== editandoId,
    );
    if (codigoExiste) { setError("Ya existe una región con ese código."); return; }

    setLoading(true);
    setError("");
    try {
      if (!editandoId) {
        await RegionRepository.crear({ nombre, codigo, estado: "activo" });
      } else {
        await RegionRepository.update(editandoId, { nombre, codigo });
      }
      limpiarFormulario();
      await cargarRegiones();
    } catch (err) {
      setError("Error al guardar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const editarRegion = (region) => {
    setEditandoId(region.id);
    setFormData({ nombre: region.nombre || "", codigo: region.codigo || "" });
    setError("");
  };

  const cambiarEstado = async (region) => {
    try {
      const nuevoEstado = region.estado === "activo" ? "inactivo" : "activo";
      await RegionRepository.update(region.id, { estado: nuevoEstado });
      await cargarRegiones();
    } catch (err) {
      setError("Error actualizando estado: " + err.message);
    }
  };

  return (
    <>
      {error && (
        <div style={errorBannerStyle}>{error}</div>
      )}
      <CatalogoSimpleLayout
        titulo="Gestión Regiones"
        subtitulo="Administración de regiones operativas"
        formTitle={editandoId ? "Editar Región" : "Nueva Región"}
        formData={formData}
        onChange={handleChange}
        onSubmit={guardarRegion}
        onCancel={limpiarFormulario}
        editando={!!editandoId}
        loading={loading}
        fields={[
          { name: "nombre", label: "Nombre Región", placeholder: "Ej: Pacífico Sur" },
          { name: "codigo", label: "Código",         placeholder: "Ej: PS" },
        ]}
        items={regiones}
        renderItemTitle={(r) => r.nombre}
        renderItemSubtitle={(r) => `Código: ${r.codigo}`}
        onEdit={editarRegion}
        onToggleEstado={cambiarEstado}
      />
    </>
  );
}

const errorBannerStyle = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "10px 16px",
  fontSize: "13px",
  color: "#dc2626",
  margin: "16px 20px 0",
};

export default CrearRegion;
