
import { describe, expect, test } from "vitest";

import conf from '../src';

function overrideEnv (obj: { [key: string]: string }) {
  const orig = { ...process.env };
  Object.assign(process.env, obj);
  return () => {
    Object.keys(obj).forEach((key) => {
      delete process.env[key];
    });
    Object.assign(process.env, orig);
  };
}

describe("conf", () => {

  test("passes strings through", async () => {
    const config = conf({ MYVAL: "testing" });
    expect(config.MYVAL).toEqual("testing");
  });

  test("doesn't read unspecified keys", async () => {
    const config = conf({ MYVAL: "testing" });
    expect(Object.keys(config)).toEqual(
      expect.arrayContaining(["ENVIRONMENT", "MYVAL"])
    );
  });

  test("casts numbers", async () => {
    const reset = overrideEnv({ MYVAL: "456" });
    const config = conf({ MYVAL: 345 });
    expect(config.MYVAL).toEqual(456);
    reset();
  });

  test("casts non-numbers", async () => {
    const reset = overrideEnv({ MYVAL: "abc" });
    const config = conf({ MYVAL: 345 });
    expect(config.MYVAL).toEqual(NaN);
    reset();
  });

  test("doesn't convert numbers when not originally boolean", async () => {
    const reset = overrideEnv({ MYVAL: "2" });
    const config = conf({ MYVAL: "asdf" });
    expect(config.MYVAL).not.toEqual(2);
    reset();
  });

  test("doesn't convert booleans when not originally boolean", async () => {
    const reset = overrideEnv({ MYVAL: "true" });
    const config = conf({ MYVAL: "asdf" });
    expect(config.MYVAL).not.toEqual(true);
    reset();
  });

  test("casts json booleans", async () => {
    const reset = overrideEnv({ MYVAL: "true" });
    const config = conf({ MYVAL: false });
    expect(config.MYVAL).toEqual(true);
    reset();
  });

  test("casts capitalized booleans", async () => {
    const reset = overrideEnv({ MYVAL: "True" });
    const config = conf({ MYVAL: false });
    expect(config.MYVAL).toEqual(true);
    reset();
  });

  test("casts 0 booleans", async () => {
    const reset = overrideEnv({ MYVAL: "0" });
    const config = conf({ MYVAL: true });
    expect(config.MYVAL).toEqual(false);
    reset();
  });

  test("casts 1 booleans", async () => {
    const reset = overrideEnv({ MYVAL: "1" });
    const config = conf({ MYVAL: false });
    expect(config.MYVAL).toEqual(true);
    reset();
  });

  test("reads from environment", async () => {
    const reset = overrideEnv({ MYVAL: "different" });
    const config = conf({ MYVAL: "testing" });
    expect(config.MYVAL).toEqual("different");
    reset();
  });

  test("reads from environment despite ENVIRONMENT", async () => {
    const reset = overrideEnv({
      ENVIRONMENT: "test",
      MYVAL: "different",
    });
    const config = conf({
      MYVAL: "testing",
    }, {
      test: {
        MYVAL: "test override",
      },
    });
    expect(config.MYVAL).toEqual("different");
    reset();
  });

  test("switches defaults on ENVIRONMENT", async () => {
    const reset = overrideEnv({
      ENVIRONMENT: "test",
    });
    const config = conf({
      MYVAL: "testing",
    }, {
      test: {
        MYVAL: "test override",
      },
    });
    expect(config.MYVAL).toEqual("test override");
    reset();
  });

});

