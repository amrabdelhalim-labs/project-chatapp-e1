#!/usr/bin/env node
/**
 * docker-delivery.mjs
 *
 * Single entry-point for Docker image delivery:
 * - Build images (server/web/mobile)
 * - Validate infra wiring (config-as-test)
 * - Scan images with Trivy (via Trivy Docker image)
 * - (Optional) Publish images to GHCR on "publish" mode
 *
 * Usage examples:
 *   node docker-delivery.mjs --targets server,web --mode build-only
 *   node docker-delivery.mjs --targets mobile --mode build-only
 *   node docker-delivery.mjs --targets server,web --mode publish --gh-owner amrgm --ghcr-token $GITHUB_TOKEN --version v1.0.0
 */

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const DEFAULT_TRIVY_IMAGE = 'aquasec/trivy:0.69.3';
const DEFAULT_IGNORE_FILE = path.join(ROOT, 'trivy/trivyignore.yaml');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function run(cmd, cmdArgs, opts = {}) {
  const res = spawnSync(cmd, cmdArgs, {
    stdio: 'inherit',
    shell: false,
    env: opts.env ?? process.env,
    cwd: opts.cwd ?? ROOT,
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const msg = `Command failed: ${cmd} ${cmdArgs.join(' ')}`;
    throw new Error(msg);
  }
}

function gitSha() {
  try {
    return execSync('git rev-parse --short=12 HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'local';
  }
}

const args = parseArgs(process.argv);

const targetsRaw = args.targets || args.target || 'server,web';
const targets = targetsRaw
  .split(',')
  .map((t) => t.trim().toLowerCase())
  .filter(Boolean);

const mode = (args.mode || 'build-only').toLowerCase(); // build-only | publish
const sha = args.sha || process.env.DOCKER_SHA || process.env.GITHUB_SHA?.slice(0, 12) || gitSha();

// Web/mobile images bake deps + source only; REACT_APP_API_URL / PUBLIC_URL / API_URL are read at container start.

// Trivy
const ignoreFile = args['trivy-ignore-file'] ? path.resolve(ROOT, args['trivy-ignore-file']) : DEFAULT_IGNORE_FILE;
const trivyIgnoreRel = path.relative(ROOT, ignoreFile).replace(/\\/g, '/');
const trivySeverities =
  args['trivy-severities'] ||
  process.env.TRIVY_SEVERITIES ||
  // Keep build-only informative, but make publish gate stricter and practical.
  (mode === 'publish' ? 'CRITICAL' : 'CRITICAL,HIGH,MEDIUM');
// Trivy v0.69 uses --pkg-types (older docs used --vuln-type).
// Keep backward compatibility with TRIVY_VULN_TYPE / --trivy-vuln-type inputs.
const trivyPkgTypes = args['trivy-pkg-types'] || args['trivy-vuln-type'] || process.env.TRIVY_PKG_TYPES || process.env.TRIVY_VULN_TYPE || 'os,library';
const trivyFormat = args['trivy-format'] || process.env.TRIVY_FORMAT || 'table';
const trivyExitCode = Number(
  args['trivy-exit-code'] ||
    process.env.TRIVY_EXIT_CODE ||
    // In build-only mode, scan should report findings without failing the pipeline.
    // Publish mode remains a gating step by default.
    (mode === 'publish' ? 1 : 0)
);
const trivyImage = args['trivy-image'] || process.env.TRIVY_IMAGE || DEFAULT_TRIVY_IMAGE;

// Runtime defaults baked at image build time (used if runtime env vars are omitted).
const webDefaultApiUrl = args['web-api-url'] || process.env.WEB_API_URL || 'http://localhost:5000';
const webDefaultPublicUrl = args['public-url'] || process.env.PUBLIC_URL || '/';
const mobileDefaultApiUrl = args['mobile-api-url'] || process.env.MOBILE_API_URL || 'http://localhost:5000';

const skipValidate = args['skip-validate'] === true || args['skip-validate'] === 'true';
const skipTrivy = args['skip-trivy'] === true || args['skip-trivy'] === 'true';

const ghOwner = args['gh-owner'] || process.env.GH_OWNER || process.env.GITHUB_REPOSITORY_OWNER;
const ghActor = args['gh-actor'] || process.env.GH_ACTOR || process.env.GITHUB_ACTOR;
const ghcrToken = args['ghcr-token'] || process.env.GHCR_TOKEN || process.env.GITHUB_TOKEN;
const version =
  args.version ||
  (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF?.startsWith('refs/tags/v') ? process.env.GITHUB_REF_NAME : undefined) ||
  (process.env.GITHUB_RUN_NUMBER ? `manual-${process.env.GITHUB_RUN_NUMBER}` : `sha-${sha}`);

function assertFileExists(p, label) {
  if (!fs.existsSync(p)) throw new Error(`${label} missing: ${p}`);
}

function localImageRef(target) {
  if (target === 'server') return `chatapp-server:${sha}`;
  if (target === 'web') return `chatapp-web:${sha}`;
  if (target === 'mobile') return `chatapp-mobile:${sha}`;
  throw new Error(`Unknown target: ${target}`);
}

function localLatestRef(target) {
  if (target === 'server') return `chatapp-server:latest`;
  if (target === 'web') return `chatapp-web:latest`;
  if (target === 'mobile') return `chatapp-mobile:latest`;
  throw new Error(`Unknown target: ${target}`);
}

function ghcrRepoRef(target) {
  if (!ghOwner) throw new Error('GHCR owner missing: provide --gh-owner or set GH_OWNER/GITHUB_REPOSITORY_OWNER');
  if (target === 'server') return `ghcr.io/${ghOwner}/project-chatapp-e1-server`;
  if (target === 'web') return `ghcr.io/${ghOwner}/project-chatapp-e1-web`;
  if (target === 'mobile') return `ghcr.io/${ghOwner}/project-chatapp-e1-mobile`;
  throw new Error(`Unknown target: ${target}`);
}

function build(target) {
  if (target === 'server') {
    run('docker', ['build', '-t', localImageRef(target), '-f', path.join(ROOT, 'server/Dockerfile'), path.join(ROOT, 'server')]);
    run('docker', ['tag', localImageRef(target), localLatestRef(target)]);
    return;
  }

  if (target === 'web') {
    // CRA bundle is built at container start from REACT_APP_* / PUBLIC_URL (see web/docker-entrypoint.sh).
    run('docker', [
      'build',
      '-t',
      localImageRef(target),
      '-f',
      path.join(ROOT, 'web/Dockerfile'),
      '--build-arg',
      `DEFAULT_REACT_APP_API_URL=${webDefaultApiUrl}`,
      '--build-arg',
      `DEFAULT_PUBLIC_URL=${webDefaultPublicUrl}`,
      path.join(ROOT, 'web'),
    ]);
    run('docker', ['tag', localImageRef(target), localLatestRef(target)]);
    return;
  }

  if (target === 'mobile') {
    // Expo web export runs at container start from API_URL (see app/docker-entrypoint.sh).
    run('docker', [
      'build',
      '-t',
      localImageRef(target),
      '-f',
      path.join(ROOT, 'app/Dockerfile'),
      '--build-arg',
      `DEFAULT_API_URL=${mobileDefaultApiUrl}`,
      path.join(ROOT, 'app'),
    ]);
    run('docker', ['tag', localImageRef(target), localLatestRef(target)]);
    return;
  }

  throw new Error(`Unknown build target: ${target}`);
}

function scan(target) {
  if (skipTrivy) return;
  assertFileExists(ignoreFile, 'Trivy ignore file');
  // Run Trivy as a container to avoid host installation.
  run('docker', [
    'run',
    '--rm',
    '-v',
    '/var/run/docker.sock:/var/run/docker.sock',
    '-v',
    `${ROOT}:/repo`,
    '-w',
    '/repo',
    trivyImage,
    'image',
    '--format',
    trivyFormat,
    '--exit-code',
    String(trivyExitCode),
    '--ignore-unfixed',
    '--pkg-types',
    trivyPkgTypes,
    '--severity',
    trivySeverities,
    '--ignorefile',
    trivyIgnoreRel,
    localImageRef(target),
  ]);
}

function validate(targetsToValidate) {
  // Validate infra wiring (config-as-test).
  // Keep this separate so workflows can decide what to validate.
  if (targetsToValidate.includes('server') || targetsToValidate.includes('web')) {
    run('node', [path.join(ROOT, 'scripts/docker/check-docker-config.mjs')], { cwd: ROOT });
  }
  if (targetsToValidate.includes('mobile')) {
    run('node', [path.join(ROOT, 'scripts/docker/check-docker-mobile-config.mjs')], { cwd: ROOT });
  }
}

function publishOnce() {
  if (mode !== 'publish') return;
  if (!ghcrToken) throw new Error('GHCR token missing: provide --ghcr-token or set GHCR_TOKEN/GITHUB_TOKEN');
  if (!ghActor) throw new Error('GHCR actor missing: provide --gh-actor or set GH_ACTOR/GITHUB_ACTOR');

  // docker login needs stdin password; handle it with execSync for simplicity.
  execSync(`echo "${ghcrToken}" | docker login ghcr.io -u "${ghActor}" --password-stdin`, { stdio: 'inherit', cwd: ROOT });
}

function publishTarget(target) {
  const repo = ghcrRepoRef(target);
  const local = localImageRef(target);
  const tagV = version;
  const tagSha = `sha-${sha}`;
  run('docker', ['tag', local, `${repo}:${tagV}`]);
  run('docker', ['tag', local, `${repo}:${tagSha}`]);
  run('docker', ['push', `${repo}:${tagV}`]);
  run('docker', ['push', `${repo}:${tagSha}`]);
}

// ── Main ──────────────────────────────────────────────────────────────────
console.log(`\nDocker delivery: targets=[${targets.join(', ')}] mode=${mode} sha=${sha} version=${version}`);

if (!skipValidate) {
  console.log('\n[validate] config-as-test');
  validate(targets);
} else {
  console.log('\n[validate] skipped');
}

console.log('\n[build]');
for (const t of targets) build(t);

console.log('\n[scan]');
for (const t of targets) scan(t);

if (mode === 'publish') {
  console.log('\n[publish] GHCR');
  publishOnce();
  for (const t of targets) publishTarget(t);
}

// Best-effort cleanup in publish mode (optional).
if (mode === 'publish' && (args.cleanup === true || args.cleanup === 'true' || args.cleanup === undefined)) {
  if (!args['no-cleanup']) {
    try {
      execSync('docker system prune -af', { stdio: 'ignore', cwd: ROOT });
    } catch {
      // ignore
    }
  }
}

console.log('\n[OK] Docker delivery completed.\n');

