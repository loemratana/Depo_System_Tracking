import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const clientDir = resolve("dist/client");
const shell = resolve(clientDir, "_shell.html");
const index = resolve(clientDir, "index.html");

if (!existsSync(shell)) {
  console.error(
    "[prepare-spa] Missing dist/client/_shell.html — ensure tanstackStart.spa.enabled is true.",
  );
  process.exit(1);
}

copyFileSync(shell, index);
console.log("[prepare-spa] Copied _shell.html → index.html for static hosting");
