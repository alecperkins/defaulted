/**
 * Creates a typed object for configuration, requiring the definition of
 * defaults and allowing for per-environment values and overrides via process.env.
 * 
 * 
 * @param defaults - The default configuration values.
 * @param environment_overrides - set or unset defaults for an explicit process.env.ENVIRONMENT
 * @returns the config combined from defaults, overrides and process.env
 */
const defaulted: (
  <T extends {}>(defaults: T, environment_overrides?: { [env: string]: Partial<T> }) => { readonly [key in keyof T]: T[key] }
) = function defaulted (defaults, environment_overrides) {

  const actual_config: typeof defaults = {
    ...defaults,
  };

  if (environment_overrides && process.env.ENVIRONMENT) {
    Object.assign(actual_config, environment_overrides[process.env.ENVIRONMENT] ?? {})
  }

  Object.keys(actual_config).forEach((key) => {
    const _key = key as keyof typeof defaults;
    const override = process.env[_key as string];
    if (typeof override === "string") {
      let _override: string | number | boolean;
      switch (typeof defaults[_key]) {
        case "number": {
          if (override === "") {
            throw new Error(`Cannot cast to number from ""`);
          }
          _override = Number(override);
          if (Number.isNaN(_override)) {
            throw new Error(`Cannot cast to number from "${ override }"`);
          }
          break;
        }
        case "boolean": {
          if (override.toLowerCase() === "true") {
            _override = true;
          } else if (override.toLowerCase() === "false") {
            _override = false;
          } else if (override === "1") {
            _override = true;
          } else if (override === "0") {
            _override = false;
          } else {
            throw new Error(`Cannot cast to boolean from "${ override }"`);
          }
          break;
        }
        default: {
          _override = override;
        }
      }
      (actual_config as any)[_key] = _override;
    }
  });

  // Set this last so it doesn't get caught in validation.
  Object.assign(actual_config, {
    ENVIRONMENT: process.env.ENVIRONMENT,
  });

  const config = new Proxy(actual_config, {
    get: (orig, key) => {
      if ((Object as any).hasOwn(orig, key)) {
      return orig[key];
      }
      throw new Error(`Cannot read unspecified property "${ String(key) }"`);
    },
  });
  return Object.freeze(config);
}

export default defaulted;
