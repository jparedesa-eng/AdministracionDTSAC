// src/components/ui/Modal.tsx
import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
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
        : size === "xl"
          ? "max-w-5xl"
          : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4 transition-all duration-200">
      <div
        className={`w-full ${maxWidth} transform rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all`}
      >
        <div className="mb-5 flex items-center justify-between">
          {title && (
            <h3 className="text-lg font-semibold leading-6 text-gray-900">
              {title}
            </h3>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 transition-colors focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 text-sm text-gray-500">{children}</div>
      </div>
    </div>
  );
};
