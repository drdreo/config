import type { ExtensionAPI, Settings } from "@earendil-works/pi-coding-agent";
import { SettingsManager } from "@earendil-works/pi-coding-agent";

const ENV_SETTING = "env";

type EnvironmentState = {
  originals: Map<string, string | undefined>;
};

type GlobalWithPiEnvState = typeof globalThis & {
  __piEnvExtensionState?: EnvironmentState;
};

function getEnvironmentState(): EnvironmentState {
  const target = globalThis as GlobalWithPiEnvState;
  target.__piEnvExtensionState ??= { originals: new Map() };
  return target.__piEnvExtensionState;
}

function readEnvironment(settings: Settings): Record<string, string> {
  const value = Reflect.get(settings, ENV_SETTING) as unknown;
  if (value === undefined) return {};

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(
      `The ${ENV_SETTING} setting must be an object of string values.`,
    );
  }

  const entries = Object.entries(value);
  if (entries.some(([, entry]) => typeof entry !== "string")) {
    throw new TypeError(
      `Every value in the ${ENV_SETTING} setting must be a string.`,
    );
  }

  return Object.fromEntries(entries) as Record<string, string>;
}

function applyEnvironment(environment: Record<string, string>): void {
  const state = getEnvironmentState();

  for (const [name, original] of state.originals) {
    if (original === undefined) delete process.env[name];
    else process.env[name] = original;
  }
  state.originals.clear();

  for (const [name, value] of Object.entries(environment)) {
    state.originals.set(name, process.env[name]);
    process.env[name] = value;
  }
}

export default function piEnvExtension(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx) => {
    try {
      const settings = SettingsManager.create(ctx.cwd, undefined, {
        projectTrusted: ctx.isProjectTrusted(),
      });
      const environment = {
        ...readEnvironment(settings.getGlobalSettings()),
        ...readEnvironment(settings.getProjectSettings()),
      };
      applyEnvironment(environment);
    } catch (error) {
      const message = `Unable to load Pi environment settings: ${error instanceof Error ? error.message : String(error)}`;
      if (ctx.hasUI) ctx.ui.notify(message, "error");
      else process.stderr.write(`${message}\n`);
    }
  });
}
