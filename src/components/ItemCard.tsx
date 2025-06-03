import React from "react";

export interface Props {
  id: number;
  title: string;
  description: string;
  images: string[];
  longDescription: string;
}

export default function ItemCard({ id, title, description, images, longDescription }: Props) {
  const handleClick = () => {
    const event = new CustomEvent("openModal", {
      detail: { id, title, longDescription, images },
    });
    document.dispatchEvent(event);
  };

  return (
    <article
      onClick={handleClick}
      className="relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-200 cursor-pointer group"
      >
      <img src={images[0]} alt={title} className="w-full h-60 object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-walnut-deep via-transparent to-transparent p-6 flex flex-col justify-end transition-all">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-title text-white mb-1">{title}</h2>
            <p className="text-sm italic text-white">{description}</p>
          </div>
          <span className="text-terra-cotta font-semibold transform translate-x-10 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
            Ver más →
          </span>
        </div>
      </div>
    </article>
  );
}
