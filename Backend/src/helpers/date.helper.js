import { format } from 'date-fns';

export const formatDate = (date, fmt = 'dd/MM/yyyy') => {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return format(d, fmt);
};

export const toISO = (date) => new Date(date).toISOString();

// Month bucket for monthly KPI / performance rows.
// Uses the *local* calendar month but anchors it at UTC midnight, because the
// Postgres columns are DATE: a local-midnight JS Date (UTC+7) converts to
// 17:00 UTC of the previous day and gets truncated into the wrong month.
export const utcMonthStart = (date = new Date()) =>
    new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));

export const utcMonthEnd = (date = new Date()) =>
    new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999));