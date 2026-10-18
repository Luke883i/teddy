// Render-only runtime preflight: mounted disk is NOT available at build time.
import fs from 'node:fs';
import {resolveRenderEnvironment} from '../server/lib/render-deployment-v35.mjs';
const resolved=resolveRenderEnvironment(process.env);
try {
 const disk=fs.statSync('/var/data');
 if(!disk.isDirectory())throw Error('not_directory');
 fs.accessSync('/var/data',fs.constants.W_OK);
 const probe=fs.mkdtempSync('/var/data/.teddy-write-check-');
 fs.rmdirSync(probe);
} catch {
 throw Object.assign(new Error('TEDDY_RENDER_DISK_NOT_WRITABLE'),{code:'TEDDY_RENDER_DISK_NOT_WRITABLE'});
}
Object.assign(process.env,resolved);
// Keep the original SIGTERM lifecycle, model installer and SQLite persistence.
await import('../server/main.mjs');
