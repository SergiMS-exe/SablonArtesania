interface TelegramMessage {
  text: string;
}

export async function sendTelegram(message: TelegramMessage): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const configuredChatIds = process.env.TELEGRAM_CHAT_IDS?.trim()
    || process.env.TELEGRAM_CHAT_ID?.trim()
    || '';
  const chatIds = [...new Set(configuredChatIds.split(',').map((id) => id.trim()).filter(Boolean))];
  if (!token || chatIds.length === 0) {
    console.warn('[telegram] TOKEN o CHAT_IDS no configurados, se omite el envío.');
    return false;
  }

  const results = await Promise.all(chatIds.map(async (chatId) => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message.text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
      if (!res.ok) {
        console.error(`[telegram] HTTP ${res.status} al enviar al chat ${chatId}:`, await res.text());
        return false;
      }
      return true;
    } catch (err) {
      console.error(`[telegram] error de red al enviar al chat ${chatId}:`, err);
      return false;
    }
  }));

  return results.every(Boolean);
}

export function formatContactInquiry(args: {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  type?: 'contact' | 'product';
}): string {
  const lines = [
    args.type === 'product' ? '📩 <b>Consulta por una pieza</b>' : '📩 <b>Nueva consulta</b>',
    '',
    `<b>Nombre:</b> ${escapeHtml(args.name)}`,
    `<b>Email:</b> ${escapeHtml(args.email)}`,
  ];
  if (args.phone) lines.push(`<b>Teléfono:</b> ${escapeHtml(args.phone)}`);
  lines.push('', `<b>Mensaje:</b>\n${escapeHtml(args.message)}`);
  return lines.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
