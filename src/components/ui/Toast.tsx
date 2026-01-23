import React, { useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastState = {
  type: ToastType;
  message: string;
} | null;

export type ToastProps = {
  toast: ToastState;
  onClose: () => void;
};

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  // auto-cerrar a los 4s (un poco más de tiempo para leer)
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onClose, 4000);
    return () => clearTimeout(id);
  }, [toast, onClose]);

  if (!toast) return null;

  let Icon = Info;
  // Estilos base por defecto
  let containerClass = "bg-white border-l-4 shadow-xl";
  let iconClass = "text-gray-500";
  let textClass = "text-gray-800";
  let buttonClass = "text-gray-400 hover:text-gray-600 hover:bg-gray-100";

  // Usamos colores de fondo sutiles pero notables (tint-50) y bordes fuertes
  switch (toast.type) {
    case "success":
      Icon = CheckCircle2;
      containerClass = "bg-emerald-50 border-l-4 border-emerald-500 shadow-xl ring-1 ring-emerald-900/5";
      iconClass = "text-emerald-600";
      textClass = "text-emerald-900";
      buttonClass = "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100";
      break;
    case "error":
      Icon = AlertTriangle;
      containerClass = "bg-rose-50 border-l-4 border-rose-500 shadow-xl ring-1 ring-rose-900/5";
      iconClass = "text-rose-600";
      textClass = "text-rose-900";
      buttonClass = "text-rose-500 hover:text-rose-700 hover:bg-rose-100";
      break;
    case "warning":
      Icon = AlertTriangle;
      containerClass = "bg-amber-50 border-l-4 border-amber-500 shadow-xl ring-1 ring-amber-900/5";
      iconClass = "text-amber-600";
      textClass = "text-amber-900";
      buttonClass = "text-amber-500 hover:text-amber-700 hover:bg-amber-100";
      break;
    case "info":
    default:
      Icon = Info;
      containerClass = "bg-blue-50 border-l-4 border-blue-500 shadow-xl ring-1 ring-blue-900/5";
      iconClass = "text-blue-600";
      textClass = "text-blue-900";
      buttonClass = "text-blue-500 hover:text-blue-700 hover:bg-blue-100";
      break;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-start justify-end px-4 py-6 sm:items-start sm:p-6">
      {/* Añadimos 'animate-in' por si se tiene tailwindcss-animate, o transiciones básicas */}
      <div className="flex w-full max-w-md transform flex-col items-end space-y-4 animate-in slide-in-from-top-4 fade-in duration-300">
        <div
          className={`pointer-events-auto flex w-full items-start gap-4 rounded-lg p-4 ${containerClass}`}
        >
          <Icon className={`h-6 w-6 shrink-0 mt-0.5 ${iconClass}`} />
          <div className="flex-1 pt-0.5">
            <p className={`text-sm font-bold ${textClass}`}>{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`-mt-1 -mr-1 rounded-md p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonClass}`}
          >
            <span className="sr-only">Cerrar</span>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
