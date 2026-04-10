#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatLocalTimestamp(date) {
  return [
    date.getFullYear(),
    '-',
    pad2(date.getMonth() + 1),
    '-',
    pad2(date.getDate()),
    ' ',
    pad2(date.getHours()),
    ':',
    pad2(date.getMinutes()),
  ].join('');
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    noDeploy: false,
    message: '',
    deployCommand: process.env.DEPLOY_ALL_COMMAND || '../deploy_all.sh',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--no-deploy') {
      options.noDeploy = true;
      continue;
    }

    if (arg === '--message' || arg === '-m') {
      options.message = argv[index + 1] || '';
      index += 1;
      continue;
    }

    if (arg.startsWith('--message=')) {
      options.message = arg.slice('--message='.length);
      continue;
    }

    if (arg.startsWith('-m=')) {
      options.message = arg.slice(3);
      continue;
    }

    if (arg === '--deploy-command') {
      options.deployCommand = argv[index + 1] || options.deployCommand;
      index += 1;
      continue;
    }

    if (arg.startsWith('--deploy-command=')) {
      options.deployCommand = arg.slice('--deploy-command='.length);
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      console.log([
        'Usage: node scripts/release.mjs [options]',
        '',
        'Options:',
        '  --message, -m <text>     Commit message to use',
        '  --no-deploy              Skip deploy_all',
        '  --deploy-command <cmd>   Override the deploy command',
        '  --dry-run                Print the planned actions only',
        '',
        'Environment:',
        '  DEPLOY_ALL_COMMAND       Default deploy command (fallback: ../deploy_all.sh)',
      ].join('\n'));
      process.exit(0);
    }
  }

  return options;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    stdio: options.stdio || 'inherit',
    shell: Boolean(options.shell),
    env: options.env || process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const rendered = [command].concat(args || []).join(' ');
    throw new Error(`Command failed (${result.status}): ${rendered}`);
  }

  return result;
}

function runCapture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: Boolean(options.shell),
    env: options.env || process.env,
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = String(result.stderr || '').trim();
    const rendered = [command].concat(args || []).join(' ');
    throw new Error(`Command failed (${result.status}): ${rendered}${stderr ? `\n${stderr}` : ''}`);
  }

  return String(result.stdout || '');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = runCapture('git', ['rev-parse', '--show-toplevel']).trim();
  const commitMessage = options.message || `chore: release ${formatLocalTimestamp(new Date())}`;

  const stageArgs = [
    'add',
    '-A',
    '--',
    '.',
    ':(exclude)example/Nika-project/**',
    ':(exclude)example/Nika-project',
  ];

  console.log(`[release] repo: ${repoRoot}`);
  console.log('[release] staging changes (excluding example/Nika-project/)...');

  if (!options.dryRun) {
    run('git', stageArgs, { cwd: repoRoot });
  }

  const hasStagedChanges = options.dryRun
    ? true
    : runCapture('git', ['diff', '--cached', '--name-only']).trim().length > 0;

  if (hasStagedChanges) {
    console.log(`[release] commit message: ${commitMessage}`);
    if (!options.dryRun) {
      run('git', ['commit', '-m', commitMessage], { cwd: repoRoot });
    }
  } else if (!options.dryRun) {
    console.log('[release] no eligible git changes to commit; aborting release.');
    return;
  } else {
    console.log('[release] no eligible git changes to commit; skipping commit.');
  }

  if (!options.noDeploy) {
    console.log(`[release] running deploy command from parent repo: ${options.deployCommand}`);
    if (!options.dryRun) {
      const shell = process.env.SHELL || '/bin/zsh';
      const deployPipeline = `printf 'y\\n\\n' | ${options.deployCommand}`;
      run(shell, ['-ic', deployPipeline], { cwd: repoRoot });
    }
  } else {
    console.log('[release] deploy step skipped.');
  }

  console.log(options.dryRun ? '[release] dry-run complete.' : '[release] release pipeline complete.');
}

main();
