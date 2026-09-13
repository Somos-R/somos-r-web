#!/usr/bin/env node
const { execSync } = require('child_process');

let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const cmd = data?.tool_input?.command || '';
  if (!/\bgit\s+(commit|push)\b/.test(cmd)) process.exit(0);

  let branch = '';
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    process.exit(0);
  }

  if (branch === 'main') {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason:
            "Bloqueado: estás en 'main'. Cambia a una rama (feature/fix/chore) antes de git commit/push — ver CLAUDE.md.",
        },
      })
    );
  }
});
