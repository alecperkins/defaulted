
import { inspect } from "util";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import defaulted from '../src';


describe("defaulted", () => {

  let overrideEnv;
  let resetEnv;

  beforeEach(() => {
    overrideEnv = function (obj: { [key: string]: string }) {
      const orig = { ...process.env };
      Object.assign(process.env, obj);
      resetEnv = function () {
        Object.keys(obj).forEach((key) => {
          delete process.env[key];
        });
        Object.assign(process.env, orig);
      };
    }
  });

  afterEach(() => {
    resetEnv?.();
  });

  describe("keys", () => {
    test("allows mixed cases", async () => {
      const config = defaulted({
        MYVAL: "testing",
        OtherVal: "foo",
        lower: "bar",
        "with spaces": "baz",
      });
      expect(config.MYVAL).toEqual("testing");
      expect(config.OtherVal).toEqual("foo");
      expect(config.lower).toEqual("bar");
      expect(config["with spaces"]).toEqual("baz");
    });

    test("doesn't read unspecified keys", async () => {
      overrideEnv({ UnreadVal: "unread" });
      const config = defaulted({ MYVAL: "testing" });
      expect(Object.keys(config)).toEqual(
        expect.arrayContaining(["ENVIRONMENT", "MYVAL"])
      );
      expect(() => (config as any).UnreadVal).toThrow('Cannot read unspecified property on config: "UnreadVal"');
    });

    test("throws on access of unspecified key", async () => {
      const config = defaulted({ MYVAL: "asdf" });
      expect(() => (config as any).OTHERVAL).toThrow('Cannot read unspecified property on config: "OTHERVAL"');
    });

    test("throws when trying to set a key", async () => {
      const config = defaulted({ MYVAL: "asdf" });
      expect(config.MYVAL).toEqual("asdf");
      expect(() => (config as any).MYVAL = "xyz").toThrow('Cannot assign to read only property on config: "MYVAL"');
      expect(() => (config as any).OTHERVAL = "xyz").toThrow('Cannot assign to read only property on config: "OTHERVAL"');
    });

    test("throws when trying to delete a key", async () => {
      const config = defaulted({ MYVAL: "asdf" });
      expect(() => delete (config as any).MYVAL).toThrow('Cannot delete read only property on config: "MYVAL"');
      expect(config.MYVAL).toEqual("asdf");
      expect(() => delete (config as any).OTHERVAL).toThrow('Cannot delete read only property on config: "OTHERVAL"');
      expect(JSON.stringify(config)).toEqual(`{"MYVAL":"asdf"}`);
    });

    test("throws when trying to define a key", async () => {
      const config = defaulted({ MYVAL: "asdf" });
      expect(() => Object.defineProperty(config, "MYVAL", { value: "xyz" }))
        .toThrow('Cannot define read only property on config: "MYVAL"');
      expect(config.MYVAL).toEqual("asdf");
      expect(() => Object.defineProperty(config, "OTHERVAL", { value: "xyz" }))
        .toThrow('Cannot define read only property on config: "OTHERVAL"');
      expect(() => (config as any).OTHERVAL).toThrow('Cannot read unspecified property on config: "OTHERVAL"');
    });

    test("does not throw when probed as a thenable", async () => {
      const config = defaulted({ MYVAL: "asdf" });
      expect(() => (config as any).then).not.toThrow();
      expect((config as any).then).toEqual(undefined);
      await expect(Promise.resolve(config)).resolves.toBe(config);
      expect((await config as any).MYVAL).toEqual("asdf");
    });

    test("reads a `then` key if it is specified", async () => {
      const config = defaulted({ then: "asdf" });
      expect(config.then).toEqual("asdf");
    });

    test("does not throw on symbol access", async () => {
      const config = defaulted({ MYVAL: "asdf" });
      expect(() => (config as any)[Symbol.toStringTag]).not.toThrow();
      expect((config as any)[Symbol.toStringTag]).toEqual(undefined);
      expect(Object.prototype.toString.call(config)).toEqual("[object Object]");
      expect(() => (config as any)[Symbol.for("nodejs.util.inspect.custom")]).not.toThrow();
    });

    test("supports string coercion", async () => {
      const config = defaulted({ MYVAL: "asdf" });
      expect(`${ config }`).toEqual("[object Object]");
      expect(String(config)).toEqual("[object Object]");
    });

    test("supports inherited Object methods", async () => {
      const config = defaulted({ MYVAL: "asdf" });
      expect(config.hasOwnProperty("MYVAL")).toEqual(true);
      expect(config.hasOwnProperty("OTHERVAL")).toEqual(false);
      expect(typeof config.valueOf).toEqual("function");
    });

    test("always provides ENVIRONMENT", async () => {
      overrideEnv({ ENVIRONMENT: "someenv" });
      const config = defaulted({});
      expect(config.ENVIRONMENT).toEqual("someenv");
      expect(Object.keys(config)).toEqual(["ENVIRONMENT"]);
    });

    test("throws if ENVIRONMENT is specified in the defaults", async () => {
      expect(() => defaulted({ ENVIRONMENT: "local" }))
        .toThrow('Cannot specify a default for "ENVIRONMENT": it is always read from process.env');
    });

    test("throws for an ENVIRONMENT default even when set in the env", async () => {
      overrideEnv({ ENVIRONMENT: "prod" });
      expect(() => defaulted({ ENVIRONMENT: "local" }))
        .toThrow('Cannot specify a default for "ENVIRONMENT": it is always read from process.env');
    });

    test("always provides ENVIRONMENT if not defined", async () => {
      const config = defaulted({});
      expect(config.ENVIRONMENT).toEqual(undefined);
      expect(Object.keys(config)).toEqual(["ENVIRONMENT"]);
    });
  });

  describe("strings", () => {
    test("passes strings through", async () => {
      const config = defaulted({ MYVAL: "testing" });
      expect(config.MYVAL).toEqual("testing");
    });

    test("reads from environment", async () => {
      overrideEnv({ MYVAL: "different" });
      const config = defaulted({ MYVAL: "testing" });
      expect(config.MYVAL).toEqual("different");
    });

    test("allows an empty environment string", async () => {
      overrideEnv({ MYVAL: "" });
      const config = defaulted({ MYVAL: "testing" });
      expect(config.MYVAL).toEqual("");
    });
  });

  describe("numbers", () => {
    test("casts numbers", async () => {
      overrideEnv({ MYVAL: "456" });
      const config = defaulted({ MYVAL: 345 });
      expect(config.MYVAL).toEqual(456);
    });

    test("allows floats", async () => {
      overrideEnv({ MYVAL: "1.23" });
      const config = defaulted({ MYVAL: 345 });
      expect(config.MYVAL).toEqual(1.23);
    });

    test("allows hex", async () => {
      overrideEnv({ MYVAL: "0xff" });
      const config = defaulted({ MYVAL: 345 });
      expect(config.MYVAL).toEqual(255);
    });

    test("allows Infinity", async () => {
      overrideEnv({ MYVAL: "Infinity" });
      const config = defaulted({ MYVAL: 345 });
      expect(config.MYVAL).toEqual(Infinity);
    });

    test("throws for alpha strings", async () => {
      overrideEnv({ MYVAL: "abc" });
      expect(() => defaulted({ MYVAL: 345 })).toThrow('Cannot cast to number from "abc"');
    });

    test("throws for null", async () => {
      overrideEnv({ MYVAL: "null" });
      expect(() => defaulted({ MYVAL: 345 })).toThrow('Cannot cast to number from "null"');
    });

    test("throws for boolean", async () => {
      overrideEnv({ MYVAL: "true" });
      expect(() => defaulted({ MYVAL: 345 })).toThrow('Cannot cast to number from "true"');
    });

    test("doesn't convert numbers when not originally numeric", async () => {
      overrideEnv({ MYVAL: "2" });
      const config = defaulted({ MYVAL: "asdf" });
      expect(config.MYVAL).not.toEqual(2);
    });

    test("disallows an empty environment string", async () => {
      overrideEnv({ MYVAL: "" });
      expect(() => defaulted({ MYVAL: 345 })).toThrow('Cannot cast to number from ""');
    });

    test("disallows a whitespace-only environment string", async () => {
      overrideEnv({ MYVAL: "   " });
      expect(() => defaulted({ MYVAL: 345 })).toThrow('Cannot cast to number from "   "');
    });

    test("disallows tabs and newlines", async () => {
      overrideEnv({ MYVAL: "\t\n" });
      expect(() => defaulted({ MYVAL: 345 })).toThrow('Cannot cast to number from "\t\n"');
    });

    test("allows surrounding whitespace on a real number", async () => {
      overrideEnv({ MYVAL: " 42 " });
      const config = defaulted({ MYVAL: 345 });
      expect(config.MYVAL).toEqual(42);
    });
  });

  describe("booleans", () => {
    test("throws for non-booleans", async () => {
      overrideEnv({ MYVAL: "a" });
      expect(() => defaulted({ MYVAL: false })).toThrow();

    });

    test("doesn't convert booleans when not originally boolean", async () => {
      overrideEnv({ MYVAL: "true" });
      const config = defaulted({ MYVAL: "asdf" });
      expect(config.MYVAL).not.toEqual(true);

    });

    test("casts json booleans", async () => {
      overrideEnv({ MYVAL: "true" });
      const config = defaulted({ MYVAL: false });
      expect(config.MYVAL).toEqual(true);

    });

    test("casts capitalized booleans", async () => {
      overrideEnv({ MYVAL: "True" });
      const config = defaulted({ MYVAL: false });
      expect(config.MYVAL).toEqual(true);

    });

    test("casts 0 booleans", async () => {
      overrideEnv({ MYVAL: "0" });
      const config = defaulted({ MYVAL: true });
      expect(config.MYVAL).toEqual(false);

    });

    test("casts 1 booleans", async () => {
      overrideEnv({ MYVAL: "1" });
      const config = defaulted({ MYVAL: false });
      expect(config.MYVAL).toEqual(true);

    });

    test("throws for non-booleans", async () => {
      overrideEnv({ MYVAL: "yes" }); // Try "yes" because some languages treat these as booleans
      expect(() => defaulted({ MYVAL: false })).toThrow('Cannot cast to boolean from "yes"');
    });

    test("disallows an empty environment string", async () => {
      overrideEnv({ MYVAL: "" });
      expect(() => defaulted({ MYVAL: false })).toThrow('Cannot cast to boolean from ""');
    });

  });

  describe("casting", () => {
    test("names the key that could not be cast", async () => {
      overrideEnv({ MYVAL: "abc" });
      expect(() => defaulted({ MYVAL: 345 })).toThrow('Cannot cast to number from "abc" for "MYVAL"');
    });

    test("tests all values so it can throw once", async () => {
      overrideEnv({
        NUM: "abc",
        FLAG: "yes",
        OTHER_NUM: "",
      });
      expect(() => defaulted({
        NUM: 1,
        FLAG: true,
        OTHER_NUM: 2,
      })).toThrow('Cannot cast to number from "abc" for "NUM"; Cannot cast to boolean from "yes" for "FLAG"; Cannot cast to number from "" for "OTHER_NUM"');
    });

    test("reports uncastable values before missing ones", async () => {
      overrideEnv({
        ENVIRONMENT: "prod",
        NUM: "abc",
      });
      expect(() => defaulted({
        NUM: 1,
        NEEDED: "x",
      }, {
        prod: {
          NEEDED: undefined,
        },
      })).toThrow('Cannot cast to number from "abc" for "NUM"');
    });
  });

  describe("ENVIRONMENT", () => {
    test("reads from environment despite ENVIRONMENT", async () => {
      overrideEnv({
        ENVIRONMENT: "test",
        MYVAL: "different",
      });
      const config = defaulted({
        MYVAL: "testing",
      }, {
        test: {
          MYVAL: "test override",
        },
      });
      expect(config.MYVAL).toEqual("different");
    });

    test("switches defaults on ENVIRONMENT", async () => {
      overrideEnv({
        ENVIRONMENT: "test",
      });
      const config = defaulted({
        MYVAL: "testing",
      }, {
        test: {
          MYVAL: "test override",
        },
      });
      expect(config.MYVAL).toEqual("test override");
    });

    test("requires a value if set to undefined in the per-ENVIRONMENT default", async () => {
      overrideEnv({
        ENVIRONMENT: "test",
      });
      expect(() => defaulted({
        MYVAL: "testing",
      }, {
        test: {
          MYVAL: undefined,
        },
      })).toThrow('Required keys not present in env: "MYVAL"');
    });

    test("tests all values so it can throw once", async () => {
      overrideEnv({
        ENVIRONMENT: "test",
      });
      expect(() => defaulted({
        MYVAL: "testing",
        OTHERVAL: "fake",
      }, {
        test: {
          MYVAL: undefined,
          OTHERVAL: undefined,
        },
      })).toThrow('Required keys not present in env: "MYVAL","OTHERVAL"');
    });

    test("throws if an override value does not match the default type", async () => {
      overrideEnv({
        ENVIRONMENT: "prod",
      });
      expect(() => defaulted({
        PORT: 5432,
      }, {
        prod: {
          PORT: "5432",
        } as any, // Typescript will normally prevent this scenario
      })).toThrow('Invalid values in overrides: "PORT" in "prod" must be number, got string');
    });

    test("distinguishes a null override from an object", async () => {
      overrideEnv({
        ENVIRONMENT: "prod",
      });
      expect(() => defaulted({
        HOST: "localhost",
      }, {
        prod: {
          HOST: null,
        } as any, // Typescript will normally prevent this scenario
      })).toThrow('Invalid values in overrides: "HOST" in "prod" must be string, got null');
      expect(() => defaulted({
        HOST: "localhost",
      }, {
        prod: {
          HOST: {},
        } as any,
      })).toThrow('Invalid values in overrides: "HOST" in "prod" must be string, got object');
    });

    test("checks override values in every ENVIRONMENT so it can throw once", async () => {
      overrideEnv({
        ENVIRONMENT: "test",
      });
      expect(() => defaulted({
        PORT: 5432,
        HOST: "localhost",
      }, {
        test: {
          PORT: "5432",
        } as any,
        prod: {
          HOST: 1,
        } as any,
      })).toThrow('Invalid values in overrides: "PORT" in "test" must be number, got string; "HOST" in "prod" must be string, got number');
    });

    test("allows overrides that match the default type", async () => {
      overrideEnv({
        ENVIRONMENT: "test",
        UNSET: "from env",
      });
      const config = defaulted({
        PORT: 5432,
        MOCK: true,
        HOST: "localhost",
        UNSET: "asdf",
      }, {
        test: {
          PORT: 1234,
          MOCK: false,
          HOST: "smtp-echo.local",
          UNSET: undefined,
        },
      });
      expect(config.PORT).toEqual(1234);
      expect(config.MOCK).toEqual(false);
      expect(config.HOST).toEqual("smtp-echo.local");
      expect(config.UNSET).toEqual("from env");
    });

    test("reports unexpected keys before uncastable env values", async () => {
      overrideEnv({
        ENVIRONMENT: "prod",
        PORT: "abc",
      });
      expect(() => defaulted({
        PORT: 5432,
      }, {
        prod: {
          TYPO: "x",
        } as any,
      })).toThrow('Unexpected keys in overrides: "TYPO"');
    });

    test("reports invalid override values before uncastable env values", async () => {
      overrideEnv({
        ENVIRONMENT: "prod",
        PORT: "abc",
      });
      expect(() => defaulted({
        PORT: 5432,
        HOST: "localhost",
      }, {
        prod: {
          HOST: 1,
        } as any,
      })).toThrow('Invalid values in overrides: "HOST" in "prod" must be string, got number');
    });

    test("throws if an override specifies a key not in the defaults", async () => {
      overrideEnv({
        ENVIRONMENT: "test",
      });
      expect(() => defaulted({
        MYVAL: "testing",
      }, {
        test: {
          OTHER_VAL: "",
          MYVAL: undefined,
        } as any, // Typescript will normally prevent this scenario
        prod: {
          SOME_VAL: "",
        } as any
      })).toThrow('Unexpected keys in overrides: "OTHER_VAL","SOME_VAL"');
    });
  });

  describe("toJSON", () => {
    test("serializes operative values", async () => {
      overrideEnv({
        ENVIRONMENT: "test",
        ABC: 3,
      });
      const conf = defaulted({
        MYVAL: false,
        XYZ: 'xyz',
        ABC: 1,
      }, {
        local: {
          MYVAL: true,
          XYZ: 'abc',
        },
        test: {
          XYZ: 'XYZ',
        },
      });
      expect(JSON.stringify(conf)).toEqual(`{"MYVAL":false,"XYZ":"XYZ","ABC":3,"ENVIRONMENT":"test"}`);
      expect(conf.toJSON()).toEqual({"MYVAL":false,"XYZ":"XYZ","ABC":3,"ENVIRONMENT":"test"});
    });
  });

  describe("secrets", () => {
    test("passes through values from env", async () => {
      overrideEnv({
        ENVIRONMENT: "test",
        MY_SECRET: "secret",
      });
      const secrets = defaulted.secrets([
        "MY_SECRET",
      ] as const);
      expect(secrets.MY_SECRET).toEqual("secret");
      expect(Object.keys(secrets)).toEqual(["MY_SECRET"]);
    });

    test("does not cast values", async () => {
      overrideEnv({
        MY_SECRET: "123",
      });
      const secrets = defaulted.secrets([
        "MY_SECRET",
      ]);
      expect(typeof secrets.MY_SECRET).toEqual("string");
    });

    test("applies overrides if specified", async () => {
      overrideEnv({
        ENVIRONMENT: "local",
        MY_OTHER_SECRET: "fake",
      });
      const secrets = defaulted.secrets([
        "MY_SECRET",
        "MY_OTHER_SECRET",
      ] as const, {
        local: {
          MY_SECRET: "overridden",
        },
        test: {},
      });
      expect(secrets.MY_SECRET).toEqual("overridden");
      expect(secrets.MY_OTHER_SECRET).toEqual("fake");
    });

    test("requires secrets be defined in env if not an env override", async () => {
      overrideEnv({
        ENVIRONMENT: "test",
      });
      expect(() => {
        defaulted.secrets([
          "MY_SECRET",
          "MY_OTHER_SECRET",
        ] as const, {
          local: {
            MY_SECRET: "asdf",
          },
          test: {},
        });
      }).toThrow('Required secret keys not present in env: "MY_SECRET","MY_OTHER_SECRET"');
    });

    test("allows empty strings", async () => {
      overrideEnv({
        MY_SECRET: "",
      });
      const secrets = defaulted.secrets([
        "MY_SECRET",
      ]);
      expect(secrets.MY_SECRET).toEqual("");
    });

    test("throws if an override value is not a string", async () => {
      overrideEnv({
        ENVIRONMENT: "local",
      });
      expect(() => {
        defaulted.secrets([
          "MY_SECRET",
        ] as const, {
          local: {
            MY_SECRET: 123,
          } as any, // Typescript will normally prevent this scenario
        });
      }).toThrow('Invalid secret values in overrides: "MY_SECRET" in "local" must be string, got number');
    });

    test("throws if an override specifies a key not in the key list", async () => {
      overrideEnv({
        ENVIRONMENT: "local",
      });
      expect(() => {
        defaulted.secrets([
          "MY_SECRET",
        ] as const, {
          local: {
            MY_SECRET: "asdf",
            SOME_SECRET: "",
          } as any,
          test: {
            OTHER_SECRET: "asdf",
          } as any,
        });
      }).toThrow('Unexpected secret keys in overrides: "SOME_SECRET","OTHER_SECRET"');
    });

    test("throws when trying to set a key", async () => {
      overrideEnv({
        MY_SECRET: "secret",
      });
      const secrets = defaulted.secrets(["MY_SECRET"] as const);
      expect(secrets.MY_SECRET).toEqual("secret");
      expect(() => (secrets as any).MY_SECRET = "xyz").toThrow('Cannot assign to read only property on secrets: "MY_SECRET"');
    });

    test("throws when trying to delete a key", async () => {
      overrideEnv({
        MY_SECRET: "secret",
      });
      const secrets = defaulted.secrets(["MY_SECRET"] as const);
      expect(() => delete (secrets as any).MY_SECRET).toThrow('Cannot delete read only property on secrets: "MY_SECRET"');
      expect(secrets.MY_SECRET).toEqual("secret");
    });

    test("throws when trying to define a key", async () => {
      overrideEnv({
        MY_SECRET: "secret",
      });
      const secrets = defaulted.secrets(["MY_SECRET"] as const);
      expect(() => Object.defineProperty(secrets, "MY_SECRET", { value: "xyz" }))
        .toThrow('Cannot define read only property on secrets: "MY_SECRET"');
      expect(secrets.MY_SECRET).toEqual("secret");
    });

    test("does not throw when probed as a thenable", async () => {
      overrideEnv({
        MY_SECRET: "secret",
      });
      const secrets = defaulted.secrets(["MY_SECRET"] as const);
      expect((secrets as any).then).toEqual(undefined);
      await expect(Promise.resolve(secrets)).resolves.toBe(secrets);
    });

    test("does not throw on symbol access or coercion", async () => {
      overrideEnv({
        MY_SECRET: "secret",
      });
      const secrets = defaulted.secrets(["MY_SECRET"] as const);
      expect((secrets as any)[Symbol.toStringTag]).toEqual(undefined);
      expect(`${ secrets }`).toEqual("[object Object]");
    });

    test("throws when accessing an undefined key", async () => {
      const secrets = defaulted.secrets([] as const);
      expect(() => (secrets as any).SECRET).toThrow('Cannot read unspecified property on secrets: "SECRET"');
    });

    test("allows ENVIRONMENT as a secret key", async () => {
      overrideEnv({
        ENVIRONMENT: "test",
      });
      const secrets = defaulted.secrets(["ENVIRONMENT"] as const);
      expect(secrets.ENVIRONMENT).toEqual("test");
    });

    test("does not include ENVIRONMENT by default", async () => {
      overrideEnv({
        ENVIRONMENT: "test",
      });
      const secrets = defaulted.secrets([] as const);
      expect(() => (secrets as any).ENVIRONMENT).toThrow('Cannot read unspecified property on secrets: "ENVIRONMENT"');
    });

    test("redacts values when inspected", async () => {
      overrideEnv({
        MY_SECRET: "supersecret",
        MY_OTHER_SECRET: "alsosecret",
      });
      const secrets = defaulted.secrets([
        "MY_SECRET",
        "MY_OTHER_SECRET",
      ] as const);
      const output = inspect(secrets);
      expect(output).not.toContain("supersecret");
      expect(output).not.toContain("alsosecret");
      expect(output).toEqual(`{ MY_SECRET: '[redacted]', MY_OTHER_SECRET: '[redacted]' }`);
      expect(secrets.MY_SECRET).toEqual("supersecret");
    });

    test("redacts values when inspected indirectly", async () => {
      overrideEnv({
        MY_SECRET: "supersecret",
      });
      const secrets = defaulted.secrets(["MY_SECRET"] as const);
      expect(inspect({ nested: secrets })).not.toContain("supersecret");
      expect(inspect([secrets])).not.toContain("supersecret");
    });

    test("allows toJSON to be feature-detected", async () => {
      overrideEnv({
        MY_SECRET: "secret",
      });
      const secrets = defaulted.secrets([
        "MY_SECRET",
      ] as const);
      expect(() => (secrets as any).toJSON).not.toThrow();
      expect(typeof (secrets as any).toJSON).toEqual("function");
    });

    test("throws when toJSON is called", async () => {
      overrideEnv({
        MY_SECRET: "secret",
      });
      const secrets = defaulted.secrets([
        "MY_SECRET",
      ] as const);
      expect(() => (secrets as any).toJSON()).toThrow('Cannot serialize secrets to JSON directly');
    });

    test("throws when trying to serialize to json", async () => {
      overrideEnv({
        ENVIRONMENT: "test",
        MY_SECRET: "secret",
      });
      const secrets = defaulted.secrets([
        "MY_SECRET",
      ] as const);
      expect(() => JSON.stringify(secrets)).toThrow('Cannot serialize secrets to JSON directly');
    });
  });

});

