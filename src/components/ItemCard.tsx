import { ArrowRight } from 'lucide-react';

export interface Props {
  id: number;
  slug: string;
  name: string;
  shortDescription: string;
  artisan: { slug: string; name: string };
  category: { slug: string; name: string };
  priceCents: number | null;
  currency: string;
  images: string[];
}

export default function ItemCard({
  slug,
  name,
  shortDescription,
  artisan,
  category,
  priceCents,
  currency,
  images,
}: Props) {
  const isCollaborator = artisan.slug !== 'sablon';

  return (
    <a
      href={`/productos/${slug}`}
      className="group relative bg-cream rounded-2xl overflow-hidden shadow hover:shadow-md transition-shadow duration-200"
    >
      <div className="relative h-80 overflow-hidden bg-surface-low">
        <img
          src={images[0]}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-walnut-deep/0 group-hover:bg-walnut-deep/20 transition-colors duration-300" />
        <div className="absolute top-4 left-4 bg-leather/90 text-cream px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase">
          {category.name}
        </div>
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

      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-terra-cotta text-xs font-semibold tracking-wider uppercase">
            {category.name}
          </p>
          {isCollaborator && (
            <span className="text-moss-green text-xs font-semibold">· {artisan.name}</span>
          )}
        </div>

        <h3 className="text-xl font-title font-bold text-walnut-deep mb-2 group-hover:text-leather transition-colors duration-200">
          {name}
        </h3>

        <p className="text-dark-brown/60 text-sm leading-relaxed mb-3 line-clamp-2">
          {shortDescription}
        </p>

        {priceCents != null && (
          <p className="text-leather font-bold mb-3">
            {(priceCents / 100).toFixed(2)} {currency}
          </p>
        )}

        <div className="h-px bg-leather/15 mb-4" />

        <p className="text-sm font-semibold text-leather text-center flex items-center justify-center gap-2">
          Ver pieza <ArrowRight size={14} />
        </p>
      </div>
    </a>
  );
}
