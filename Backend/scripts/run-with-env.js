/**
 * Load an env file, then run a command.
 * Usage: node scripts/run-with-env.js .env.production -- npx prisma migrate deploy
 */
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const sep = args.indexOf('--');
if (sep <= 0) {
  console.error(
    'Usage: node scripts/run-with-env.js <env-file> -- <command> [args...]',
  );
  process.exit(1);
}

const envFile = args[0];
const command = args[sep + 1];
const commandArgs = args.slice(sep + 2);

if (!command) {
  console.error('Missing command after --');
  process.exit(1);
}

const resolved = path.resolve(process.cwd(), envFile);
if (!fs.existsSync(resolved)) {
  console.error(`Env file not found: ${resolved}`);
  console.error('Copy .env.example to .env.production and set production URLs.');
  process.exit(1);
}

dotenv.config({ path: resolved, override: true });

// Prefer DIRECT_URL for migrate (prisma.config.js already does this)
process.env.PRISMA_ENV_FILE = resolved;

const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 1));
