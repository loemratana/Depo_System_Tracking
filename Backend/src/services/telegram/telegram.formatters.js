// src/services/telegram/telegram.formatters.js
export function formatProgressBar(value, total, width = 10) {
    if (total === 0) return '─'.repeat(width);
    const filled = Math.round((value / total) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }