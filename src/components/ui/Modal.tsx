// src/components/ui/Modal.tsx
import React from "react";

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
        className={`w-full ${maxWidth} transform rounded-2xl bg-white text-left align-middle shadow-xl transition-all`}
      >
        {title && (
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 rounded-t-2xl">
            <h3 className="text-lg font-semibold leading-6 text-gray-900">
              {title}
            </h3>
          </div>
        )}
        <div className="p-6">
          <div className="text-sm text-gray-500">{children}</div>
        </div>
      </div>
    </div>
  );
};
