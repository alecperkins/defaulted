
const INSPECT_CUSTOM = Symbol.for("nodejs.util.inspect.custom");

// `typeof null` is "object", which is unhelpful when reporting a bad value.
function _typeOf (value: unknown): string {
  return value === null ? "null" : typeof value;
}

// Throws rather than returning an error so every call site casts or fails,
// leaving the caller to decide whether to collect or rethrow.
function _cast (value: string, expected_type: string): string | number | boolean {
  switch (expected_type) {
    case "number": {
      // `Number` reads blank strings as 0, so they have to be rejected
      // before casting. Surrounding whitespace on a real number is fine.
      if (value.trim() === "") {
        throw new Error(`Cannot cast to number from "${ value }"`);
      }
      const cast = Number(value);
      if (Number.isNaN(cast)) {
        throw new Error(`Cannot cast to number from "${ value }"`);
      }
      return cast;
    }
    case "boolean": {
      if (value.toLowerCase() === "true") {
        return true;
      } else if (value.toLowerCase() === "false") {
        return false;
      } else if (value === "1") {
        return true;
      } else if (value === "0") {
        return false;
      }
      throw new Error(`Cannot cast to boolean from "${ value }"`);
    }
    default: {
      return value;
    }
  }
}

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

  // `ENVIRONMENT` is always taken from process.env below, so a declared
  // default for it could only ever be discarded. Reserve the name instead of
  // silently ignoring the value.
  if (include_ENVIRONMENT && expected_keys.has("ENVIRONMENT" as keyof T)) {
    throw new Error(`Cannot specify a default for "ENVIRONMENT": it is always read from process.env`);
  }

  const actual_config: typeof defaults = {
    ...defaults,
  };

  const unexpected_keys = new Set();
  const invalid_values = new Set();
  const uncastable_values = new Set();
  const missing_keys = new Set();
  if (overrides) {
    Object.entries(overrides).forEach(([env, override]) => {
      Object.keys(override).forEach(key => {
        if (!expected_keys.has(key as any)) {
          unexpected_keys.add(key);
          return;
        }
        const value = (override as any)[key];
        // An explicit undefined is how an override marks a key as mandatory
        // in the environment, so it is always allowed.
        if (typeof value === "undefined") {
          return;
        }
        // Secrets have no typed defaults to compare against, and are always
        // passed through as strings.
        const default_value = defaults[key as keyof T];
        const expected_type = is_secret ? "string" : _typeOf(default_value);
        const actual_type = _typeOf(value);
        if (expected_type !== "undefined" && actual_type !== expected_type) {
          invalid_values.add(`"${ key }" in "${ env }" must be ${ expected_type }, got ${ actual_type }`);
        }
      });
    });
  }

  if (unexpected_keys.size > 0) {
    throw new Error(`Unexpected ${ is_secret ? "secret " : "" }keys in overrides: "${ Array.from(unexpected_keys).join('","') }"`);
  }
  if (invalid_values.size > 0) {
    throw new Error(`Invalid ${ is_secret ? "secret " : "" }values in overrides: ${ Array.from(invalid_values).join("; ") }`);
  }

  if (overrides && process.env.ENVIRONMENT) {
    Object.assign(actual_config, overrides[process.env.ENVIRONMENT] ?? {})
  }

  Object.keys(actual_config).forEach((key) => {
    const _key = key as keyof typeof defaults;
    const override = process.env[_key as string];
    if (typeof override === "string") {
      try {
        (actual_config as any)[_key] = _cast(override, typeof defaults[_key]);
      } catch (error) {
        // Collected rather than rethrown so one run reports every bad value.
        uncastable_values.add(`${ (error as Error).message } for "${ key }"`);
      }
    }
    if (typeof actual_config[key] === "undefined") {
      missing_keys.add(key);
    }
  });

  if (uncastable_values.size > 0) {
    throw new Error(Array.from(uncastable_values).join("; "));
  }
  if (missing_keys.size > 0) {
    throw new Error(`Required ${ is_secret ? "secret " : "" }keys not present in env: "${ Array.from(missing_keys).join('","') }"`);
  }

  if (include_ENVIRONMENT) {
    // Set this last so it doesn't get caught in validation. Nothing can be
    // overwritten here: the name is reserved above.
    Object.assign(actual_config, {
      ENVIRONMENT: process.env.ENVIRONMENT,
    });
  }

  if (is_secret) {
    // `util.inspect`, and so `console.log`, unwraps the Proxy and reads the
    // target directly, deliberately bypassing the traps below. Redacting has
    // to happen on the target itself or every secret prints in cleartext.
    // Non-enumerable so it stays out of the keys and out of `{ ...secrets }`.
    Object.defineProperty(actual_config, INSPECT_CUSTOM, {
      enumerable: false,
      value: () => {
        const redacted: { [key: string]: string } = {};
        Object.keys(actual_config).forEach(key => {
          redacted[key] = "[redacted]";
        });
        return redacted;
      },
    });
  }

  const config = new Proxy(actual_config, {
    get: (orig, key) => {
      if (key === 'toJSON') {
        if (is_secret) {
          throw new Error('Cannot serialize secrets to JSON directly. If you do mean to serialize secrets, reassign them individually into a new object.');
        }
        return () => Object.assign({}, actual_config);
      }
      // Symbols and inherited Object members are language plumbing, not
      // config keys: throwing on them breaks coercion, inspection, and
      // anything that probes the object generically. Only unknown string
      // keys, ie actual typos, are errors.
      if (typeof key === "symbol" || key in orig) {
        return Reflect.get(orig, key);
      }
      // Promise resolution probes for `then` on any resolved value. Without
      // this, `await config` and `Promise.resolve(config)` throw.
      if (key === "then") {
        return undefined;
      }
      throw new Error(`Cannot read unspecified property on ${ is_secret ? "secrets" : "config" }: "${ String(key) }"`);
    },
    set: (orig, key, val) => {
      throw new Error(`Cannot assign to read only property on ${ is_secret ? "secrets" : "config" }: "${ String(key) }"`);
    },
    // Without these, `delete` and `Object.defineProperty` bypass the `set`
    // trap and mutate the underlying object directly.
    deleteProperty: (orig, key) => {
      throw new Error(`Cannot delete read only property on ${ is_secret ? "secrets" : "config" }: "${ String(key) }"`);
    },
    defineProperty: (orig, key, descriptor) => {
      throw new Error(`Cannot define read only property on ${ is_secret ? "secrets" : "config" }: "${ String(key) }"`);
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
  ) => { readonly [K in keyof T]: T[K] } & { toJSON: () => { [K in keyof T]: T[K] }}
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

