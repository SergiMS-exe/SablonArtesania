import React, { useState, useEffect } from 'react';

interface Producto {
    id: number;
    title: string;
    images: string[];
    longDescription: string;
}

export default function ModalCarousel() {
    const [producto, setProducto] = useState<Producto | null>(null);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [fullscreen, setFullscreen] = useState<boolean>(false);

    // Abre modal
    const openModal = (prod: Producto) => {
        setProducto(prod);
        setCurrentIndex(0);
        setFullscreen(false);
    };
    const closeModal = () => setProducto(null);

    // Navegación
    const prev = (e?: React.MouseEvent<HTMLButtonElement>) => {
        e?.stopPropagation();
        if (!producto) return;
        setCurrentIndex((i) => (i - 1 + producto.images.length) % producto.images.length);
    };
    const next = (e?: React.MouseEvent<HTMLButtonElement>) => {
        e?.stopPropagation();
        if (!producto) return;
        setCurrentIndex((i) => (i + 1) % producto.images.length);
    };

    // Escucha evento custom desde ItemCard
    useEffect(() => {
        const handler = (e: CustomEvent<Producto>) => openModal(e.detail);
        document.addEventListener('openModal', handler as EventListener);
        return () => document.removeEventListener('openModal', handler as EventListener);
    }, []);

    // Keyboard nav
    useEffect(() => {
        const onKey = (ev: KeyboardEvent) => {
            if (!producto) return;
            if (ev.key === 'ArrowRight') next();
            if (ev.key === 'ArrowLeft') prev();
            if (ev.key === 'Escape') {
                if (fullscreen) {
                    setFullscreen(false);
                } else {
                    closeModal();
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [producto, fullscreen]);

    if (!producto) return null;

    const { title, images, longDescription } = producto;

    return (
        <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={closeModal}
        >
            {/* Modal principal */}
            <div
                className="
                    absolute inset-x-0 top-20 bottom-0
                    mx-auto w-full max-w-screen-xl
                    bg-white rounded-t-2xl shadow-lg
                    flex flex-col overflow-y-auto
                    custom-scrollbar
                "
                onClick={(e) => e.stopPropagation()}
            >

                {/* Cerrar */}
                <button
                    onClick={closeModal}
                    className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 p-3 rounded-full z-4"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Imagen principal */}
                <div className="relative">
                    <img
                        src={images[currentIndex]}
                        alt={`${title} zoom`}
                        className="w-full max-h-[50vh] object-contain mb-4 cursor-zoom-in"
                        onClick={() => setFullscreen(true)}
                    />
                    {/* Flecha izquierda */}
                    <button
                        onClick={prev}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 p-3 rounded-full"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Flecha derecha */}
                    <button
                        onClick={next}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 p-3 rounded-full"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                {/* Dots */}
                <div className="flex justify-center space-x-2 mt-2 mb-2">
                    {images.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentIndex(i)}
                            className={`w-3 h-3 rounded-full focus:outline-none transition-colors duration-200 ${i === currentIndex ? 'bg-black' : 'bg-gray-400'
                                }`}
                        />
                    ))}
                </div>
                {/* Info */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
                    <h2 className="font-bold text-2xl mb-2 text-center">{title}</h2>
                    <p className="text-gray-700 text-center">{longDescription}</p>
                </div>
            </div>

            {/* Fullscreen Overlay */}
            {fullscreen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-60"
                    onClick={() => setFullscreen(false)}
                >
                    <div
                        className="relative w-full h-full flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={images[currentIndex]}
                            alt={`${title} fullscreen`}
                            className="max-w-full max-h-full object-contain"
                        />
                        {/* Cerrar */}
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 p-3 rounded-full"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Flecha izquierda */}
                        <button
                            onClick={prev}
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 p-3 rounded-full"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        {/* Flecha derecha */}
                        <button
                            onClick={next}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 p-3 rounded-full"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                    </div>
                </div>
            )}
        </div>
    );
}
