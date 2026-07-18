'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const VALID_TEMPLATES = new Set(['nextjs', 'nextjs-pages', 'express']);
const VALID_PACKAGE_MANAGERS = new Set(['npm', 'pnpm', 'yarn']);

function usage() {
  return [
    'Usage: create-kdna-web-app <project-name> [options]',
    '',
    'Options:',
    '  --template <nextjs|nextjs-pages|express>',
    '  --package-manager <npm|pnpm|yarn>',
    '  --no-install',
    '  --help',
  ].join('\n');
}

function parseArgs(args) {
  const options = {
    projectName: null,
    template: 'nextjs',
    packageManager: null,
    install: true,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--template') {
      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        const error = new Error('--template requires a value.');
        error.exitCode = 1;
        throw error;
      }
      options.template = value;
      index += 1;
    } else if (arg.startsWith('--template=')) {
      options.template = arg.slice('--template='.length);
    } else if (arg === '--package-manager') {
      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        const error = new Error('--package-manager requires a value.');
        error.exitCode = 1;
        throw error;
      }
      options.packageManager = value;
      index += 1;
    } else if (arg.startsWith('--package-manager=')) {
      options.packageManager = arg.slice('--package-manager='.length);
    } else if (arg === '--no-install') {
      options.install = false;
    } else if (arg.startsWith('-')) {
      const error = new Error(`Unknown option: ${arg}\n\n${usage()}`);
      error.exitCode = 1;
      throw error;
    } else if (!options.projectName) {
      options.projectName = arg;
    } else {
      const error = new Error(`Unknown argument: ${arg}\n\n${usage()}`);
      error.exitCode = 1;
      throw error;
    }
  }

  return options;
}

function validateOptions(options) {
  if (options.help) return;
  if (!options.projectName) {
    const error = new Error(`Project name is required.\n\n${usage()}`);
    error.exitCode = 1;
    throw error;
  }
  const packageName = path.basename(path.resolve(options.projectName));
  if (!/^[a-z0-9][a-z0-9._-]{0,213}$/u.test(packageName)) {
    const error = new Error(
      'Project directory name must be a lowercase npm package name (letters, numbers, dots, hyphens, or underscores).',
    );
    error.exitCode = 1;
    throw error;
  }
  if (!VALID_TEMPLATES.has(options.template)) {
    const error = new Error(`Unknown template: ${options.template}`);
    error.exitCode = 1;
    throw error;
  }
  if (options.packageManager && !VALID_PACKAGE_MANAGERS.has(options.packageManager)) {
    const error = new Error(`Unknown package manager: ${options.packageManager}`);
    error.exitCode = 1;
    throw error;
  }
}

function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent || '';
  if (userAgent.startsWith('pnpm')) return 'pnpm';
  if (userAgent.startsWith('yarn')) return 'yarn';
  return 'npm';
}

function packageInstallCommand(packageManager) {
  if (packageManager === 'pnpm') return ['pnpm', ['install']];
  if (packageManager === 'yarn') return ['yarn', []];
  return ['npm', ['install']];
}

function templateRoot(template) {
  return path.join(__dirname, '..', 'templates', template);
}

function copyTemplate(srcDir, destDir, variables) {
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const name = entry.name === '_gitignore' ? '.gitignore' : entry.name;
    const dest = path.join(destDir, name);

    if (entry.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      copyTemplate(src, dest, variables);
    } else {
      let content = fs.readFileSync(src, 'utf8');
      for (const [key, value] of Object.entries(variables)) {
        content = content.replaceAll(`{{${key}}}`, value);
      }
      fs.writeFileSync(dest, content);
    }
  }
}

function assertSafeProjectDir(projectDir) {
  if (fs.existsSync(projectDir) && fs.readdirSync(projectDir).length > 0) {
    const error = new Error(`Target directory is not empty: ${projectDir}`);
    error.exitCode = 1;
    throw error;
  }
}

function scaffold(options) {
  validateOptions(options);
  if (options.help) {
    return { help: usage() };
  }

  const packageManager = options.packageManager || detectPackageManager();
  const projectDir = path.resolve(options.projectName);
  const projectName = path.basename(projectDir);
  assertSafeProjectDir(projectDir);
  fs.mkdirSync(projectDir, { recursive: true });

  copyTemplate(templateRoot(options.template), projectDir, {
    projectName,
    packageManager,
  });

  if (options.install) {
    const [command, args] = packageInstallCommand(packageManager);
    const result = spawnSync(command, args, { cwd: projectDir, stdio: 'inherit' });
    if (result.status !== 0) {
      const error = new Error(`${command} ${args.join(' ')} failed.`);
      error.exitCode = result.status || 1;
      throw error;
    }
  }

  return { projectDir, projectName, template: options.template, packageManager, installed: options.install };
}

async function main(args) {
  const options = parseArgs(args);
  const result = scaffold(options);
  if (result.help) {
    console.log(result.help);
    return result;
  }
  console.log(`Created ${result.projectName} with the ${result.template} template.`);
  if (!result.installed) {
    console.log(`Skipped install. Run: cd ${path.relative(process.cwd(), result.projectDir)} && ${result.packageManager} install`);
  }
  return result;
}

module.exports = {
  VALID_TEMPLATES,
  parseArgs,
  scaffold,
  main,
};
