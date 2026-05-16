// frontend/src/shared/components/ErrorBoundary.jsx
import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Error en módulo:", error, errorInfo);
    // 🔹 Futuro: integrar con Firebase Analytics, Sentry o sistema de auditoría
  }

  handleReset = () => {
    // 🔹 Mejor que reload: fuerza navegación limpia y evita chunks corruptos en caché
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-xl font-bold text-red-700">
            Error al cargar el módulo
          </h2>
          <p className="mb-4 text-gray-600">
            No se pudo cargar correctamente la vista solicitada.
          </p>
          <button
            onClick={this.handleReset}
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition"
          >
            Volver al inicio
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
