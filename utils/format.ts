export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function daysUntil(iso: string): number {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export function relativeDayLabel(iso: string): string {
  if (isToday(iso)) return 'Vandaag';
  const days = daysUntil(iso);
  if (days === -1) return 'Gisteren';
  if (days === 1) return 'Morgen';
  return formatDate(iso);
}

export function timeAgoLabel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'zojuist';
  if (minutes < 60) return `${minutes} min geleden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'gisteren';
  if (days < 7) return `${days} dagen geleden`;
  return formatDate(iso);
}
