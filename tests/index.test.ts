
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

    test("always provides ENVIRONMENT", async () => {
      overrideEnv({ ENVIRONMENT: "someenv" });
      const config = defaulted({});
      expect(config.ENVIRONMENT).toEqual("someenv");
      expect(Object.keys(config)).toEqual(["ENVIRONMENT"]);
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
  });

});

