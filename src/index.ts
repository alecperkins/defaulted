/**
 * Creates a typed object for configuration, requiring the definition of
 * defaults and allowing for per-environment values and overrides via process.env.
 * 
 * 
 * @param defaults The default configuration values.
 * @param environment_overrides set or unset defaults for an explicit process.env.ENVIRONMENT
 * @returns the config combined from defaults, overrides and process.env
 */
const conf: (
  <T extends {}>(defaults: T, environment_overrides?: { [env: string]: Partial<T> }) => T
) = function conf (defaults, environment_overrides) {

  const config: typeof defaults = {
    ...defaults,
    ENVIRONMENT: process.env.ENVIRONMENT,
  };

  if (environment_overrides && process.env.ENVIRONMENT) {
    Object.assign(config, environment_overrides[process.env.ENVIRONMENT] ?? {})
  }

  Object.keys(config).forEach((key) => {
    const _key = key as keyof typeof defaults;
    const override = process.env[_key as string];
    if (typeof override === "string") {
      let _override;
      switch (typeof defaults[_key]) {
        case "number": {
          _override = Number(override);
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
            _override = Boolean(override);
          }
          break;
        }
        default: {
          _override = override;
        }
      }
      (config as any)[_key] = _override;
    }
  });

  return config;
}

export default conf;
