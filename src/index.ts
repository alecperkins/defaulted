
function _makeConfig <T extends {}> (args: {
  defaults: T;
  expected_keys: Set<keyof T>;
  overrides: { [env: string]: Partial<T> };
  is_secret: boolean;
  include_ENVIRONMENT: boolean;
}) {

  const {
    defaults,
    expected_keys,
    overrides,
    is_secret,
    include_ENVIRONMENT,
  } = args;

  const actual_config: typeof defaults = {
    ...defaults,
  };

  const unexpected_keys = new Set();
  const missing_keys = new Set();
  if (overrides) {
    Object.values(overrides).forEach(override => {
      Object.keys(override).forEach(key => {
        if (!expected_keys.has(key as any)) {
          unexpected_keys.add(key);
        }
      });
    });
  }

  if (overrides && process.env.ENVIRONMENT) {
    Object.assign(actual_config, overrides[process.env.ENVIRONMENT] ?? {})
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
    if (typeof actual_config[key] === "undefined") {
      missing_keys.add(key);
    }
  });
  
  if (unexpected_keys.size > 0) {
    throw new Error(`Unexpected ${ is_secret ? "secret " : "" }keys in overrides: "${ Array.from(unexpected_keys).join('","') }"`);
  }
  if (missing_keys.size > 0) {
    throw new Error(`Required ${ is_secret ? "secret " : "" }keys not present in env: "${ Array.from(missing_keys).join('","') }"`);
  }

  if (include_ENVIRONMENT) {
    // Set this last so it doesn't get caught in validation.
    Object.assign(actual_config, {
      ENVIRONMENT: process.env.ENVIRONMENT,
    });
  }

  const config = new Proxy(actual_config, {
    get: (orig, key) => {
      if ((Object as any).hasOwn(orig, key)) {
      return orig[key];
      }
      throw new Error(`Cannot read unspecified property on ${ is_secret ? "secrets" : "config" }: "${ String(key) }"`);
    },
    set: (orig, key, val) => {
      throw new Error(`Cannot assign to read only property on ${ is_secret ? "secrets" : "config" }: "${ String(key) }"`);
    },
  });
  return config as any;
}

/**
 * Creates a typed object for configuration, requiring the definition of
 * defaults and allowing for per-environment values and overrides via process.env.
 * 
 * @param defaults - The default configuration values.
 * @param overrides? - set or unset defaults for an explicit process.env.ENVIRONMENT
 * @returns the config combined from defaults, overrides and process.env
 */
const defaulted: (
  <T extends {}>(
    defaults: T,
    overrides?: { [env: string]: Partial<T> }
  ) => { readonly [K in keyof T]: T[K] }
  & { ENVIRONMENT: string | undefined }
) & { secrets: typeof secrets } = function defaulted (defaults, overrides = {}) {
  return _makeConfig({
    defaults,
    expected_keys: new Set(Object.keys(defaults) as Array<keyof typeof defaults>),
    overrides,
    is_secret: false,
    include_ENVIRONMENT: true,
  });
}

/**
 * Creates a typed object for secret configuration, listing mandatory
 * keys the env must define, and providing optional per-ENVIRONMENT defaults.
 * 
 * @remarks
 * Make sure to use `as const` for stricter type checking.
 * ```typescript
 * const secrets = defaulted.secrets(["KEY1", "KEY2"] as const);
 * ```
 * 
 * @param keys - An array of keys for secret values in the environment.
 * @param overrides - defaults for an explicit process.env.ENVIRONMENT
 * @returns the config combined from defaults, overrides and process.env
 */
function secrets <T extends ReadonlyArray<string>> (
  keys: T,
  overrides: { [env: string]: { [K in T[number]]?: string } } = {}
): { readonly [K in T[number]]: string } {

  const defaults = {} as {
    [K in T[number]]: string;
  };
  keys.forEach(key => {
    Object.defineProperty(defaults, key, { enumerable: true, value: undefined });
  });

  return _makeConfig({
    defaults,
    expected_keys: new Set(keys),
    overrides,
    is_secret: true,
    include_ENVIRONMENT: false,
  });
}
defaulted.secrets = secrets;
export default defaulted;
export { secrets };

