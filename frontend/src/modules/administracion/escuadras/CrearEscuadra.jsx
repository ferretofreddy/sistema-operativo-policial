// frontend/src/modules/administracion/escuadras/CrearEscuadra.jsx
import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { AuthContext } from "../../../context/AuthContext";
import {
  RegionRepository,
  DelegationRepository,
  SquadRepository,
  UserRepository,
} from "../../../core";
import GestionLayout from "../../../shared/layouts/GestionLayout";

function CrearEscuadra() {
  const { userData } = useContext(AuthContext);

  const esAdmin           = userData?.rol === "admin";
  const esUnidadOperativa = userData?.rol === "unidad_operativa";

  const [regiones,     setRegiones]     = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);
  const [escuadras,    setEscuadras]    = useState([]);
  const [editandoId,   setEditandoId]   = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  const [filtros, setFiltros] = useState({
    region_id:     "",
    delegacion_id: "",
    busqueda:      "",
  });

  const [formData, setFormData] = useState({
    region_id:     "",
    delegacion_id: "",
    nombre:        "",
    codigo:        "",
    estado:        "activo",
  });

  // =========================================
  // INIT FILTROS TERRITORIALES (unidad_operativa)
  // NOTA: en PostgreSQL no existe userData.region_id
  // La región se obtiene vía JOIN delegation → region
  // Para unidad_operativa usamos su delegation_id directamente
  // =========================================

  useEffect(() => {
    if (esUnidadOperativa && userData?.delegation_id) {
      setFiltros((prev) => ({
        ...prev,
        delegacion_id: userData.delegation_id,
      }));
      setFormData((prev) => ({
        ...prev,
        delegacion_id: userData.delegation_id,
      }));
    }
  }, [esUnidadOperativa, userData]);

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
      const data = await DelegationRepository.getActivas();
      setDelegaciones(data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch (err) {
      setError("Error al cargar delegaciones: " + err.message);
    }
  }, []);

  const cargarEscuadras = useCallback(async () => {
    if (!userData) return;
    try {
      let filtrosQuery = {};
      // unidad_operativa solo ve escuadras de su delegación
      if (esUnidadOperativa && userData.delegation_id) {
        filtrosQuery = { delegation_id: userData.delegation_id };
      }
      const data = await SquadRepository.getAll(filtrosQuery, { includeInactive: true });
      setEscuadras(data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch (err) {
      setError("Error al cargar escuadras: " + err.message);
    }
  }, [userData, esUnidadOperativa]);

  useEffect(() => {
    cargarRegiones();
    cargarDelegaciones();
  }, [cargarRegiones, cargarDelegaciones]);

  useEffect(() => {
    cargarEscuadras();
  }, [cargarEscuadras]);

  // =========================================
  // DELEGACIONES FILTRADAS PARA FORM Y FILTROS
  // JOIN local: delegar → region
  // =========================================

  const delegacionesParaForm = useMemo(() => {
    if (!formData.region_id) return [];
    return delegaciones.filter((d) => d.region_id === formData.region_id);
  }, [delegaciones, formData.region_id]);

  const delegacionesParaFiltro = useMemo(() => {
    if (!filtros.region_id) return [];
    return delegaciones.filter((d) => d.region_id === filtros.region_id);
  }, [delegaciones, filtros.region_id]);

  const escuadrasFiltradas = useMemo(() => {
    return escuadras.filter((e) => {
      const filtroDeleg   = !filtros.delegacion_id || e.delegation_id === filtros.delegacion_id;
      const texto         = filtros.busqueda.toLowerCase().trim();
      const filtroBusq    = !texto ||
        e.nombre?.toLowerCase().includes(texto) ||
        e.codigo?.toLowerCase().includes(texto);

      // Para admin: también filtrar por región (JOIN local)
      let filtroRegion = true;
      if (filtros.region_id) {
        const delega = delegaciones.find((d) => d.id === e.delegation_id);
        filtroRegion = delega?.region_id === filtros.region_id;
      }

      return filtroRegion && filtroDeleg && filtroBusq;
    });
  }, [escuadras, filtros, delegaciones]);

  // Helpers JOIN local para mostrar nombres en tabla
  const getNombreDeleg  = (id) => delegaciones.find((d) => d.id === id)?.nombre ?? "—";
  const getNombreRegion = (delegId) => {
    const deleg = delegaciones.find((d) => d.id === delegId);
    return regiones.find((r) => r.id === deleg?.region_id)?.nombre ?? "—";
  };

  // =========================================
  // HANDLERS
  // =========================================

  const handleFiltroChange = (field, value) => {
    setFiltros((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "region_id") next.delegacion_id = "";
      return next;
    });
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "region_id") next.delegacion_id = "";
      return next;
    });
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setFormData({
      region_id:     esUnidadOperativa ? "" : "",
      delegacion_id: esUnidadOperativa ? (userData?.delegation_id ?? "") : "",
      nombre:        "",
      codigo:        "",
      estado:        "activo",
    });
    setError("");
  };

  const guardarEscuadra = async () => {
    if (!formData.delegacion_id)    { setError("Seleccione una delegación."); return; }
    if (!formData.nombre.trim())    { setError("Ingrese el nombre.");         return; }
    if (!formData.codigo.trim())    { setError("Ingrese el código.");         return; }

    const nombre = formData.nombre.trim().toUpperCase();
    const codigo = formData.codigo.trim().toUpperCase();

    const delegacion = delegaciones.find((d) => d.id === formData.delegacion_id);
    if (!delegacion) { setError("Delegación inválida."); return; }

    // Código único solo dentro de la misma delegación
    const codigoExiste = escuadras.find(
      (e) => e.codigo === codigo &&
             e.delegation_id === delegacion.id &&
             e.id !== editandoId,
    );
    if (codigoExiste) {
      setError("Ese código ya existe en esta delegación.");
      return;
    }

    // Nombre único solo dentro de la misma delegación
    const nombreExiste = escuadras.find(
      (e) => e.nombre === nombre &&
             e.delegation_id === delegacion.id &&
             e.id !== editandoId,
    );
    if (nombreExiste) {
      setError("Ya existe una escuadra con ese nombre en esta delegación.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // CRÍTICO: NO guardar region_nombre ni delegacion_nombre
      // En PostgreSQL se obtienen vía JOIN
      const datos = {
        nombre,
        codigo,
        estado:        formData.estado,
        delegation_id: delegacion.id,
      };

      if (!editandoId) {
        await SquadRepository.crear(datos);
      } else {
        await SquadRepository.update(editandoId, datos);
      }
      limpiarFormulario();
      await cargarEscuadras();
    } catch (err) {
      setError("Error al guardar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const editarEscuadra = (escuadra) => {
    setEditandoId(escuadra.id);

    // Resolver region_id desde delegation_id (JOIN local)
    const deleg = delegaciones.find((d) => d.id === escuadra.delegation_id);

    setFormData({
      region_id:     deleg?.region_id    ?? "",
      delegacion_id: escuadra.delegation_id ?? "",
      nombre:        escuadra.nombre     ?? "",
      codigo:        escuadra.codigo     ?? "",
      estado:        escuadra.estado     ?? "activo",
    });
    setError("");
  };

  const cambiarEstado = async (escuadra) => {
    setLoading(true);
    setError("");
    try {
      const nuevoEstado = escuadra.estado === "activo" ? "inactivo" : "activo";

      if (nuevoEstado === "inactivo") {
        // Limpiar usuarios asignados a esta escuadra
        // Reemplaza: query(collection(db, "usuarios"), where("escuadra_id", "==", id))
        const usuarios = await UserRepository.getAll({ squad_id: escuadra.id });
        for (const usuario of usuarios) {
          await UserRepository.update(usuario.id, { squad_id: null });
        }

        // Inactivar escuadra y limpiar supervisor
        await SquadRepository.update(escuadra.id, {
          estado:        "inactivo",
          supervisor_id: null,
        });
      } else {
        await SquadRepository.update(escuadra.id, { estado: "activo" });
      }

      await cargarEscuadras();
    } catch (err) {
      setError("Error actualizando estado: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <div style={errorBannerStyle}>{error}</div>}
      <GestionLayout
        titulo="Gestión Escuadras"
        subtitulo="Administración estructural de escuadras institucionales"
        filtros={[
          {
            name: "region_id",
            label: "Región",
            type: "select",
            hidden: !esAdmin,
            options: [
              { label: "Todas", value: "" },
              ...regiones.map((r) => ({ label: `${r.codigo} - ${r.nombre}`, value: r.id })),
            ],
          },
          {
            name: "delegacion_id",
            label: "Delegación",
            type: "select",
            hidden: !esAdmin,
            disabled: !filtros.region_id,
            options: [
              { label: "Todas", value: "" },
              ...delegacionesParaFiltro.map((d) => ({ label: `${d.codigo} - ${d.nombre}`, value: d.id })),
            ],
          },
          { name: "busqueda", label: "Buscar", placeholder: "Nombre o código" },
        ]}
        filtrosData={filtros}
        onFiltroChange={handleFiltroChange}
        columnas={["Código", "Escuadra", "Delegación", "Región", "Estado"]}
        items={escuadrasFiltradas}
        renderCelda={(item, columna) => {
          switch (columna) {
            case "Código":     return item.codigo;
            case "Escuadra":   return item.nombre;
            case "Delegación": return getNombreDeleg(item.delegation_id);
            case "Región":     return getNombreRegion(item.delegation_id);
            case "Estado":     return (
              <span style={item.estado === "activo" ? badgeActiveStyle : badgeInactiveStyle}>
                {item.estado}
              </span>
            );
            default: return "";
          }
        }}
        onEditar={editarEscuadra}
        onCambiarEstado={cambiarEstado}
        formTitle={editandoId ? "Editar Escuadra" : "Nueva Escuadra"}
        formFields={[
          {
            name: "region_id",
            label: "Región",
            type: "select",
            hidden: !esAdmin,
            disabled: esUnidadOperativa,
            options: [
              { label: "Seleccione región", value: "" },
              ...regiones.map((r) => ({ label: `${r.codigo} - ${r.nombre}`, value: r.id })),
            ],
          },
          {
            name: "delegacion_id",
            label: "Delegación",
            type: "select",
            disabled: !formData.region_id || esUnidadOperativa,
            options: [
              { label: "Seleccione delegación", value: "" },
              ...delegacionesParaForm.map((d) => ({ label: `${d.codigo} - ${d.nombre}`, value: d.id })),
            ],
          },
          { name: "nombre", label: "Nombre", placeholder: "Ej: Escuadra Norte" },
          { name: "codigo", label: "Código", placeholder: "Ej: EN1" },
          {
            name: "estado",
            label: "Estado",
            type: "select",
            options: [
              { label: "Activo",   value: "activo" },
              { label: "Inactivo", value: "inactivo" },
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
    </>
  );
}

const errorBannerStyle   = { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", color: "#dc2626", margin: "16px 20px 0" };
const badgeActiveStyle   = { background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };
const badgeInactiveStyle = { background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" };

export default CrearEscuadra;
