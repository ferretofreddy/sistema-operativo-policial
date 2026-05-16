// frontend/src/modules/administracion/usuarios/GestionUsuarios.jsx
import { useContext, useEffect, useMemo, useState } from "react"; // ✅ useContext agregado
import { Timestamp } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../../services/firebase";
import {
  getUsuariosByTerritory,
  updateUsuario,
} from "../../../services/userService";
import {
  getRegiones,
  getDelegaciones,
} from "../../../services/territorialService";
import {
  getRangosUsuario,
  getCondicionesUsuario,
} from "../../../services/catalogosService";
import { AuthContext } from "../../../context/AuthContext"; // ✅ AuthContext agregado
import { useRoles } from "../../../hooks/useRoles";

function GestionUsuarios() {
  // ✅ CORRECCIÓN #3: Separar useContext de useRoles
  const { userData } = useContext(AuthContext);
  const { filters: territoryFilters, isAdmin } = useRoles(userData);

  // ... resto del componente igual, pero usando territoryFilters para queries ...

  // Ejemplo de uso corregido en useEffect:
  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        const filters = {
          ...territoryFilters,
          ...(filtroRegion && { region_id: filtroRegion }),
          // ... otros filtros
        };
        const usuariosData = await getUsuariosByTerritory(filters, {
          includeInactive: true,
        });
        setUsuarios(usuariosData);
      } catch (error) {
        console.error("Error cargando usuarios:", error);
      }
    };
    if (userData?.uid) cargarUsuarios();
  }, [userData, territoryFilters /* ...deps... */]);

  // ... resto del código igual ...
}

// ... estilos iguales ...
export default GestionUsuarios;
