import { Shield } from "lucide-react";

export function LoadingScreen({ text = "Cargando..." }: { text?: string }) {
    return (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-white/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6">
                <div className="relative flex h-20 w-20 items-center justify-center">
                    {/* Ring animation */}
                    <div className="absolute h-full w-full animate-spin rounded-full border-4 border-gray-100 border-t-red-600"></div>

                    {/* Protected Shield Icon */}
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 shadow-sm">
                        <Shield className="h-6 w-6 fill-red-600/10" />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2 text-center px-6">
                    <h3 className="text-lg font-medium tracking-tight text-gray-950">{text}</h3>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Administración Danper</p>
                </div>
            </div>
        </div>
    );
}
