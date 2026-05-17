// frontend/src/modules/supervisor/recursos/GestionRecurso.jsx
import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../../context/AuthContext";
import OperacionLayout from "../../../shared/layouts/OperacionLayout";
import { getRecursosByTerritory } from "../../../services/recursosService";
import { getUsuariosByTerritory } from "../../../services/userService";
import { getEscuadrasByTerritory } from "../../../services/escuadraService";
import { useRoles } from "../../../hooks/useRoles";
import {
  assignOficialToRecurso,
  removeOficialFromRecurso,
  liberarRecurso,
} from "../../../services/recursosService";

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
  const [filtros, setFiltros] = useState({ region_id: "", delegacion_id: "" });


  // ✅ CORRECCIÓN: liberarRecursoAction llama al servicio corregido
  const liberarRecursoAction = async () => {
    try {
      if (!recursoSeleccionado || !confirm("¿Liberar recurso?")) return;
      setLoading(true);

      const result = await liberarRecurso(recursoSeleccionado.id);

      if (result.success) {
        setRecursoSeleccionado(null);
        setEscuadraId("");

        const [recursosData, usuariosData] = await Promise.all([
          getRecursosByTerritory({ ...territoryFilters, ...filtros }),
          getUsuariosByTerritory({
            ...territoryFilters,
            ...filtros,
            estado_usuario: "activo",
          }),
        ]);
        setRecursos(recursosData);
        setUsuarios(usuariosData);
      }
    } catch (error) {
      console.error(error);
      alert("Error liberando recurso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OperacionLayout
      // ... props ...
      rightContent={
        <div>
          {recursoSeleccionado && (
            <>
              <div style={{ marginBottom: "15px" }}>
                <strong>Estado:</strong>
                <div>{recursoSeleccionado.estado}</div>
              </div>
              <div style={{ marginBottom: "15px" }}>
                <strong>Escuadra:</strong>
                <div>
                  {recursoSeleccionado.escuadra_nombre || "Sin escuadra"}
                </div>
              </div>
              <button onClick={guardarRecurso} style={actionButtonStyle}>
                Guardar
              </button>
              <button onClick={liberarRecursoAction} style={dangerButtonStyle}>
                Liberar Recurso
              </button>
            </>
          )}
        </div>
      }
      loading={loading}
    />
  );
}

export default GestionRecurso;
