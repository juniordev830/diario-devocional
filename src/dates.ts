export function dateKey(date = new Date()): string {
  const part = (n: number) => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + part(date.getMonth() + 1) + '-' + part(date.getDate());
}

export function addDays(day: string, offset: number): string {
  const date = new Date(day + 'T12:00:00');
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}

export function monthDays(month: string): string[] {
  const [year, number] = month.split('-').map(Number);
  const count = new Date(year, number, 0).getDate();
  return Array.from({ length: count }, (_, index) => month + '-' + String(index + 1).padStart(2, '0'));
}
