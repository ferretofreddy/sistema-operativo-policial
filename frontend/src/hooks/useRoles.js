// frontend/src/hooks/useRoles.js
import { useMemo } from "react";

export const useRoles = (userData) => {
    const rol = userData?.rol;

    // =========================================
    // 🔹 TERRITORIO
    // =========================================

    const territory = useMemo(() => {
        if (rol === "admin") {
            return {
                all: true,
            };
        }

        if (
            rol === "unidad_operativa" ||
            rol === "supervisor"
        ) {
            return {
                region_id: userData?.region_id,
                region_nombre: userData?.region_nombre,

                delegacion_id:
                    userData?.delegacion_id,

                delegacion_nombre:
                    userData?.delegacion_nombre,

                ...(rol === "supervisor" && {
                    escuadra_id:
                        userData?.escuadra_id,

                    escuadra_nombre:
                        userData?.escuadra_nombre,
                }),
            };
        }

        return {
            none: true,
        };
    }, [rol, userData]);

    // =========================================
    // 🔹 FILTROS FIRESTORE
    // =========================================

    const filters = useMemo(() => {
        if (territory.all) {
            return {};
        }

        if (territory.none) {
            return {
                uid: userData?.uid,
            };
        }

        return {
            region_id:
                territory.region_id,

            delegacion_id:
                territory.delegacion_id,

            ...(rol === "supervisor" && {
                escuadra_id:
                    territory.escuadra_id,
            }),
        };
    }, [territory, rol, userData]);

    // =========================================
    // 🔹 RETURN
    // =========================================

    return {
        rol,

        isAdmin: rol === "admin",

        isUnidadOperativa:
            rol === "unidad_operativa",

        isSupervisor:
            rol === "supervisor",

        isAgente:
            rol === "agente",

        isJefatura:
            rol === "jefatura",

        // 🔹 PERMISOS
        canManageTerritory:
            rol !== "agente",

        canAssignPersonnel: [
            "admin",
            "unidad_operativa",
            "supervisor",
        ].includes(rol),

        canViewAllRegions:
            rol === "admin",

        // 🔹 HELPERS
        hasRole: (roles) =>
            Array.isArray(roles)
                ? roles.includes(rol)
                : roles === rol,

        // 🔹 TERRITORIO
        territoryScope:
            territory,

        // 🔹 FIRESTORE
        filters,
    };
};