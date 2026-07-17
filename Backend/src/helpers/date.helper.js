import { format } from 'date-fns';

export const formatDate = (date, fmt = 'dd/MM/yyyy') => {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return format(d, fmt);
};

export const toISO = (date) => new Date(date).toISOString();