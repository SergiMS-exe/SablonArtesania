import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

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

    const openModal = (prod: Producto) => {
        setProducto(prod);
        setCurrentIndex(0);
        setFullscreen(false);
    };
    
    const closeModal = () => setProducto(null);

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

    useEffect(() => {
        const handler = (e: CustomEvent<Producto>) => openModal(e.detail);
        document.addEventListener('openModal', handler as EventListener);
        return () => document.removeEventListener('openModal', handler as EventListener);
    }, []);

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
            className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModal}
        >
            {/* Modal principal */}
            <div
                className="relative w-full max-w-5xl max-h-[90vh] bg-gradient-to-br from-amber-50 to-stone-100 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header decorativo */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700" />

                {/* Botón cerrar */}
                <button
                    onClick={closeModal}
                    className="absolute top-6 right-6 z-10 bg-white/90 hover:bg-white p-2.5 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl group"
                >
                    <X className="w-6 h-6 text-stone-700 group-hover:rotate-90 transition-transform duration-300" />
                </button>

                <div className="flex flex-col md:flex-row overflow-y-auto">
                    {/* Columna izquierda - Imágenes */}
                    <div className="md:w-1/2 p-8">
                        {/* Imagen principal */}
                        <div className="relative mb-4 group">
                            <div className="aspect-square bg-white rounded-2xl overflow-hidden shadow-xl">
                                <img
                                    src={images[currentIndex]}
                                    alt={`${title} - imagen ${currentIndex + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                
                                {/* Overlay para zoom */}
                                <div 
                                    onClick={() => setFullscreen(true)}
                                    className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-300 cursor-zoom-in flex items-center justify-center"
                                >
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                                        <Maximize2 className="w-6 h-6 text-stone-700" />
                                    </div>
                                </div>
                            </div>

                            {/* Flechas de navegación */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={prev}
                                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                                    >
                                        <ChevronLeft className="w-6 h-6 text-stone-700" />
                                    </button>
                                    <button
                                        onClick={next}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                                    >
                                        <ChevronRight className="w-6 h-6 text-stone-700" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Miniaturas */}
                        {images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {images.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentIndex(i)}
                                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all duration-300 ${
                                            i === currentIndex 
                                                ? 'ring-4 ring-amber-600 scale-105' 
                                                : 'ring-2 ring-stone-300 hover:ring-amber-400 opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        <img
                                            src={img}
                                            alt={`Miniatura ${i + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Columna derecha - Información */}
                    <div className="md:w-1/2 p-8 flex flex-col">
                        {/* Badge artesanal */}
                        <div className="inline-flex items-center gap-2 bg-amber-900/10 text-amber-900 px-4 py-2 rounded-full text-sm font-semibold w-fit mb-4">
                            <span>🔨</span>
                            <span>PIEZA ARTESANAL</span>
                        </div>

                        {/* Título */}
                        <h2 className="text-4xl font-bold text-stone-900 mb-4 font-serif">
                            {title}
                        </h2>

                        {/* Separador decorativo */}
                        <div className="h-1 w-24 bg-gradient-to-r from-amber-700 to-amber-500 rounded-full mb-6" />

                        {/* Descripción */}
                        <div className="flex-1 overflow-y-auto mb-6">
                            <p className="text-stone-700 text-lg leading-relaxed">
                                {longDescription}
                            </p>

                            {/* Características adicionales */}
                            <div className="mt-8 space-y-3">
                                <div className="flex items-start gap-3">
                                    <span className="text-amber-700 text-xl">✓</span>
                                    <span className="text-stone-600">Fabricado íntegramente a mano</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-amber-700 text-xl">✓</span>
                                    <span className="text-stone-600">Materiales naturales de primera calidad</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-amber-700 text-xl">✓</span>
                                    <span className="text-stone-600">Personalizable bajo pedido</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-amber-700 text-xl">✓</span>
                                    <span className="text-stone-600">Cada pieza es única e irrepetible</span>
                                </div>
                            </div>
                        </div>

                        {/* Call to action */}
                        <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-amber-200">
                            <p className="text-stone-700 text-center mb-4">
                                ¿Te interesa esta pieza?
                            </p>
                            <a
                                href="/contacto"
                                className="block w-full bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white text-center py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-md hover:shadow-xl"
                            >
                                Consultar Disponibilidad
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fullscreen Overlay */}
            {fullscreen && (
                <div
                    className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60]"
                    onClick={() => setFullscreen(false)}
                >
                    <div className="relative w-full h-full flex items-center justify-center p-8">
                        <img
                            src={images[currentIndex]}
                            alt={`${title} fullscreen`}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                        
                        {/* Botón cerrar fullscreen */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setFullscreen(false);
                            }}
                            className="absolute top-8 right-8 bg-white/90 hover:bg-white p-3 rounded-full transition-all duration-300 shadow-lg"
                        >
                            <X className="w-8 h-8 text-stone-700" />
                        </button>

                        {/* Navegación en fullscreen */}
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={prev}
                                    className="absolute left-8 bg-white/90 hover:bg-white p-4 rounded-full transition-all duration-300 shadow-lg"
                                >
                                    <ChevronLeft className="w-8 h-8 text-stone-700" />
                                </button>
                                <button
                                    onClick={next}
                                    className="absolute right-8 bg-white/90 hover:bg-white p-4 rounded-full transition-all duration-300 shadow-lg"
                                >
                                    <ChevronRight className="w-8 h-8 text-stone-700" />
                                </button>
                            </>
                        )}

                        {/* Contador de imágenes */}
                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                            <span className="text-stone-700 font-medium">
                                {currentIndex + 1} / {images.length}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}