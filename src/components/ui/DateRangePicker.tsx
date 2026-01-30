
import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface DateRangePickerProps {
    onChange: (range: { start: Date | null; end: Date | null }) => void;
    initialStart?: Date | null;
    initialEnd?: Date | null;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    onChange,
    initialStart = null,
    initialEnd = null,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [start, setStart] = useState<Date | null>(initialStart);
    const [end, setEnd] = useState<Date | null>(initialEnd);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Draft states for the picker (before applying)
    const [tempStart, setTempStart] = useState<Date | null>(initialStart);
    const [tempEnd, setTempEnd] = useState<Date | null>(initialEnd);

    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Calendar Logic
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const isSameDay = (d1: Date | null, d2: Date | null) => {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const handleDayClick = (day: number) => {
        const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

        if (!tempStart || (tempStart && tempEnd)) {
            // New selection or restarting
            setTempStart(clickedDate);
            setTempEnd(null);
        } else {
            // Completing the range
            if (clickedDate < tempStart) {
                setTempStart(clickedDate);
                setTempEnd(tempStart);
            } else {
                setTempEnd(clickedDate);
            }
        }
    };

    const handleApply = () => {
        setStart(tempStart);
        setEnd(tempEnd);
        onChange({ start: tempStart, end: tempEnd });
        setIsOpen(false);
    };

    const handleClear = () => {
        setTempStart(null);
        setTempEnd(null);
        setStart(null);
        setEnd(null);
        onChange({ start: null, end: null });
    };

    const formatDate = (date: Date | null) => {
        if (!date) return "";
        return date.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "2-digit" }); // dd/mm/yy
    };

    // Render Calendar Days
    const renderDays = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);
        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
        }

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
            let isSelected = false;
            let isInRange = false;
            let isStart = false;
            let isEnd = false;

            if (tempStart && isSameDay(date, tempStart)) {
                isSelected = true;
                isStart = true;
            }
            if (tempEnd && isSameDay(date, tempEnd)) {
                isSelected = true;
                isEnd = true;
            }
            if (tempStart && tempEnd && date > tempStart && date < tempEnd) {
                isInRange = true;
            }

            days.push(
                <button
                    key={i}
                    onClick={() => handleDayClick(i)}
                    className={`
                        h-8 w-8 text-sm flex items-center justify-center rounded-full transition-colors relative
                        ${isSelected ? 'bg-[#D32F2F] text-white font-bold z-10' : ''}
                        ${!isSelected && isInRange ? 'bg-red-50 text-red-900 rounded-none' : ''}
                        ${!isSelected && !isInRange ? 'hover:bg-gray-100 text-gray-700' : ''}
                        ${isStart && tempEnd ? 'rounded-r-none' : ''}
                        ${isEnd && tempStart ? 'rounded-l-none' : ''}
                    `}
                >
                    {i}
                </button>
            );
        }
        return days;
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-4 py-2 bg-white border rounded-full transition-all
                    ${isOpen ? 'border-[#D32F2F] ring-1 ring-[#D32F2F]' : 'border-gray-300 hover:border-gray-400'}
                `}
            >
                <CalendarIcon className={`w-4 h-4 ${isOpen || start ? 'text-[#D32F2F]' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${start ? 'text-gray-900' : 'text-gray-500'}`}>
                    {start && end ? `${formatDate(start)} - ${formatDate(end)}` : (start ? formatDate(start) : "Seleccionar Fechas")}
                </span>
                {/* Arrow indicator */}
                <div className={`ml-1 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] transition-transform ${isOpen ? 'rotate-180 border-t-[#D32F2F]' : 'border-t-gray-500'}`} />
            </button>

            {/* Popover */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl border border-gray-200 z-50 flex flex-col md:flex-row overflow-hidden min-w-[320px] md:min-w-[500px]">
                    {/* Left Panel (Controls + Info) */}
                    <div className="bg-gray-50 p-4 border-r border-gray-100 flex flex-col justify-between w-full md:w-48">
                        <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3">Rango</span>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] uppercase text-[#D32F2F] font-bold block mb-1">Desde</label>
                                    <div className="bg-white border border-red-100 rounded-lg px-3 py-2 text-sm text-gray-700 font-medium">
                                        {tempStart ? formatDate(tempStart) : "--/--/--"}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-[#D32F2F] font-bold block mb-1">Hasta</label>
                                    <div className="bg-white border border-red-100 rounded-lg px-3 py-2 text-sm text-gray-700 font-medium">
                                        {tempEnd ? formatDate(tempEnd) : "--/--/--"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-4">
                            <button
                                onClick={handleApply}
                                disabled={!tempStart || !tempEnd}
                                className="w-full py-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-bold rounded-full shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Aplicar
                            </button>
                            <button
                                onClick={handleClear}
                                className="w-full py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-full transition-colors"
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>

                    {/* Right Panel (Calendar) */}
                    <div className="p-4 flex-1">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="font-bold text-gray-800">
                                {currentMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).replace(/^\w/, c => c.toUpperCase())}
                            </div>
                            <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {["D", "L", "M", "M", "J", "V", "S"].map(d => (
                                <div key={d} className="h-8 w-8 flex items-center justify-center text-xs font-bold text-gray-400">
                                    {d}
                                </div>
                            ))}
                            {renderDays()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
