// frontend/src/modules/supervisor/recursos/GestionRecurso.jsx
import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../../context/AuthContext";
import OperacionLayout from "../../../shared/layouts/OperacionLayout";
import {
  getRecursosByTerritory,
  assignOficialToRecurso,
  removeOficialFromRecurso,
  liberarRecurso,
} from "../../../services/recursosService";
import { getUsuariosByTerritory } from "../../../services/userService";
import { getEscuadrasByTerritory } from "../../../services/escuadraService";
import {
  getRegiones,
  getDelegaciones,
} from "../../../services/territorialService";
import { useRoles } from "../../../hooks/useRoles";

// =========================================
// COMPONENTE
// =========================================

function GestionRecurso() {
  const { userData } = useContext(AuthContext);
  const {
    filters: territoryFilters,
    isAdmin,
    isUnidadOperativa,
    isSupervisor,
  } = useRoles(userData);

  // =========================================
  // STATES
  // =========================================

  const [recursos, setRecursos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [escuadras, setEscuadras] = useState([]);
  const [regiones, setRegiones] = useState([]);
  const [delegaciones, setDelegaciones] = useState([]);

  const [recursoSeleccionado, setRecursoSeleccionado] = useState(null);
  const [escuadraId, setEscuadraId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);

  const [filtros, setFiltros] = useState({
    region_id: "",
    delegacion_id: "",
  });

  // =========================================
  // CATÁLOGOS
  // =========================================

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [regionesData, delegacionesData] = await Promise.all([
          getRegiones(),
          getDelegaciones(),
        ]);
        setRegiones(regionesData);
        setDelegaciones(delegacionesData);
      } catch (error) {
        console.error("[GestionRecurso] Error cargando catálogos:", error);
      }
    };
    cargarCatalogos();
  }, []);

  // =========================================
  // CARGAR DATOS PRINCIPALES
  // =========================================

  const cargarDatos = async () => {
    if (!userData?.uid) return;

    try {
      setLoading(true);

      const filtrosFinales = {
        ...territoryFilters,
        ...(filtros.region_id && { region_id: filtros.region_id }),
        ...(filtros.delegacion_id && { delegacion_id: filtros.delegacion_id }),
      };

      const [recursosData, usuariosData, escuadrasData] = await Promise.all([
        getRecursosByTerritory(filtrosFinales),
        getUsuariosByTerritory({ ...filtrosFinales, estado_usuario: "activo" }),
        getEscuadrasByTerritory({ ...filtrosFinales, estado: "activo" }),
      ]);

      setRecursos(recursosData);
      setUsuarios(usuariosData);
      setEscuadras(escuadrasData);
    } catch (error) {
      console.error("[GestionRecurso] Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.uid) cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, territoryFilters, filtros]);

  // =========================================
  // DELEGACIONES FILTRADAS
  // =========================================

  const delegacionesFiltradas = useMemo(() => {
    if (!filtros.region_id) return delegaciones;
    return delegaciones.filter((d) => d.region_id === filtros.region_id);
  }, [delegaciones, filtros.region_id]);

  // =========================================
  // USUARIOS DISPONIBLES (sin recurso asignado, misma delegación)
  // =========================================

  const usuariosDisponibles = useMemo(() => {
    if (!recursoSeleccionado) return [];

    return usuarios.filter((u) => {
      const mismaRegion = u.region_id === recursoSeleccionado.region_id;
      const mismaDelegacion = u.delegacion_id === recursoSeleccionado.delegacion_id;
      const sinRecurso = !u.recurso_id;
      const texto = `${u.nombre} ${u.apellido1} ${u.apellido2 || ""} ${u.cedula || ""}`.toLowerCase();
      const coincide = !busqueda || texto.includes(busqueda.toLowerCase());

      return mismaRegion && mismaDelegacion && sinRecurso && coincide;
    });
  }, [usuarios, recursoSeleccionado, busqueda]);

  // =========================================
  // ESCUADRA SELECCIONADA (para asignación)
  // =========================================

  const escuadraSeleccionada = useMemo(() => {
    if (!escuadraId) return null;
    return escuadras.find((e) => e.id === escuadraId) || null;
  }, [escuadras, escuadraId]);

  // =========================================
  // AGREGAR OFICIAL A RECURSO
  // =========================================

  const agregarOficial = async (usuario) => {
    if (!recursoSeleccionado) return;

    if (!escuadraId) {
      alert("Seleccione la escuadra a la que pertenece este recurso");
      return;
    }

    try {
      setLoading(true);

      const result = await assignOficialToRecurso({
        recursoId: recursoSeleccionado.id,
        usuario,
        escuadraData: escuadraSeleccionada,
      });

      if (result.success) {
        // Actualizar recurso seleccionado con nuevos oficiales
        setRecursoSeleccionado((prev) => ({
          ...prev,
          oficiales: result.oficiales,
          escuadra_id: escuadraSeleccionada?.id || "",
          escuadra_nombre: escuadraSeleccionada?.nombre || "",
        }));

        await cargarDatos();
      }
    } catch (error) {
      console.error("[GestionRecurso] Error agregando oficial:", error);
      alert("Error agregando funcionario al recurso");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // REMOVER OFICIAL DE RECURSO
  // =========================================

  const removerOficial = async (oficialUid) => {
    if (!recursoSeleccionado) return;
    if (!confirm("¿Remover este funcionario del recurso?")) return;

    try {
      setLoading(true);

      const result = await removeOficialFromRecurso({
        recursoId: recursoSeleccionado.id,
        oficialUid,
      });

      if (result.success) {
        setRecursoSeleccionado((prev) => ({
          ...prev,
          oficiales: result.oficiales,
        }));

        await cargarDatos();
      }
    } catch (error) {
      console.error("[GestionRecurso] Error removiendo oficial:", error);
      alert("Error removiendo funcionario del recurso");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // GUARDAR ESCUADRA EN RECURSO
  // =========================================

  const guardarRecurso = async () => {
    if (!recursoSeleccionado) return;

    if (!escuadraId) {
      alert("Seleccione una escuadra");
      return;
    }

    try {
      setLoading(true);

      // Reasignar todos los oficiales actuales con la nueva escuadra
      // Solo actualizamos el campo escuadra en el recurso
      const { doc, updateDoc, Timestamp } = await import("firebase/firestore");
      const { db } = await import("../../../services/firebase");

      await updateDoc(doc(db, "recursos_operativos", recursoSeleccionado.id), {
        escuadra_id: escuadraSeleccionada?.id || "",
        escuadra_nombre: escuadraSeleccionada?.nombre || "",
        actualizado: Timestamp.now(),
      });

      setRecursoSeleccionado((prev) => ({
        ...prev,
        escuadra_id: escuadraSeleccionada?.id || "",
        escuadra_nombre: escuadraSeleccionada?.nombre || "",
      }));

      alert("Escuadra asignada correctamente");
      await cargarDatos();
    } catch (error) {
      console.error("[GestionRecurso] Error guardando escuadra:", error);
      alert("Error guardando escuadra");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // LIBERAR RECURSO
  // =========================================

  const liberarRecursoAction = async () => {
    if (!recursoSeleccionado) return;
    if (!confirm(`¿Liberar el recurso ${recursoSeleccionado.nombre_recurso}? Se desasignarán todos los funcionarios.`)) return;

    try {
      setLoading(true);

      const result = await liberarRecurso(recursoSeleccionado.id);

      if (result.success) {
        setRecursoSeleccionado(null);
        setEscuadraId("");
        await cargarDatos();
        alert("Recurso liberado correctamente");
      }
    } catch (error) {
      console.error("[GestionRecurso] Error liberando recurso:", error);
      alert("Error liberando recurso");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // SELECCIONAR RECURSO
  // =========================================

  const seleccionarRecurso = (recurso) => {
    setRecursoSeleccionado(recurso);
    setEscuadraId(recurso.escuadra_id || "");
    setBusqueda("");
  };

  // =========================================
  // RENDER
  // =========================================

  return (
    <OperacionLayout
      titulo="Gestión Operativa de Recursos"
      subtitulo="Asignación de personal y escuadra a recursos operativos"

      // FILTROS
      filtros={[
        {
          name: "region_id",
          label: "Región",
          type: "select",
          hidden: !isAdmin,
          options: [
            { label: "Todas las regiones", value: "" },
            ...regiones.map((r) => ({ label: `${r.codigo} - ${r.nombre}`, value: r.id })),
          ],
        },
        {
          name: "delegacion_id",
          label: "Delegación",
          type: "select",
          hidden: !isAdmin,
          disabled: !filtros.region_id,
          options: [
            { label: "Todas las delegaciones", value: "" },
            ...delegacionesFiltradas.map((d) => ({ label: `${d.codigo} - ${d.nombre}`, value: d.id })),
          ],
        },
      ]}
      filtrosData={filtros}
      onFiltroChange={(field, value) => {
        const nuevos = { ...filtros, [field]: value };
        if (field === "region_id") nuevos.delegacion_id = "";
        setFiltros(nuevos);
      }}

      // SIDEBAR — Lista de recursos
      sidebarTitle="Recursos"
      sidebarItems={recursos}
      sidebarSelected={recursoSeleccionado}
      onSelectSidebarItem={seleccionarRecurso}
      renderSidebarItem={(item) => (
        <div>
          <strong>{item.nombre_recurso || item.indicativo}</strong>
          <div style={{ fontSize: "12px", marginTop: "4px", opacity: 0.8 }}>
            {item.tipo_recurso} | {item.unidad}
          </div>
          <div style={{ fontSize: "11px", marginTop: "2px", opacity: 0.6 }}>
            {item.escuadra_nombre || "Sin escuadra"}
          </div>
          <div
            style={{
              marginTop: "6px",
              display: "inline-block",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: "bold",
              background: item.estado === "activo" ? "#dcfce7" : item.estado === "asignado" ? "#dbeafe" : "#fee2e2",
              color: item.estado === "activo" ? "#166534" : item.estado === "asignado" ? "#1e40af" : "#991b1b",
            }}
          >
            {item.estado}
          </div>
        </div>
      )}

      // LEFT — Disponibles para asignar
      leftTitle="Disponibles para asignar"
      leftContent={
        <div>
          {!recursoSeleccionado ? (
            <p style={emptyMsgStyle}>Seleccione un recurso de la lista</p>
          ) : (
            <>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar funcionario..."
                style={inputStyle}
              />
              <div style={{ marginTop: "12px" }}>
                {usuariosDisponibles.length === 0 ? (
                  <p style={emptyMsgStyle}>No hay funcionarios disponibles</p>
                ) : (
                  usuariosDisponibles.map((u) => (
                    <div key={u.id} style={userCardStyle}>
                      <div>
                        <strong style={{ fontSize: "13px" }}>
                          {u.nombre} {u.apellido1}
                        </strong>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          {u.rango_siglas || ""} | {u.rol}
                        </div>
                      </div>
                      <button onClick={() => agregarOficial(u)} style={addButtonStyle}>
                        Asignar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      }

      // CENTER — Asignados al recurso
      centerTitle="Personal asignado"
      centerContent={
        <div>
          {!recursoSeleccionado ? (
            <p style={emptyMsgStyle}>Seleccione un recurso</p>
          ) : (recursoSeleccionado.oficiales || []).length === 0 ? (
            <p style={emptyMsgStyle}>Sin personal asignado</p>
          ) : (
            (recursoSeleccionado.oficiales || []).map((o) => (
              <div key={o.uid} style={userCardStyle}>
                <div>
                  <strong style={{ fontSize: "13px" }}>{o.nombre}</strong>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {o.rango || ""} | {o.rol}
                  </div>
                </div>
                <button
                  onClick={() => removerOficial(o.uid)}
                  style={removeButtonStyle}
                >
                  Remover
                </button>
              </div>
            ))
          )}
        </div>
      }

      // RIGHT — Configuración del recurso
      rightTitle="Configuración del recurso"
      rightContent={
        <div>
          {!recursoSeleccionado ? (
            <p style={emptyMsgStyle}>Seleccione un recurso</p>
          ) : (
            <>
              <div style={infoBlockStyle}>
                <label style={labelStyle}>Recurso</label>
                <div style={infoValueStyle}>{recursoSeleccionado.nombre_recurso}</div>
              </div>

              <div style={infoBlockStyle}>
                <label style={labelStyle}>Tipo</label>
                <div style={infoValueStyle}>{recursoSeleccionado.tipo_recurso}</div>
              </div>

              <div style={infoBlockStyle}>
                <label style={labelStyle}>Unidad / Indicativo</label>
                <div style={infoValueStyle}>
                  {recursoSeleccionado.unidad} | {recursoSeleccionado.indicativo}
                </div>
              </div>

              <div style={infoBlockStyle}>
                <label style={labelStyle}>Estado</label>
                <div style={infoValueStyle}>{recursoSeleccionado.estado}</div>
              </div>

              <div style={{ ...infoBlockStyle, marginTop: "20px" }}>
                <label style={labelStyle}>Asignar escuadra</label>
                <select
                  value={escuadraId}
                  onChange={(e) => setEscuadraId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Sin escuadra</option>
                  {escuadras.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.codigo} - {e.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <button onClick={guardarRecurso} style={primaryButtonStyle}>
                Guardar escuadra
              </button>

              <button
                onClick={liberarRecursoAction}
                style={dangerButtonStyle}
              >
                Liberar recurso completo
              </button>
            </>
          )}
        </div>
      }

      loading={loading}
    />
  );
}

// =========================================
// ESTILOS
// =========================================

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "14px",
  boxSizing: "border-box",
};

const userCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "12px",
  marginBottom: "10px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "white",
};

const addButtonStyle = {
  padding: "6px 12px",
  border: "none",
  borderRadius: "6px",
  background: "#1e293b",
  color: "white",
  fontSize: "12px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const removeButtonStyle = {
  padding: "6px 12px",
  border: "1px solid #fecaca",
  borderRadius: "6px",
  background: "#fef2f2",
  color: "#dc2626",
  fontSize: "12px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const primaryButtonStyle = {
  width: "100%",
  padding: "11px",
  border: "none",
  borderRadius: "8px",
  background: "#1e293b",
  color: "white",
  fontWeight: "500",
  fontSize: "14px",
  cursor: "pointer",
  marginTop: "12px",
};

const dangerButtonStyle = {
  width: "100%",
  padding: "11px",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  background: "#fef2f2",
  color: "#dc2626",
  fontWeight: "500",
  fontSize: "14px",
  cursor: "pointer",
  marginTop: "10px",
};

const infoBlockStyle = {
  marginBottom: "14px",
};

const labelStyle = {
  display: "block",
  fontSize: "12px",
  color: "#64748b",
  fontWeight: "500",
  marginBottom: "4px",
};

const infoValueStyle = {
  fontSize: "14px",
  color: "#1e293b",
  fontWeight: "500",
};

const emptyMsgStyle = {
  color: "#94a3b8",
  fontSize: "13px",
  textAlign: "center",
  padding: "20px 0",
};

export default GestionRecurso;
