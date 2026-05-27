// frontend/src/modules/administracion/delegaciones/CrearDelegacion.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { RegionRepository, DelegationRepository } from "../../../core";
import GestionLayout from "../../../shared/layouts/GestionLayout";

function CrearDelegacion() {
  const [regiones,     setRegiones]     = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);
  const [editandoId,   setEditandoId]   = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  const [filtros, setFiltros] = useState({ region_id: "", busqueda: "" });

  const [formData, setFormData] = useState({ region_id: "", nombre: "", codigo: "" });

  // =========================================
  // CARGAR
  // =========================================

  const cargarRegiones = useCallback(async () => {
    try {
      const data = await RegionRepository.getActivas();
      setRegiones(data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch (err) {
      setError("Error al cargar regiones: " + err.message);
    }
  }, []);

  const cargarDelegaciones = useCallback(async () => {
    try {
      const data = await DelegationRepository.getAll({ delegation_type: 'cantonal' }, { includeInactive: true });
      setDelegaciones(data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch (err) {
      setError("Error al cargar delegaciones: " + err.message);
    }
  }, []);

  useEffect(() => {
    cargarRegiones();
    cargarDelegaciones();
  }, [cargarRegiones, cargarDelegaciones]);

  // =========================================
  // FILTROS
  // =========================================

  const delegacionesFiltradas = useMemo(() => {
    return delegaciones.filter((d) => {
      const filtroRegion   = !filtros.region_id || d.region_id === filtros.region_id;
      const texto          = filtros.busqueda.toLowerCase().trim();
      const filtroBusqueda = !texto ||
        d.nombre?.toLowerCase().includes(texto) ||
        d.codigo?.toLowerCase().includes(texto);
      return filtroRegion && filtroBusqueda;
    });
  }, [delegaciones, filtros]);

  // =========================================
  // HANDLERS
  // =========================================

  const handleFiltroChange = (field, value) => {
    setFiltros((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const limpiarFormulario = () => {
    setFormData({ region_id: "", nombre: "", codigo: "" });
    setEditandoId(null);
    setError("");
  };

  const guardarDelegacion = async () => {
    const nombre = formData.nombre.trim().toUpperCase();
    const codigo = formData.codigo.trim().toUpperCase();

    if (!formData.region_id) { setError("Seleccione una región.");   return; }
    if (!nombre)              { setError("Ingrese el nombre.");       return; }
    if (!codigo)              { setError("Ingrese el código.");       return; }

    const region = regiones.find((r) => r.id === formData.region_id);
    if (!region) { setError("Región inválida."); return; }

    // Validar duplicados localmente
    const nombreExiste = delegaciones.find(
      (d) => d.nombre === nombre && d.region_id === region.id && d.id !== editandoId,
    );
    if (nombreExiste) { setError("Ya existe una delegación con ese nombre en esa región."); return; }

    const codigoExiste = delegaciones.find(
      (d) => d.codigo === codigo && d.id !== editandoId,
    );
    if (codigoExiste) { setError("Ese código ya existe."); return; }

    setLoading(true);
    setError("");
    try {
      // CRÍTICO: NO guardar region_nombre — en PostgreSQL se obtiene vía JOIN
      const datos = { nombre, codigo, region_id: region.id, delegation_type: 'cantonal' };

      if (!editandoId) {
        await DelegationRepository.crear({ ...datos, estado: "activo" });
      } else {
        await DelegationRepository.update(editandoId, datos);
      }
      limpiarFormulario();
      await cargarDelegaciones();
    } catch (err) {
      setError("Error al guardar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const editarDelegacion = (delegacion) => {
    setEditandoId(delegacion.id);
    setFormData({
      region_id: delegacion.region_id || "",
      nombre:    delegacion.nombre    || "",
      codigo:    delegacion.codigo    || "",
    });
    setError("");
  };

  // Nombre de región para mostrar en tabla (JOIN local)
  const getNombreRegion = (regionId) => {
    return regiones.find((r) => r.id === regionId)?.nombre ?? "—";
  };

  return (
    <>
      {error && <div style={errorBannerStyle}>{error}</div>}
      <GestionLayout
        titulo="Delegaciones Cantonales"
        subtitulo="Gestión de delegaciones cantonales"
        filtros={[
          {
            name: "region_id",
            label: "Región",
            type: "select",
            options: [
              { label: "Todas", value: "" },
              ...regiones.map((r) => ({ label: `${r.codigo} - ${r.nombre}`, value: r.id })),
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
        columnas={["Código", "Delegación", "Región", "Estado"]}
        items={delegacionesFiltradas}
        renderCelda={(item, columna) => {
          switch (columna) {
            case "Código":     return item.codigo;
            case "Delegación": return item.nombre;
            case "Región":     return getNombreRegion(item.region_id);
            case "Estado":     return (
              <span style={item.estado === "activo" ? badgeActiveStyle : badgeInactiveStyle}>
                {item.estado}
              </span>
            );
            default: return "";
          }
        }}
        onEditar={editarDelegacion}
        onCambiarEstado={async (item) => {
          try {
            await DelegationRepository.update(item.id, {
              estado: item.estado === "activo" ? "inactivo" : "activo",
            });
            await cargarDelegaciones();
          } catch (err) {
            setError("Error actualizando estado: " + err.message);
          }
        }}
        formTitle={editandoId ? "Editar Delegación Cantonal" : "Nueva Delegación Cantonal"}
        formFields={[
          {
            name: "region_id",
            label: "Región",
            type: "select",
            options: [
              { label: "Seleccione región", value: "" },
              ...regiones.map((r) => ({ label: `${r.codigo} - ${r.nombre}`, value: r.id })),
            ],
          },
          { name: "nombre", label: "Nombre", placeholder: "Ej: Puerto Jiménez" },
          { name: "codigo", label: "Código", placeholder: "Ej: PJ" },
        ]}
        formData={formData}
        onFormChange={handleFormChange}
        onSubmit={guardarDelegacion}
        onCancel={limpiarFormulario}
        editando={!!editandoId}
        loading={loading}
      />
    </>
  );
}

const errorBannerStyle   = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", color: "#dc2626", margin: "16px 20px 0" };
const badgeActiveStyle   = { background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };
const badgeInactiveStyle = { background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };

export default CrearDelegacion;
