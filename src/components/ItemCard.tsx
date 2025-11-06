import React from 'react';
import { Eye } from 'lucide-react';

export interface Props {
  id: number;
  title: string;
  description: string;
  images: string[];
  longDescription: string;
}

export default function ItemCard({ id, title, description, images, longDescription }: Props) {
  const handleViewDetails = () => {
    const event = new CustomEvent("openModal", {
      detail: { id, title, longDescription, images },
    });
    document.dispatchEvent(event);
  };

  return (
    <article
      onClick={handleViewDetails}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer"
    >
      {/* Imagen Container */}
      <div className="relative h-80 overflow-hidden bg-gradient-to-br from-amber-50 to-stone-100">
        <img
          src={images[0]}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Badge de "Artesanal" */}
        <div className="absolute top-4 left-4 bg-amber-900/90 backdrop-blur-sm text-amber-50 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-lg">
          🔨 HECHO A MANO
        </div>
        
        {/* Botón de ver */}
        <div className="absolute top-4 right-4">
          <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md text-stone-700 flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg">
            <Eye size={18} />
          </div>
        </div>

        {/* Indicador de múltiples imágenes */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1.5">
            {images.slice(0, 4).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-white/60 backdrop-blur-sm shadow-sm"
              />
            ))}
            {images.length > 4 && (
              <span className="text-white/80 text-xs ml-1 font-medium">+{images.length - 4}</span>
            )}
          </div>
        )}

        {/* Texto "Ver detalles" en hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="bg-white/95 backdrop-blur-sm px-6 py-3 rounded-full shadow-2xl">
            <span className="text-amber-900 font-bold flex items-center gap-2">
              Ver Detalles
              <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
            </span>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        {/* Categoría/Tag */}
        <p className="text-amber-700 text-sm font-medium mb-2 tracking-wide">
          ARTESANÍA EN CUERO
        </p>
        
        {/* Título */}
        <h3 className="text-2xl font-bold text-stone-900 mb-2 group-hover:text-amber-900 transition-colors duration-300">
          {title}
        </h3>
        
        {/* Descripción */}
        <p className="text-stone-600 text-sm leading-relaxed mb-4 line-clamp-2">
          {description}
        </p>

        {/* Características */}
        <div className="flex items-center gap-4 text-xs text-stone-500 mb-4">
          <div className="flex items-center gap-1">
            <span className="font-semibold">✓</span>
            <span>100% Natural</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">✓</span>
            <span>Duradero</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">✓</span>
            <span>Único</span>
          </div>
        </div>

        {/* Separador decorativo */}
        <div className="h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent mb-4" />

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-stone-500 mb-1">Pieza artesanal única</p>
          <p className="text-lg font-bold text-amber-900">
            Consultar disponibilidad
          </p>
        </div>
      </div>

      {/* Efecto de brillo al hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
    </article>
  );
}