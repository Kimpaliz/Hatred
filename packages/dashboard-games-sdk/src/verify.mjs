import { lstat, open, readFile } from "node:fs/promises";
import { resolve, join, relative, isAbsolute, sep } from "node:path";
import { parseDocument } from "yaml";

import {
  ALLOWED_MEDIA_EXTENSIONS,
  CANONICAL_MEDIA_PATHS,
  DASHBOARD_GAME_MANIFEST,
  DASHBOARD_GAME_RESULT_ARTIFACT,
  DASHBOARD_GAME_RESULT_FILE,
  DASHBOARD_GAME_WORKFLOW,
  GAME_API_COMPATIBILITY,
  MANIFEST_SCHEMA_VERSION
} from "./contract.mjs";

const GAME_ID = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-((?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const HTTP_PATH = /^\/(?!\.{1,2}(?:\/|$))(?!.*\/\/)(?!.*\/\.{1,2}(?:\/|$))[A-Za-z0-9][A-Za-z0-9._~!$&'()*+,;=:@/-]*$/;
const LOCKFILES = Object.freeze(["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"]);
const REQUIRED_REPOSITORY_FILES = Object.freeze(["Dockerfile", "README.md", "package.json"]);
const REQUIRED_PACKAGE_SCRIPTS = Object.freeze(["test", "build", "dashboard:verify"]);
const WORKFLOW_SCRIPT_PATTERNS = Object.freeze({
  test: /(?:npm\s+(?:run\s+)?test|pnpm\s+(?:run\s+)?test|yarn\s+(?:run\s+)?test|bun\s+(?:run\s+)?test)/,
  build: /(?:npm\s+run\s+build|pnpm\s+(?:run\s+)?build|yarn\s+(?:run\s+)?build|bun\s+(?:run\s+)?build)/,
  "dashboard:verify": /(?:npm\s+run\s+dashboard:verify|pnpm\s+(?:run\s+)?dashboard:verify|yarn\s+(?:run\s+)?dashboard:verify|bun\s+(?:run\s+)?dashboard:verify)/
});

export class VerificationError extends Error {
  constructor(result) {
    super(`Game-Repository ist nicht konform (${result.errors.length} Fehler).`);
    this.name = "VerificationError";
    this.result = result;
  }
}

export async function verifyGameRepository(root = process.cwd()) {
  const repositoryRoot = resolve(root);
  const errors = [];
  const warnings = [];
  const addError = (code, path, message) => errors.push(Object.freeze({ code, path, message }));

  for (const path of REQUIRED_REPOSITORY_FILES) {
    await requireRegularFile(repositoryRoot, path, addError);
  }
  await requireRegularFile(repositoryRoot, DASHBOARD_GAME_MANIFEST, addError);
  await requireRegularFile(repositoryRoot, DASHBOARD_GAME_WORKFLOW, addError);

  const lockfiles = [];
  for (const path of LOCKFILES) {
    if (await isRegularFile(repositoryRoot, path)) lockfiles.push(path);
  }
  if (lockfiles.length === 0) {
    addError("lockfile_missing", ".", `Ein reproduzierbares Lockfile ist erforderlich: ${LOCKFILES.join(", ")}.`);
  } else if (lockfiles.length > 1) {
    addError("lockfile_ambiguous", ".", `Genau ein Lockfile ist erlaubt; gefunden: ${lockfiles.join(", ")}.`);
  }

  await verifyPackage(repositoryRoot, addError);
  await verifyWorkflow(repositoryRoot, addError);
  const manifest = await verifyManifest(repositoryRoot, addError);

  if (manifest?.media && isPlainObject(manifest.media)) {
    await verifyMedia(repositoryRoot, manifest.media, addError);
  }

  const result = {
    ok: errors.length === 0,
    root: repositoryRoot,
    manifest: manifest && errors.every((error) => error.path !== DASHBOARD_GAME_MANIFEST) ? manifest : null,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings)
  };
  return Object.freeze(result);
}

export async function assertGameRepository(root = process.cwd()) {
  const result = await verifyGameRepository(root);
  if (!result.ok) throw new VerificationError(result);
  return result;
}

export function formatVerificationResult(result) {
  if (!result || typeof result !== "object" || !Array.isArray(result.errors)) {
    throw new TypeError("result ist kein Verifier-Ergebnis.");
  }
  if (result.ok) return `OK: Game-Repository ist mit Manifest v${MANIFEST_SCHEMA_VERSION} konform.`;
  return [
    `FEHLER: ${result.errors.length} Konformitaetsfehler.`,
    ...result.errors.map((error) => `- [${error.code}] ${error.path}: ${error.message}`)
  ].join("\n");
}

async function verifyPackage(root, addError) {
  const path = "package.json";
  let packageJson;
  try {
    packageJson = JSON.parse(await readFile(join(root, path), "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") addError("package_invalid", path, "package.json ist kein gueltiges JSON-Objekt.");
    return;
  }
  if (!isPlainObject(packageJson)) {
    addError("package_invalid", path, "package.json muss ein JSON-Objekt sein.");
    return;
  }
  if (!isPlainObject(packageJson.scripts)) {
    addError("package_scripts_missing", path, "package.json.scripts fehlt.");
    return;
  }
  for (const script of REQUIRED_PACKAGE_SCRIPTS) {
    if (typeof packageJson.scripts[script] !== "string" || !packageJson.scripts[script].trim()) {
      addError("package_script_missing", path, `Pflicht-Script \"${script}\" fehlt.`);
    }
  }
}

async function verifyWorkflow(root, addError) {
  const path = DASHBOARD_GAME_WORKFLOW;
  let text;
  try {
    text = await readFile(join(root, path), "utf8");
  } catch {
    return;
  }
  const workflow = parseYamlObject(text, path, addError);
  if (!workflow) return;

  const triggers = workflow.on;
  if (!isPlainObject(triggers) || !("workflow_dispatch" in triggers)) {
    addError("workflow_dispatch_missing", path, "Workflow muss workflow_dispatch anbieten.");
  } else {
    const dispatch = triggers.workflow_dispatch;
    if (isPlainObject(dispatch) && isPlainObject(dispatch.inputs)) {
      const requiredInputs = Object.entries(dispatch.inputs)
        .filter(([, value]) => isPlainObject(value) && value.required === true)
        .map(([name]) => name);
      if (requiredInputs.length > 0) {
        addError("workflow_required_input", path, `workflow_dispatch darf keine Pflicht-Inputs haben: ${requiredInputs.join(", ")}.`);
      }
    }
  }

  if (!text.includes("${{ github.sha }}")) {
    addError("workflow_sha_missing", path, "Workflow muss exakt github.sha als Build-Commit verwenden.");
  }
  if (!text.includes(DASHBOARD_GAME_RESULT_ARTIFACT) || !text.includes(DASHBOARD_GAME_RESULT_FILE)) {
    addError("workflow_result_artifact_missing", path, `Workflow muss ${DASHBOARD_GAME_RESULT_FILE} als ${DASHBOARD_GAME_RESULT_ARTIFACT} hochladen.`);
  }
  for (const [script, pattern] of Object.entries(WORKFLOW_SCRIPT_PATTERNS)) {
    if (!pattern.test(text)) {
      addError("workflow_script_missing", path, `Workflow muss das Package-Script \"${script}\" ausfuehren.`);
    }
  }
}

async function verifyManifest(root, addError) {
  const path = DASHBOARD_GAME_MANIFEST;
  let text;
  try {
    text = await readFile(join(root, path), "utf8");
  } catch {
    return null;
  }
  const manifest = parseYamlObject(text, path, addError);
  if (!manifest) return null;

  allowedKeys(manifest, ["schemaVersion", "id", "name", "summary", "description", "version", "apiCompatibility", "runtime", "capabilities", "resources", "media"], path, addError);
  requireKeys(manifest, ["schemaVersion", "id", "name", "version", "apiCompatibility", "runtime", "capabilities", "resources", "media"], path, addError);
  if (manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION) addError("manifest_schema_version", path, "schemaVersion muss 2 sein.");
  stringField(manifest, "id", path, addError, { min: 1, max: 63, pattern: GAME_ID });
  stringField(manifest, "name", path, addError, { min: 1, max: 80 });
  optionalStringField(manifest, "summary", path, addError, { min: 1, max: 160 });
  optionalStringField(manifest, "description", path, addError, { min: 1, max: 2000 });
  stringField(manifest, "version", path, addError, { min: 1, max: 100, pattern: SEMVER });
  if (manifest.apiCompatibility !== GAME_API_COMPATIBILITY) addError("manifest_api_compatibility", path, `apiCompatibility muss ${GAME_API_COMPATIBILITY} sein.`);

  verifyRuntime(manifest.runtime, path, addError);
  verifyCapabilities(manifest.capabilities, path, addError);
  verifyResources(manifest.resources, path, addError);
  verifyMediaObject(manifest.media, path, addError);
  return manifest;
}

function verifyRuntime(runtime, path, addError) {
  if (!isPlainObject(runtime)) return addError("manifest_runtime", path, "runtime muss ein Objekt sein.");
  allowedKeys(runtime, ["type", "port", "healthPath", "versionPath", "websocketPath"], `${path}#runtime`, addError);
  requireKeys(runtime, ["type", "port", "healthPath", "versionPath", "websocketPath"], `${path}#runtime`, addError);
  if (runtime.type !== "fullstack") addError("manifest_runtime_type", path, "runtime.type muss fullstack sein.");
  integerRange(runtime.port, 1024, 65535, "runtime.port", path, addError);
  for (const key of ["healthPath", "versionPath", "websocketPath"]) {
    stringField(runtime, key, `${path}#runtime`, addError, { min: 2, max: 128, pattern: HTTP_PATH });
  }
}

function verifyCapabilities(capabilities, path, addError) {
  const keys = ["multiplayer", "persistentProgress", "achievements", "leaderboards"];
  if (!isPlainObject(capabilities)) return addError("manifest_capabilities", path, "capabilities muss ein Objekt sein.");
  allowedKeys(capabilities, keys, `${path}#capabilities`, addError);
  requireKeys(capabilities, keys, `${path}#capabilities`, addError);
  for (const key of keys) {
    if (typeof capabilities[key] !== "boolean") addError("manifest_capability", path, `capabilities.${key} muss boolean sein.`);
  }
}

function verifyResources(resources, path, addError) {
  if (!isPlainObject(resources)) return addError("manifest_resources", path, "resources muss ein Objekt sein.");
  allowedKeys(resources, ["cpu", "memoryMb", "pids"], `${path}#resources`, addError);
  requireKeys(resources, ["cpu", "memoryMb", "pids"], `${path}#resources`, addError);
  if (typeof resources.cpu !== "number" || !Number.isFinite(resources.cpu) || resources.cpu < 0.1 || resources.cpu > 2) {
    addError("manifest_resource_cpu", path, "resources.cpu muss zwischen 0.1 und 2 liegen.");
  }
  integerRange(resources.memoryMb, 128, 2048, "resources.memoryMb", path, addError);
  integerRange(resources.pids, 32, 512, "resources.pids", path, addError);
}

function verifyMediaObject(media, path, addError) {
  if (!isPlainObject(media)) return addError("manifest_media", path, "media muss ein Objekt sein.");
  const keys = ["coverPath", "heroPath", "iconPath"];
  allowedKeys(media, keys, `${path}#media`, addError);
  requireKeys(media, keys, `${path}#media`, addError);
  for (const kind of ["cover", "hero", "icon"]) {
    const key = `${kind}Path`;
    const value = media[key];
    const pattern = new RegExp(`^${escapeRegExp(CANONICAL_MEDIA_PATHS[kind])}\\.(?:${ALLOWED_MEDIA_EXTENSIONS.join("|")})$`);
    if (typeof value !== "string" || !pattern.test(value)) {
      addError("manifest_media_path", path, `media.${key} muss ein kanonischer public/dashboard/${kind}.*-Pfad sein.`);
    }
  }
}

async function verifyMedia(root, media, addError) {
  for (const kind of ["cover", "hero", "icon"]) {
    const path = media[`${kind}Path`];
    if (typeof path !== "string") continue;
    const canonical = CANONICAL_MEDIA_PATHS[kind];
    if (!path.startsWith(`${canonical}.`)) continue;
    const fullPath = safePath(root, path);
    if (!fullPath) {
      addError("media_path_escape", path, "Medienpfad verlaesst das Repository.");
      continue;
    }
    let stats;
    try {
      stats = await lstat(fullPath);
    } catch {
      addError("media_missing", path, "Kanonische Mediendatei fehlt.");
      continue;
    }
    if (stats.isSymbolicLink() || !stats.isFile()) {
      addError("media_not_regular_file", path, "Mediendatei muss eine regulaere Datei und darf kein Symlink sein.");
      continue;
    }
    if (stats.size === 0) {
      addError("media_empty", path, "Mediendatei ist leer.");
      continue;
    }
    const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
    const detected = await detectImageType(fullPath);
    if (!matchesMediaExtension(extension, detected)) {
      addError("media_magic_mismatch", path, `Dateiendung .${extension} passt nicht zu den Magic Bytes (${detected || "unbekannt"}).`);
    }
  }
}

async function detectImageType(path) {
  const handle = await open(path, "r");
  try {
    const bytes = Buffer.alloc(64);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    const data = bytes.subarray(0, bytesRead);
    if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
    if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpeg";
    if (data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return "webp";
    if (data.length >= 12 && data.toString("ascii", 4, 8) === "ftyp") {
      const brands = data.toString("ascii", 8, Math.min(data.length, 64));
      if (brands.includes("avif") || brands.includes("avis")) return "avif";
    }
    return null;
  } finally {
    await handle.close();
  }
}

function matchesMediaExtension(extension, detected) {
  if (extension === "jpg" || extension === "jpeg") return detected === "jpeg";
  return extension === detected;
}

function parseYamlObject(text, path, addError) {
  let document;
  try {
    document = parseDocument(text, { maxAliasCount: 0, prettyErrors: false, uniqueKeys: true });
  } catch {
    addError("yaml_invalid", path, "YAML konnte nicht gelesen werden.");
    return null;
  }
  if (document.errors.length > 0) {
    addError("yaml_invalid", path, document.errors[0].message.split("\n")[0]);
    return null;
  }
  let value;
  try {
    value = document.toJS({ maxAliasCount: 0 });
  } catch {
    addError("yaml_alias_forbidden", path, "YAML-Aliase sind nicht erlaubt.");
    return null;
  }
  if (!isPlainObject(value)) {
    addError("yaml_root_invalid", path, "YAML-Wurzel muss ein Objekt sein.");
    return null;
  }
  return value;
}

async function requireRegularFile(root, path, addError) {
  const fullPath = safePath(root, path);
  try {
    const stats = await lstat(fullPath);
    if (!stats.isFile() || stats.isSymbolicLink()) addError("required_file_invalid", path, "Pflichtdatei muss eine regulaere Datei sein.");
  } catch {
    addError("required_file_missing", path, "Pflichtdatei fehlt.");
  }
}

async function isRegularFile(root, path) {
  try {
    const stats = await lstat(safePath(root, path));
    return stats.isFile() && !stats.isSymbolicLink();
  } catch {
    return false;
  }
}

function safePath(root, path) {
  const candidate = resolve(root, path);
  const child = relative(root, candidate);
  if (child === "" || child === ".." || child.startsWith(`..${sep}`) || isAbsolute(child)) return null;
  return candidate;
}

function allowedKeys(value, allowed, path, addError) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) addError("manifest_additional_property", path, `Unerlaubtes Feld: ${key}.`);
  }
}

function requireKeys(value, required, path, addError) {
  for (const key of required) {
    if (!(key in value)) addError("manifest_required_property", path, `Pflichtfeld fehlt: ${key}.`);
  }
}

function stringField(value, key, path, addError, { min, max, pattern }) {
  const field = value[key];
  if (typeof field !== "string" || field.length < min || field.length > max || (pattern && !pattern.test(field))) {
    addError("manifest_string", path, `${key} hat kein gueltiges Format.`);
  }
}

function optionalStringField(value, key, path, addError, options) {
  if (value[key] !== undefined) stringField(value, key, path, addError, options);
}

function integerRange(value, min, max, label, path, addError) {
  if (!Number.isInteger(value) || value < min || value > max) {
    addError("manifest_integer", path, `${label} muss ganzzahlig zwischen ${min} und ${max} liegen.`);
  }
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
