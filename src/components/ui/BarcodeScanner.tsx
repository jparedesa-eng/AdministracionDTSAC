import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
    title?: string;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose, title = "Escanear Código" }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Initialize scanner
        const scannerId = "html5qr-code-full-region";

        try {
            const scanner = new Html5QrcodeScanner(
                scannerId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    showTorchButtonIfSupported: true,
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.CODE_39,
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.UPC_A,
                        Html5QrcodeSupportedFormats.QR_CODE
                    ]
                },
                /* verbose= */ false
            );

            scanner.render(
                (decodedText) => {
                    onScan(decodedText);
                    // Opcional: Cerrar automáticamente al escanear
                    // scanner.clear();
                    // onClose();
                },
                (_) => {
                    // Ignorar errores de escaneo fallido por frame, es normal
                    // console.log(errorMessage);
                }
            );

            scannerRef.current = scanner;
        } catch (err: any) {
            setError("Error al iniciar la cámara: " + err.message);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5-qrcode scanner. ", error);
                });
            }
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                    <h3 className="font-semibold text-gray-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto bg-black text-white flex flex-col justify-center">
                    <div id="html5qr-code-full-region" className="w-full"></div>
                    {error && (
                        <div className="text-red-400 text-center text-sm mt-4 p-2 bg-red-900/20 rounded">
                            {error}
                        </div>
                    )}
                    <p className="text-center text-xs text-gray-400 mt-4">
                        Apunta la cámara al código de barras o QR del equipo.
                    </p>
                </div>
            </div>
        </div>
    );
};
