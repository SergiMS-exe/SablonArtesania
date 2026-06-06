import { useState, useEffect } from 'react';
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
                if (fullscreen) setFullscreen(false);
                else closeModal();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [producto, fullscreen]);

    if (!producto) return null;

    const { title, images, longDescription } = producto;

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModal}
        >
            {/* Modal */}
            <div
                className="relative w-full max-w-5xl max-h-[90vh] bg-cream rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Botón cerrar */}
                <button
                    onClick={closeModal}
                    className="absolute top-5 right-5 z-10 bg-surface-low hover:bg-surface-container p-2 rounded-xl transition-colors duration-200 shadow"
                    aria-label="Cerrar"
                >
                    <X className="w-5 h-5 text-walnut-deep" />
                </button>

                <div className="flex flex-col md:flex-row overflow-y-auto">
                    {/* Imágenes */}
                    <div className="md:w-1/2 p-7">
                        <div className="relative mb-3 group">
                            <div className="aspect-square bg-surface-low rounded-xl overflow-hidden">
                                <img
                                    src={images[currentIndex]}
                                    alt={`${title} - imagen ${currentIndex + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                <div
                                    onClick={() => setFullscreen(true)}
                                    className="absolute inset-0 bg-black/0 hover:bg-black/15 transition-colors duration-200 cursor-zoom-in flex items-center justify-center"
                                >
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-cream/90 rounded-xl p-2.5 shadow">
                                        <Maximize2 className="w-5 h-5 text-walnut-deep" />
                                    </div>
                                </div>
                            </div>

                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={prev}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-cream/90 hover:bg-cream p-2.5 rounded-xl shadow transition-colors duration-200"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-walnut-deep" />
                                    </button>
                                    <button
                                        onClick={next}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-cream/90 hover:bg-cream p-2.5 rounded-xl shadow transition-colors duration-200"
                                    >
                                        <ChevronRight className="w-5 h-5 text-walnut-deep" />
                                    </button>
                                </>
                            )}
                        </div>

                        {images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {images.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentIndex(i)}
                                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all duration-200 ${
                                            i === currentIndex
                                                ? 'ring-2 ring-leather'
                                                : 'ring-1 ring-dark-brown/20 opacity-60 hover:opacity-100'
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

                    {/* Información */}
                    <div className="md:w-1/2 p-7 flex flex-col">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-leather/10 text-leather px-3 py-1.5 rounded-full text-xs font-semibold w-fit mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
                                <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
                                <line x1="8.12" y1="8.12" x2="12" y2="12"/>
                            </svg>
                            PIEZA ARTESANAL
                        </div>

                        <h2 className="text-3xl font-bold text-walnut-deep mb-3 font-title">
                            {title}
                        </h2>

                        <div className="h-0.5 w-16 bg-leather/40 rounded-full mb-5" />

                        <div className="flex-1 overflow-y-auto mb-5">
                            <p className="text-dark-brown/80 leading-relaxed">
                                {longDescription}
                            </p>

                            <div className="mt-6 space-y-2.5">
                                {[
                                    'Fabricado íntegramente a mano',
                                    'Materiales naturales de primera calidad',
                                    'Personalizable bajo pedido',
                                    'Cada pieza es única e irrepetible',
                                ].map((feat) => (
                                    <div key={feat} className="flex items-start gap-2.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" className="text-leather flex-shrink-0 mt-0.5">
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                        <span className="text-sm text-dark-brown/70">{feat}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="bg-surface-low rounded-2xl p-5 border border-leather/15">
                            <p className="text-dark-brown/70 text-sm text-center mb-3">
                                ¿Te interesa esta pieza?
                            </p>
                            <a
                                href="/contacto"
                                className="block w-full bg-leather hover:bg-walnut-deep text-cream text-center py-3 rounded-full font-semibold transition-colors duration-200"
                            >
                                Consultar Disponibilidad
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fullscreen */}
            {fullscreen && (
                <div
                    className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60]"
                    onClick={() => setFullscreen(false)}
                >
                    <div className="relative w-full h-full flex items-center justify-center p-8">
                        <img
                            src={images[currentIndex]}
                            alt={`${title} fullscreen`}
                            className="max-w-full max-h-full object-contain rounded-xl"
                        />

                        <button
                            onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}
                            className="absolute top-6 right-6 bg-cream/90 hover:bg-cream p-2.5 rounded-xl transition-colors duration-200 shadow"
                        >
                            <X className="w-6 h-6 text-walnut-deep" />
                        </button>

                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={prev}
                                    className="absolute left-6 bg-cream/90 hover:bg-cream p-3 rounded-xl transition-colors duration-200 shadow"
                                >
                                    <ChevronLeft className="w-6 h-6 text-walnut-deep" />
                                </button>
                                <button
                                    onClick={next}
                                    className="absolute right-6 bg-cream/90 hover:bg-cream p-3 rounded-xl transition-colors duration-200 shadow"
                                >
                                    <ChevronRight className="w-6 h-6 text-walnut-deep" />
                                </button>
                            </>
                        )}

                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-cream/90 px-4 py-1.5 rounded-full shadow">
                            <span className="text-walnut-deep text-sm font-medium">
                                {currentIndex + 1} / {images.length}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
