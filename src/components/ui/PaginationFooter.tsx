
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationFooterProps {
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    setItemsPerPage: (items: number) => void;
    setCurrentPage: (page: number | ((prev: number) => number)) => void;
    totalItems: number;
}

export const PaginationFooter: React.FC<PaginationFooterProps> = ({
    currentPage,
    totalPages,
    itemsPerPage,
    setItemsPerPage,
    setCurrentPage,
    totalItems
}) => {
    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
                <span className="font-medium text-gray-500 uppercase text-xs">Filas:</span>
                <select
                    className="h-8 border border-gray-200 rounded-lg px-2 text-xs bg-gray-50 focus:bg-white transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-blue-100"
                    value={itemsPerPage}
                    onChange={e => setItemsPerPage(Number(e.target.value))}
                >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={9999}>Todos</option>
                </select>
                <span className="text-gray-400 text-xs ml-2">
                    Total: {totalItems} registros
                </span>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 mr-2">
                    {currentPage} / {totalPages}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setCurrentPage((prev: number) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setCurrentPage((prev: number) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
