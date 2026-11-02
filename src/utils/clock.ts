// Clock helpers for event handlers. Timestamps are created when an action happens, not during render.

export function nowIso(): string {
  return new Date().toISOString();
}

export function nowMs(): number {
  return Date.now();
}

export function isoDateOffset(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
}
