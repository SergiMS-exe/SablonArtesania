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

export default function ItemCard({ id, artisan, artisanName, category, categoryLabel, title, description, images, longDescription }: Props) {
  const isCollaborator = artisan !== 'sablon';
  const materialLabel = category.charAt(0).toUpperCase() + category.slice(1);
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

        {/* Badge material */}
        <div className="absolute top-4 left-4 bg-leather/90 text-cream px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase">
          {materialLabel}
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
