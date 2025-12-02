import React, { useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

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
  let bg = "bg-slate-900";
  let border = "border-slate-700";
  let text = "text-white";

  switch (toast.type) {
    case "success":
      Icon = CheckCircle2;
      bg = "bg-emerald-600";
      border = "border-emerald-500";
      break;
    case "error":
      Icon = AlertTriangle;
      bg = "bg-rose-600";
      border = "border-rose-500";
      break;
    case "info":
    default:
      Icon = Info;
      bg = "bg-slate-900";
      border = "border-slate-700";
      break;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-end px-4 py-6 sm:items-start">
      <div className="flex w-full max-w-sm transform flex-col items-end space-y-4">
        <div
          className={`pointer-events-auto flex w-full items-center gap-3 rounded-2xl border ${border} ${bg} px-4 py-3 shadow-lg`}
        >
          <Icon className={`h-5 w-5 ${text}`} />
          <p className={`flex-1 text-sm ${text}`}>{toast.message}</p>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 text-sm font-medium text-white/80 hover:text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
