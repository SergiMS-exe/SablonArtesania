export interface MarketInput {
  location: string;
  startDate: string;
  endDate: string;
  schedule: string;
  instagramUrl: string | null;
  active: boolean;
  sortOrder: number;
}

export function parseMarketInput(
  body: Record<string, unknown>,
  current?: MarketInput,
): { value: MarketInput } | { error: string } {
  const location = typeof body.location === 'string'
    ? body.location.trim()
    : current?.location ?? '';
  const startDate = typeof body.startDate === 'string'
    ? body.startDate.trim()
    : current?.startDate ?? '';
  const endDate = typeof body.endDate === 'string'
    ? body.endDate.trim()
    : current?.endDate ?? startDate;
  const schedule = typeof body.schedule === 'string'
    ? body.schedule.trim()
    : current?.schedule ?? '11:00 — 15:00';
  const instagramUrl = typeof body.instagramUrl === 'string'
    ? body.instagramUrl.trim() || null
    : body.instagramUrl === null
      ? null
      : current?.instagramUrl ?? null;
  const active = typeof body.active === 'boolean' ? body.active : current?.active ?? true;
  const sortOrder = typeof body.sortOrder === 'number'
    ? Math.trunc(body.sortOrder)
    : current?.sortOrder ?? 0;

  if (!location) return { error: 'location_required' };
  if (location.length > 255) return { error: 'location_too_long' };
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return { error: 'invalid_date' };
  if (endDate < startDate) return { error: 'end_before_start' };
  if (!schedule) return { error: 'schedule_required' };
  if (schedule.length > 255) return { error: 'schedule_too_long' };
  if (instagramUrl && !isHttpUrl(instagramUrl)) return { error: 'invalid_instagram_url' };

  return {
    value: {
      location,
      startDate,
      endDate,
      schedule,
      instagramUrl,
      active,
      sortOrder,
    },
  };
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
