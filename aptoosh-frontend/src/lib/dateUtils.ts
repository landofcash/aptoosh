import {format} from 'date-fns';

export function formatUtcDate(timestamp: number | null): string {
  if (!timestamp) return '–';
  const date = new Date(timestamp * 1000);
  return format(date, "yyyy-MM-dd HH:mm:ss");
}

export function formatUtcDateNoTime(timestamp: number | null): string {
  if (!timestamp) return '–';
  const date = new Date(timestamp * 1000);
  return format(date, "yyyy-MM-dd");
}
