import React, { useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

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
  // auto-cerrar a los ~3.5s
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onClose, 3500);
    return () => clearTimeout(id);
  }, [toast, onClose]);

  if (!toast) return null;

  let Icon = Info;
  // Estilos base "surface" (fondo blanco, borde sutil)
  let containerClass = "bg-white border ring-1 shadow-lg";
  let iconClass = "text-gray-500";
  let textClass = "text-gray-700";

  switch (toast.type) {
    case "success":
      Icon = CheckCircle2;
      containerClass = "bg-white border-emerald-100 ring-emerald-500/10";
      iconClass = "text-emerald-500 effect-shine"; // Opción de efecto
      textClass = "text-gray-800";
      break;
    case "error":
      Icon = AlertTriangle;
      containerClass = "bg-white border-rose-100 ring-rose-500/10";
      iconClass = "text-rose-500";
      textClass = "text-gray-800";
      break;
    case "warning":
      Icon = AlertTriangle;
      containerClass = "bg-white border-amber-100 ring-amber-500/10";
      iconClass = "text-amber-500";
      textClass = "text-gray-800";
      break;
    case "info":
    default:
      Icon = Info;
      containerClass = "bg-white border-gray-100 ring-gray-900/5";
      iconClass = "text-gray-500";
      textClass = "text-gray-800";
      break;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-start justify-end px-4 py-6 sm:items-start">
      <div className="flex w-full max-w-sm transform flex-col items-end space-y-4">
        <div
          className={`pointer-events-auto flex w-full items-center gap-3 rounded-xl px-4 py-3 ${containerClass}`}
        >
          <Icon className={`h-5 w-5 ${iconClass}`} />
          <p className={`flex-1 text-sm font-medium ${textClass}`}>{toast.message}</p>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 rounded-md p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <span className="sr-only">Cerrar</span>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
