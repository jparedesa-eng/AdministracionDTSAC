// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import "./index.css";

/* Bloquea scroll horizontal global desde JS (útil si usas Tailwind) */
document.documentElement.classList.add("overflow-x-hidden", "max-w-full");
document.body.classList.add("overflow-x-hidden", "max-w-full");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* blindaje extra por si algún wrapper desborda */}
        <div className="w-full overflow-x-hidden">
          <App />
        </div>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
