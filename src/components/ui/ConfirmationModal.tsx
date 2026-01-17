import React from "react";
import { Modal } from "./Modal";

interface ConfirmationModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    open,
    onClose,
    onConfirm,
    title,
    children,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "danger",
    loading = false,
}) => {
    const getConfirmButtonClass = () => {
        switch (variant) {
            case "danger":
                return "bg-red-600 hover:bg-red-700 focus:ring-red-500";
            case "warning":
                return "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500";
            case "info":
                return "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500";
            default:
                return "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500";
        }
    };

    return (
        <Modal open={open} onClose={onClose} title={title} size="sm">
            <div className="space-y-4">
                <div className="text-gray-700">
                    {children}
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`inline-flex justify-center rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${getConfirmButtonClass()}`}
                    >
                        {loading ? "Procesando..." : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
