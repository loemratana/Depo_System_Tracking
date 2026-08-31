// src/services/telegram/telegram.formatters.js

/** Escape text inserted into Telegram parse_mode: 'HTML' messages */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatProgressBar(value, total, width = 10) {
    if (total === 0) return '─'.repeat(width);
    const filled = Math.round((value / total) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }