
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

