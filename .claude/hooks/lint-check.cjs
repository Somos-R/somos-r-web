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

  const filePath = data?.tool_input?.file_path || '';
  if (!/\.(ts|tsx)$/.test(filePath)) process.exit(0);

  try {
    execSync(`pnpm exec eslint ${JSON.stringify(filePath)}`, { encoding: 'utf8', stdio: 'pipe' });
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    console.log(
      JSON.stringify({
        decision: 'block',
        reason: `ESLint encontró problemas en ${filePath}:\n${output}`,
      })
    );
  }
});
