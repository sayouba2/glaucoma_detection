import React, { useState, useRef, useEffect } from 'react';
import { ChevronsLeftRight } from 'lucide-react';

const BeforeAfterSlider = ({ beforeImage, afterImage, width = "100%", height = "100%" }) => {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef(null);

    const handleMove = (clientX) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = (x / rect.width) * 100;
        setSliderPosition(percentage);
    };

    const onMouseDown = () => setIsDragging(true);
    const onMouseUp = () => setIsDragging(false);
    const onMouseMove = (e) => {
        if (isDragging) handleMove(e.clientX);
    };

    const onTouchMove = (e) => {
        handleMove(e.touches[0].clientX);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('mousemove', onMouseMove);
        } else {
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('mousemove', onMouseMove);
        }
        return () => {
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('mousemove', onMouseMove);
        };
    }, [isDragging]);

    return (
        <div
            ref={containerRef}
            className="relative overflow-hidden select-none cursor-ew-resize rounded-xl shadow-lg border border-slate-200 bg-slate-100"
            style={{ width, height, minHeight: '300px' }}
            onMouseMove={(e) => !isDragging && handleMove(e.clientX)} // Optional: Move on hover too? Maybe better just drag. Sticking to drag logic above.
            onTouchMove={onTouchMove}
        >
            {/* Background Image (Before/Original) */}
            <div className="absolute inset-0">
                <img
                    src={beforeImage}
                    alt="Original"
                    className="w-full h-full object-contain pointer-events-none"
                />
                <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs backdrop-blur font-bold">Original</div>
            </div>

            {/* Foreground Image (After/Heatmap) - Clipped */}
            <div
                className="absolute inset-0"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
                <img
                    src={afterImage}
                    alt="Heatmap"
                    className="w-full h-full object-contain pointer-events-none"
                />
                <div className="absolute top-4 right-4 bg-red-600/80 text-white px-2 py-1 rounded text-xs backdrop-blur font-bold">AI Heatmap</div>
            </div>

            {/* Slider Handle */}
            <div
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 shadow-xl"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={onMouseDown}
                onTouchStart={onMouseDown}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg border border-slate-200 text-blue-600">
                    <ChevronsLeftRight size={20} />
                </div>
            </div>
        </div>
    );
};

export default BeforeAfterSlider;
