import { Eye } from 'lucide-react';

export interface Props {
  id: number;
  artisan: string;
  artisanName: string;
  category: string;
  categoryLabel: string;
  title: string;
  description: string;
  images: string[];
  longDescription: string;
}

export default function ItemCard({ id, artisan, artisanName, categoryLabel, title, description, images, longDescription }: Props) {
  const isCollaborator = artisan !== 'sablon';
  const handleViewDetails = () => {
    const event = new CustomEvent("openModal", {
      detail: { id, title, longDescription, images },
    });
    document.dispatchEvent(event);
  };

  return (
    <article
      onClick={handleViewDetails}
      className="group relative bg-cream rounded-2xl overflow-hidden shadow hover:shadow-md transition-shadow duration-200 cursor-pointer"
    >
      {/* Imagen */}
      <div className="relative h-80 overflow-hidden bg-surface-low">
        <img
          src={images[0]}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Overlay sutil en hover */}
        <div className="absolute inset-0 bg-walnut-deep/0 group-hover:bg-walnut-deep/20 transition-colors duration-300" />

        {/* Badge */}
        <div className="absolute top-4 left-4 bg-leather/90 text-cream px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
            <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
            <line x1="8.12" y1="8.12" x2="12" y2="12"/>
          </svg>
          HECHO A MANO
        </div>

        {/* Botón ver */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-9 h-9 rounded-full bg-cream/95 text-leather flex items-center justify-center shadow">
            <Eye size={16} />
          </div>
        </div>

        {/* Indicador múltiples imágenes */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.slice(0, 4).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-cream/70" />
            ))}
            {images.length > 4 && (
              <span className="text-cream/70 text-xs ml-1">+{images.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-terra-cotta text-xs font-semibold tracking-wider uppercase">
            {categoryLabel}
          </p>
          {isCollaborator && (
            <span className="text-moss-green text-xs font-semibold">· {artisanName}</span>
          )}
        </div>

        <h3 className="text-xl font-title font-bold text-walnut-deep mb-2 group-hover:text-leather transition-colors duration-200">
          {title}
        </h3>

        <p className="text-dark-brown/60 text-sm leading-relaxed mb-4 line-clamp-2">
          {description}
        </p>

        <div className="flex items-center gap-4 text-xs text-dark-brown/50 mb-4">
          <span>100% Natural</span>
          <span className="w-px h-3 bg-dark-brown/20" />
          <span>Duradero</span>
          <span className="w-px h-3 bg-dark-brown/20" />
          <span>Único</span>
        </div>

        <div className="h-px bg-leather/15 mb-4" />

        <p className="text-sm font-semibold text-leather text-center">
          Consultar disponibilidad
        </p>
      </div>
    </article>
  );
}
