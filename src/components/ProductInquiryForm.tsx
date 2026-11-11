import { useState } from 'react';

interface Props {
  productName: string;
}

export default function ProductInquiryForm({ productName }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus({ kind: 'err', text: 'Rellena nombre, email y mensaje.' });
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/public/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          message: `Consulta sobre ${productName}:\n${message.trim()}`,
          type: 'product',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      setStatus({ kind: 'ok', text: '¡Mensaje enviado! Te contactaremos pronto.' });
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (err: unknown) {
      setStatus({ kind: 'err', text: err instanceof Error ? err.message : 'Error al enviar.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-dark-brown/70">
        ¿Te interesa <strong>{productName}</strong>? Escríbenos y te contamos disponibilidad y opciones.
      </p>
      <div>
        <label className="block text-sm font-semibold text-walnut-deep mb-1">Nombre *</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-wood-light bg-surface-low text-sm focus:border-leather focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-walnut-deep mb-1">Email *</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-wood-light bg-surface-low text-sm focus:border-leather focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-walnut-deep mb-1">Teléfono</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-wood-light bg-surface-low text-sm focus:border-leather focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-walnut-deep mb-1">Mensaje *</label>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-wood-light bg-surface-low text-sm focus:border-leather focus:outline-none resize-none"
          placeholder="Cuéntanos qué te gustaría saber..."
        />
      </div>
      <button
        type="submit"
        disabled={sending}
        className="w-full bg-leather hover:bg-walnut-deep text-cream py-3 rounded-full font-semibold transition-colors disabled:opacity-60"
      >
        {sending ? 'Enviando…' : 'Consultar por esta pieza'}
      </button>
      {status && (
        <p
          className={`text-sm text-center font-semibold ${status.kind === 'ok' ? 'text-green-700' : 'text-red-700'}`}
        >
          {status.text}
        </p>
      )}
    </form>
  );
}
