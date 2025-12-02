// src/components/ui/Modal.tsx
import React from "react";

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  onClose,
  children,
  size = "md",
}) => {
  if (!open) return null;

  const maxWidth =
    size === "sm"
      ? "max-w-sm"
      : size === "lg"
      ? "max-w-3xl"
      : "max-w-lg";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div
        className={`w-full ${maxWidth} rounded-2xl bg-white p-5 shadow-2xl`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && (
            <h3 className="text-base font-semibold text-slate-900">
              {title}
            </h3>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
