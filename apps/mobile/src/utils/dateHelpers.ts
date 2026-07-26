/** Date helpers for the Agenda module. Dates travel as 'YYYY-MM-DD' strings. */

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Parses 'YYYY-MM-DD' as a local date (avoids the UTC shift of new Date(str)) */
export const parseDate = (str: string) => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const formatDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/** Monday of the week the given date belongs to */
export const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const weekday = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - weekday);
  return d;
};

export const addDays = (str: string, days: number) => {
  const d = parseDate(str);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

export const addMonths = (str: string, months: number) => {
  const d = parseDate(str);
  const targetMonth = d.getMonth() + months;
  const target = new Date(d.getFullYear(), targetMonth, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  return formatDate(target);
};

export const monthName = (date: Date) => MONTHS[date.getMonth()];

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Human label of the period being navigated, per view mode */
export const periodLabel = (dateStr: string, view: 'day' | 'week' | 'month') => {
  const date = parseDate(dateStr);
  if (view === 'month') return capitalize(`${monthName(date)} ${date.getFullYear()}`);
  if (view === 'day') return `${date.getDate()} de ${monthName(date)} ${date.getFullYear()}`;

  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} - ${end.getDate()} de ${monthName(start)}`;
  }
  return `${start.getDate()} ${monthName(start).slice(0, 3)} - ${end.getDate()} ${monthName(end).slice(0, 3)}`;
};

/** True when dateStr falls inside the Monday-Sunday week of refStr */
export const isSameWeek = (dateStr: string, refStr: string) => {
  const start = startOfWeek(parseDate(refStr));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const d = parseDate(dateStr);
  return d >= start && d <= end;
};
