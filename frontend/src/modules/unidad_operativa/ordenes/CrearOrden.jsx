import { useState, useContext } from "react";

import { db } from "../../../services/firebase";

import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

import { AuthContext } from "../../../context/AuthContext";

import MainLayout from "../../../layouts/MainLayout";

import { useNavigate } from "react-router-dom";

function CrearOrden() {
  const { user } = useContext(AuthContext);

  const navigate = useNavigate();

  // 🔥 FORMULARIO
  const [consecutivo, setConsecutivo] = useState("");

  const [nombre, setNombre] = useState("");

  const [codigo, setCodigo] = useState("");

  const [fechaInicio, setFechaInicio] = useState("");

  const [fechaFin, setFechaFin] = useState("");

  const [loading, setLoading] = useState(false);

  // 🔥 CREAR
  const handleCrear = async () => {
    try {
      setLoading(true);

      // 🔥 VALIDACIONES CAMPOS
      if (!consecutivo || !nombre || !fechaInicio || !fechaFin) {
        alert("Complete todos los campos obligatorios");

        setLoading(false);

        return;
      }

      // 🔥 VALIDAR USUARIO
      if (!user?.region_id || !user?.delegacion_id) {
        alert("El usuario no tiene región o delegación asignada");

        setLoading(false);

        return;
      }

      // 🔥 VALIDAR FECHAS
      if (fechaFin < fechaInicio) {
        alert("La fecha final no puede ser menor a la inicial");

        setLoading(false);

        return;
      }

      // 🔥 LIMPIAR TEXTO
      const consecutivoLimpio = consecutivo.trim().toUpperCase();

      const nombreLimpio = nombre.trim();

      const codigoLimpio = codigo.trim().toUpperCase();

      // 🔥 VALIDAR DUPLICADO
      // Solo dentro de la misma región/delegación
      const q = query(
        collection(db, "ordenes"),

        where("consecutivo", "==", consecutivoLimpio),

        where("region_id", "==", user.region_id),

        where("delegacion_id", "==", user.delegacion_id),
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        alert("Ya existe una orden con ese consecutivo en esta delegación");

        setLoading(false);

        return;
      }

      // 🔥 GUARDAR
      await addDoc(collection(db, "ordenes"), {
        consecutivo: consecutivoLimpio,

        nombre: nombreLimpio,

        codigo: codigoLimpio,

        fecha_inicio: fechaInicio,

        fecha_fin: fechaFin,

        // 🔥 ORGANIZACION
        region_id: user.region_id,

        region_nombre: user.region_nombre,

        delegacion_id: user.delegacion_id,

        delegacion_nombre: user.delegacion_nombre,

        // 🔥 USUARIO
        creado_por: user.uid,

        creado_por_nombre: `
              ${user.nombre || ""}
              ${user.apellido1 || ""}
            `,

        rol_creador: user.rol,

        // 🔥 CONTROL
        estado: "activa",

        creado: new Date(),

        actualizado: new Date(),
      });

      alert("Orden creada correctamente");

      // 🔥 LIMPIAR
      setConsecutivo("");

      setNombre("");

      setCodigo("");

      setFechaInicio("");

      setFechaFin("");
    } catch (error) {
      console.error(error);

      alert("Error creando orden");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 MENU
  const menuItems = [
    {
      label: "Volver Dashboard",

      onClick: () => navigate("/unidad_operativa"),
    },

    {
      label: "Lista Órdenes",

      onClick: () => navigate("/unidad_operativa/ordenes"),
    },
  ];

  return (
    <MainLayout title="Crear Orden" menuItems={menuItems}>
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
        }}
      >
        <h1>Crear Orden de Ejecución</h1>

        <p>Registro de órdenes operativas institucionales.</p>

        <hr />

        {/* 🔥 FORMULARIO */}
        <div
          style={{
            background: "white",

            padding: "20px",

            borderRadius: "10px",

            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}
        >
          {/* CONSECUTIVO */}
          <label>Consecutivo *</label>

          <input
            value={consecutivo}
            onChange={(e) => setConsecutivo(e.target.value)}
            placeholder="ORECPO N° 001-2026"
            style={inputStyle}
          />

          {/* NOMBRE */}
          <label>Nombre Orden *</label>

          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Operativo Regional"
            style={inputStyle}
          />

          {/* CODIGO */}
          <label>Código</label>

          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="DR10-D97-UO"
            style={inputStyle}
          />

          {/* FECHAS */}
          <div
            style={{
              display: "grid",

              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",

              gap: "15px",
            }}
          >
            <div>
              <label>Fecha Inicio *</label>

              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label>Fecha Fin *</label>

              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* BOTON */}
          <button
            onClick={handleCrear}
            disabled={loading}
            style={{
              marginTop: "20px",

              width: "100%",

              padding: "12px",

              border: "none",

              borderRadius: "8px",

              background: "#1e293b",

              color: "white",

              cursor: "pointer",

              fontSize: "16px",
            }}
          >
            {loading ? "Guardando..." : "Crear Orden"}
          </button>
        </div>
      </div>
    </MainLayout>
  );
}

// 🔥 INPUTS
const inputStyle = {
  width: "100%",

  padding: "10px",

  marginTop: "5px",

  marginBottom: "15px",

  borderRadius: "6px",

  border: "1px solid #ccc",

  boxSizing: "border-box",
};

export default CrearOrden;
