// src/services/telegram/telegram.keyboards.js

/**
 * Main menu with report options.
 */
export const mainMenu = () => ({
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 Daily Report', callback_data: 'daily_menu' },
          { text: '📈 Weekly Report', callback_data: 'weekly_menu' },
        ],
        [
          { text: '📋 Monthly KPI', callback_data: 'monthly_menu' },
          { text: '🚨 Stock Alert', callback_data: 'stock_menu' },
        ],
        [
          { text: '👤 Employee KPI', callback_data: 'kpi_prompt' },
          { text: 'ℹ️ Help', callback_data: 'help' },
        ],
      ],
    },
  });
  
  /**
   * Options for a specific report (text or Excel).
   */
  export const reportOptions = (reportType) => ({
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📄 Text Summary', callback_data: `${reportType}_text` },
          { text: '📊 Excel File', callback_data: `${reportType}_excel` },
        ],
        [{ text: '🔙 Back to Menu', callback_data: 'menu' }],
      ],
    },
  });
  
  /**
   * Prompt for employee ID (with cancel).
   */
  export const employeePrompt = () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: '❌ Cancel', callback_data: 'menu' }],
      ],
    },
  });
  
  /**
   * Simple "Back to menu" button.
   */
  export const backToMenu = () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Back to Menu', callback_data: 'menu' }],
      ],
    },
  });