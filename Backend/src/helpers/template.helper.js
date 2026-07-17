import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';

// Register helpers (optional)
Handlebars.registerHelper('formatDate', (date) => {
    // use date-fns or custom
    return date ? new Date(date).toLocaleDateString('en-GB') : '—';
});

export const compileTemplate = async (templatePath, data) => {
    const source = await fs.readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(source);
    return template(data);
};