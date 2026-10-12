import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../.dev.vars', import.meta.url));
if (existsSync(file)) {
  console.log('Back/.dev.vars ya existe; se conserva sin cambios.');
} else {
  writeFileSync(file, [
    `JWT_SECRET=${randomBytes(32).toString('hex')}`,
    `ADMIN_SECRET=${randomBytes(16).toString('hex')}`,
    '',
  ].join('\n'), { flag: 'wx' });
  console.log('Se creó Back/.dev.vars con secretos de prueba. Git lo ignora.');
}
