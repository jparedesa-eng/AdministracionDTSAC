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
        className={`w-full ${maxWidth} transform rounded-2xl bg-white text-left align-middle shadow-xl transition-all relative`}
      >
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-lg font-semibold leading-6 text-gray-900">
            {title || <span>&nbsp;</span>}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-sm text-gray-500">{children}</div>
        </div>
      </div>
    </div>
  );
};
