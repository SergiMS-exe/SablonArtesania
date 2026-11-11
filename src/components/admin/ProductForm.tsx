import { useState, useRef } from 'react';

interface Artisan {
  id: number;
  name: string;
}
interface Category {
  id: number;
  name: string;
}
interface ProductImage {
  id?: number;
  url: string;
  sortOrder: number;
  deleted?: boolean;
}
interface InitialProduct {
  id?: number;
  name: string;
  shortDescription: string;
  longDescription: string;
  priceCents: number | null;
  currency: string;
  status: 'disponible' | 'vendido' | 'oculto';
  active: boolean;
  deleted: boolean;
  artisanId: number;
  categoryId: number;
  sortOrder: number;
  images: ProductImage[];
}

interface Props {
  artisans: Artisan[];
  categories: Category[];
  initial?: InitialProduct;
}

export default function ProductForm({ artisans, categories, initial }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? '');
  const [longDescription, setLongDescription] = useState(initial?.longDescription ?? '');
  const [priceEuros, setPriceEuros] = useState(
    initial?.priceCents != null ? (initial.priceCents / 100).toFixed(2) : '',
  );
  const [currency, setCurrency] = useState(initial?.currency ?? 'EUR');
  const [status, setStatus] = useState(initial?.status ?? 'disponible');
  const [active, setActive] = useState(initial?.active ?? true);
  const [artisanId, setArtisanId] = useState(initial?.artisanId ?? artisans[0]?.id ?? 0);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? 0);
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);

  const [images, setImages] = useState<ProductImage[]>(initial?.images ?? []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const isEdit = !!initial?.id;

  async function save() {
    setMessage(null);
    if (!name.trim() || !shortDescription.trim() || !artisanId || !categoryId) {
      setMessage({ kind: 'err', text: 'Rellena nombre, descripción corta, artesano y categoría.' });
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      shortDescription,
      longDescription,
      priceCents:
        priceEuros.trim() === '' ? null : Math.round(parseFloat(priceEuros.replace(',', '.')) * 100),
      currency,
      status,
      active,
      artisanId,
      categoryId,
      sortOrder,
    };
    try {
      const url = isEdit ? `/api/admin/products/${initial!.id}` : '/api/admin/products';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!isEdit && data?.id) {
        window.location.href = `/admin/productos/${data.id}`;
      } else {
        setMessage({ kind: 'ok', text: 'Guardado.' });
      }
    } catch (err: unknown) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Error al guardar.' });
    } finally {
      setSaving(false);
    }
  }

  async function uploadImages(files: FileList | null) {
    if (!files || files.length === 0 || !initial?.id) return;
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append('images', f);
      const res = await fetch(`/api/admin/products/${initial.id}/images`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? err.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      const created: ProductImage[] = data.images;
      setImages((prev) => [...prev, ...created]);
      setMessage({ kind: 'ok', text: `${created.length} imagen(es) subida(s).` });
      if (fileInput.current) fileInput.current.value = '';
    } catch (err: unknown) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Error al subir.' });
    } finally {
      setUploading(false);
    }
  }

  async function deleteImage(img: ProductImage) {
    if (!img.id) return;
    if (!confirm('¿Eliminar esta imagen?')) return;
    const res = await fetch(`/api/admin/product-images/${img.id}`, { method: 'DELETE' });
    if (res.ok) {
      setImages((prev) => prev.map((image) => image.id === img.id ? { ...image, deleted: true } : image));
    } else {
      alert('No se pudo eliminar');
    }
  }

  async function restoreImage(img: ProductImage) {
    if (!img.id) return;
    const res = await fetch(`/api/admin/product-images/${img.id}`, { method: 'PATCH' });
    if (res.ok) {
      setImages((prev) => prev.map((image) => image.id === img.id ? { ...image, deleted: false } : image));
    } else {
      alert('No se pudo restaurar la imagen');
    }
  }

  async function moveImage(idx: number, dir: -1 | 1) {
    const newImages = [...images];
    const target = idx + dir;
    if (target < 0 || target >= newImages.length) return;
    if (newImages[idx].deleted || newImages[target].deleted) return;
    [newImages[idx], newImages[target]] = [newImages[target], newImages[idx]];
    setImages(newImages);
    if (isEdit && newImages[idx].id && newImages[target].id) {
      await fetch(`/api/admin/product-images/${newImages[idx].id}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: target }),
      });
      await fetch(`/api/admin/product-images/${newImages[target].id}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: idx }),
      });
    }
  }

  async function markSold() {
    if (!initial?.id) return;
    if (!confirm('¿Marcar esta pieza como vendida? Dejará de verse en el escaparate.')) return;
    const res = await fetch(`/api/admin/products/${initial.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'vendido' }),
    });
    if (res.ok) setStatus('vendido');
  }

  async function deleteProduct() {
    if (!initial?.id) return;
    if (!confirm('¿Eliminar esta pieza del escaparate? Se podrá restaurar después.')) return;
    const res = await fetch(`/api/admin/products/${initial.id}`, { method: 'DELETE' });
    if (res.ok) window.location.href = '/admin/productos';
  }

  async function restoreProduct() {
    if (!initial?.id) return;
    const res = await fetch(`/api/admin/products/${initial.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deletedAt: null, active: true }),
    });
    if (res.ok) window.location.reload();
    else setMessage({ kind: 'err', text: 'No se pudo restaurar la pieza.' });
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-3 rounded-xl text-sm font-semibold ${message.kind === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-cream p-6 rounded-2xl shadow space-y-4">
        <div>
          <label className="block text-sm font-semibold text-walnut-deep mb-1">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-wood-light bg-surface-low text-sm focus:border-leather focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-walnut-deep mb-1">Descripción corta</label>
          <input
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-wood-light bg-surface-low text-sm focus:border-leather focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-walnut-deep mb-1">Descripción larga</label>
          <textarea
            value={longDescription}
            onChange={(e) => setLongDescription(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 rounded-xl border border-wood-light bg-surface-low text-sm focus:border-leather focus:outline-none"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-walnut-deep mb-1">Artesano</label>
            <select
              value={artisanId}
              onChange={(e) => setArtisanId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-wood-light bg-surface-low text-sm focus:border-leather focus:outline-none"
            >
              {artisans.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-walnut-deep mb-1">Categoría</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-wood-light bg-surface-low text-sm focus:border-leather focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-walnut-deep mb-1">Precio orientativo (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={priceEuros}
              onChange={(e) => setPriceEuros(e.target.value)}
              placeholder="Sin precio"
              className="w-full px-3 py-2 rounded-xl border border-wood-light bg-surface-low text-sm focus:border-leather focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-walnut-deep mb-1">Moneda</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-wood-light bg-surface-low text-sm focus:border-leather focus:outline-none"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-walnut-deep mb-1">Orden</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-wood-light bg-surface-low text-sm focus:border-leather focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-walnut-deep mb-1">Estado</label>
          <div className="flex gap-2">
            {(['disponible', 'vendido', 'oculto'] as const).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${status === s ? 'bg-leather text-cream' : 'bg-surface-low text-dark-brown/70 hover:bg-surface-container'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-walnut-deep">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-leather" />
          Activa en el escaparate
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-leather hover:bg-walnut-deep text-cream px-6 py-2.5 rounded-full font-semibold transition-colors disabled:opacity-60"
          >
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear pieza'}
          </button>
          <a href="/admin/productos" className="bg-surface-low text-walnut-deep px-6 py-2.5 rounded-full font-semibold">
            Volver
          </a>
          {isEdit && !initial?.deleted && (
            <button
              type="button"
              onClick={markSold}
              className="bg-red-100 hover:bg-red-200 text-red-800 px-6 py-2.5 rounded-full font-semibold"
            >
              Marcar vendido
            </button>
          )}
          {isEdit && !initial?.deleted && (
            <button
              type="button"
              onClick={deleteProduct}
              className="bg-red-700 hover:bg-red-800 text-cream px-6 py-2.5 rounded-full font-semibold"
            >
              Eliminar pieza
            </button>
          )}
          {isEdit && initial?.deleted && (
            <button type="button" onClick={restoreProduct} className="bg-green-800 hover:bg-green-900 text-cream px-6 py-2.5 rounded-full font-semibold">
              Restaurar pieza
            </button>
          )}
        </div>
      </div>

      {isEdit && (
        <div className="bg-cream p-6 rounded-2xl shadow">
          <h2 className="text-lg font-title font-bold text-walnut-deep mb-3">Imágenes</h2>
          <p className="text-xs text-dark-brown/60 mb-4">
            Formatos: JPG, PNG, WEBP, GIF, AVIF. Máx 5 MB por imagen.
          </p>

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => uploadImages(e.target.files)}
            disabled={uploading}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-leather file:text-cream file:font-semibold hover:file:bg-walnut-deep mb-4"
          />
          {uploading && <p className="text-xs text-dark-brown/60">Subiendo…</p>}

          {images.length === 0 ? (
            <p className="text-sm text-dark-brown/60">Aún no hay imágenes.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div key={img.id ?? img.url} className={`relative group ${img.deleted ? 'opacity-50' : ''}`}>
                  <img
                    src={img.url}
                    alt=""
                    className="aspect-square w-full object-cover rounded-xl border border-wood-light"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                    {!img.deleted && <button type="button" onClick={() => moveImage(idx, -1)} disabled={idx === 0} className="bg-cream text-walnut-deep text-xs px-2 py-1 rounded-full disabled:opacity-40">←</button>}
                    {img.deleted ? (
                      <button type="button" onClick={() => restoreImage(img)} className="bg-green-800 text-cream text-xs px-2 py-1 rounded-full">Restaurar</button>
                    ) : (
                      <button type="button" onClick={() => deleteImage(img)} className="bg-red-700 text-cream text-xs px-2 py-1 rounded-full">Eliminar</button>
                    )}
                    {!img.deleted && <button type="button" onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1} className="bg-cream text-walnut-deep text-xs px-2 py-1 rounded-full disabled:opacity-40">→</button>}
                  </div>
                  {img.deleted && <span className="absolute top-2 left-2 bg-red-700 text-cream text-[10px] font-semibold px-2 py-0.5 rounded-full">Eliminada</span>}
                  {idx === 0 && !img.deleted && (
                    <span className="absolute top-2 left-2 bg-leather text-cream text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      Principal
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
