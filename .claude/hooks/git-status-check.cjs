#!/usr/bin/env node
const { execSync } = require('child_process');

try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (status) {
    console.log(
      JSON.stringify({
        systemMessage:
          'Quedan cambios sin commitear en el working tree. Recuerda "commitear a medida que se avanza" (ver CLAUDE.md) — no lo dejes para después.',
      })
    );
  }
} catch {
  // no es un repo git o git no disponible
}
