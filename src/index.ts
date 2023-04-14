/**
 * Creates a typed object for configuration, requiring the definition of
 * defaults and allowing for per-environment values and overrides via process.env.
 * 
 * @param defaults - The default configuration values.
 * @param overrides - set or unset defaults for an explicit process.env.ENVIRONMENT
 * @returns the config combined from defaults, overrides and process.env
 */
const defaulted: (
  <T extends {}>(defaults: T, overrides?: { [env: string]: Partial<T> }) => { readonly [key in keyof T]: T[key] } & { ENVIRONMENT: string | undefined }
) & { secrets: typeof secrets } = function defaulted (defaults, overrides) {

  const actual_config: typeof defaults = {
    ...defaults,
  };

  const expected_keys = new Set(Object.keys(actual_config));
  const unexpected_keys = new Set();
  const missing_keys = new Set();
  if (overrides) {
    Object.values(overrides).forEach(override => {
      Object.keys(override).forEach(key => {
        if (!expected_keys.has(key)) {
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
    throw new Error(`Unexpected keys in overrides: "${ Array.from(unexpected_keys).join('","') }"`);
  }
  if (missing_keys.size > 0) {
    throw new Error(`Required keys not present in env: "${ Array.from(missing_keys).join('","') }"`);
  }

  // Set this last so it doesn't get caught in validation.
  Object.assign(actual_config, {
    ENVIRONMENT: process.env.ENVIRONMENT,
  });

  const config = new Proxy(actual_config, {
    get: (orig, key) => {
      if ((Object as any).hasOwn(orig, key)) {
      return orig[key];
      }
      throw new Error(`Cannot read unspecified property on config: "${ String(key) }"`);
    },
    set: (orig, key, val) => {
      throw new Error(`Cannot assign to read only property on config: "${ String(key) }"`);
    },
  });
  return config as any;
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
  overrides?: { [env: string]: { [key in T[number]]: string } }
): { readonly [key in T[number]]: string } {
  const actual_secrets = {} as {
    [key in T[number]]: string;
  };
  const expected_keys = new Set(keys);
  const unexpected_keys = new Set();
  const missing_keys = new Set();

  if (overrides) {
    Object.values(overrides).forEach(override => {
      Object.keys(override).forEach(key => {
        if (!expected_keys.has(key)) {
          unexpected_keys.add(key);
        }
      });
    });
  }

  if (overrides && process.env.ENVIRONMENT) {
    Object.assign(actual_secrets, overrides[process.env.ENVIRONMENT] ?? {})
  }

  keys.forEach(key => {
    actual_secrets[key] = process.env[key] ?? actual_secrets[key];
    if (typeof actual_secrets[key] === "undefined") {
      missing_keys.add(key);
    }
  });

  if (unexpected_keys.size > 0) {
    throw new Error(`Unexpected secret keys in overrides: "${ Array.from(unexpected_keys).join('","') }"`);
  }
  if (missing_keys.size > 0) {
    throw new Error(`Required secret keys not present in env: "${ Array.from(missing_keys).join('","') }"`);
  }

  const _secrets = new Proxy(actual_secrets, {
    get: (orig, key) => {
      if ((Object as any).hasOwn(orig, key)) {
      return orig[key];
      }
      throw new Error(`Cannot read unspecified property on secrets: "${ String(key) }"`);
    },
    set: (orig, key, val) => {
      throw new Error(`Cannot assign to read only property on secrets: "${ String(key) }"`);
    },
  });
  return _secrets as { readonly [key in T[number]]: string };
}
defaulted.secrets = secrets;
export default defaulted;
export { secrets };

