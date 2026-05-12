import { useState } from "react";

function MainLayout({ title, children, menuItems = [] }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f5f5f5",
      }}
    >
      {/* 🔥 HEADER */}
      <header
        style={{
          height: "60px",
          background: "#1e293b",
          color: "white",

          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",

          padding: "0 15px",

          position: "sticky",
          top: 0,
          zIndex: 1000,
        }}
      >
        {/* MENU MOBILE */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: "transparent",

            color: "white",

            border: "none",

            fontSize: "22px",

            cursor: "pointer",
          }}
        >
          ☰
        </button>

        {/* TITULO */}
        <h2
          style={{
            margin: 0,
            fontSize: "18px",
          }}
        >
          {title}
        </h2>

        {/* ESPACIO */}
        <div
          style={{
            width: "24px",
          }}
        />
      </header>

      {/* 🔥 CONTENIDO */}
      <div
        style={{
          display: "flex",
          flex: 1,
        }}
      >
        {/* 🔥 SIDEBAR */}
        <aside
          style={{
            width: menuOpen ? "240px" : "0px",

            background: "#0f172a",

            color: "white",

            overflow: "hidden",

            transition: "0.3s ease",

            minHeight: "calc(100vh - 60px)",

            position: "fixed",

            top: "60px",
            left: 0,
            bottom: 0,

            zIndex: 999,
          }}
        >
          <div
            style={{
              padding: "15px",
            }}
          >
            <h3>Menú</h3>

            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                style={{
                  width: "100%",

                  marginBottom: "10px",

                  padding: "10px",

                  border: "none",

                  background: "#1e293b",

                  color: "white",

                  cursor: "pointer",

                  textAlign: "left",

                  borderRadius: "6px",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        {/* 🔥 OVERLAY MOBILE */}
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: "fixed",

              inset: 0,

              background: "rgba(0,0,0,0.4)",

              zIndex: 500,
            }}
          />
        )}

        {/* 🔥 CONTENT */}
        <main
          style={{
            flex: 1,

            padding: "20px",

            width: "100%",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
