
# defaulted

[![npm package](https://img.shields.io/npm/v/defaulted)](https://www.npmjs.com/package/defaulted) [![typescript](https://img.shields.io/npm/types/defaulted)](https://github.com/alecperkins/defaulted) [![MIT license](https://img.shields.io/npm/l/defaulted)](https://github.com/alecperkins/defaulted/blob/main/LICENSE) [![test status](https://github.com/alecperkins/defaulted/actions/workflows/test.yml/badge.svg)](https://github.com/alecperkins/defaulted/actions/workflows/test.yml)


`defaulted()` constructs a configuration object from given default values and the [process environment](https://nodejs.dev/en/learn/how-to-read-environment-variables-from-nodejs/). It allows for defining sets of defaults for different capital-E `ENVIRONMENT`s. Keys and values are typed and validated. The config will fail loudly if you forget to define a value and try to use it, or set a defined value to the wrong type. The environment groups are useful for ensuring certain configs are always set a certain way, or must always be defined, for particular deployment contexts.



## Installation

`npm install defaulted`

and include as a JavaScript or TypeScript module (types included):

```typescript
import defaulted from "defaulted";
```

…or a CommonJS module:

```javascript
const defaulted = require("defaulted");
```



## Usage

```javascript
const config = defaulted(
  {
    FEATURE_ENABLED: true,
    SERVICE_URL: "https://sandbox-api.example.com",
  },
  {
    test: {
      FEATURE_ENABLED: false,
    },
    prod: {
      FEATURE_ENABLED: false,
      SERVICE_URL: "https://api.example.com",
    },
  }
);
```

`defaulted()` takes one or two arguments: the default values to use if the matching variables are not defined in the environment, and an optional mapping of values to overrides. The defaults act like a schema. Only keys present in the defaults will be extracted from the environment, and they will be cast to a type matching the type of the default value.

Given this setup:

```javascript
const config = defaulted({
  MOCK_EMAIL: true,
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: 587,
}, {
  prod: {
    MOCK_EMAIL: false,
  },
  test: {
    MOCK_EMAIL: false,
    SMTP_HOST: "smtp-echo.local"
  },
});
```

You can then access the config values like a plain object. For example:

```javascript
function sendEmail (…) {
  if (config.MOCK_EMAIL) {
    return MOCK_EMAIL_RESPONSE;
  }
  return EmailService.send(…);
}
```

In this example, if you _do_ want to send email from your local machine, you can disable the mocking just for that "deployment" by starting the server with something like `MOCK_EMAIL=false npm start`. Conversely, a deployment with `ENVIRONMENT=prod` will not mock email by default unless the overridden by the environment.


### Validation

`defaulted` attempts to be strict about the keys and values, to avoid issues from failing to define a necessary value or inconsistencies from modifying the values after boot.

The resulting config object will have explicit keys matching the default, to aide with type checking and autocomplete. Attempting to access a key that was not specified will throw. Those keys will also be read-only, and will likewise throw on assignment. (Doing either will also fail type checking.)

If the environment specifies a value that cannot be cast to the type, `defaulted` will throw. See below for specifics on acceptable values.

#### Empty strings

If the default type is a string, empty strings will be allowed in the environment. For numbers and booleans, empty strings present will cause `defaulted` to throw. These keys in the environment must be set to a non-empty value, or [unset](https://man7.org/linux/man-pages/man1/unset.1p.html).

#### Numbers

Keys with `number`-type defaults must be numeric in the environment if present. Any value that results in `NaN` when converted will throw. Integers, floats, hexadecimal, binary, and exponential are [allowed](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number).

Note that `process.env` provides strings only, so the casting behavior of `Number` might not work as expected. Given `VAL=true`, `Number(process.env.VAL)` will produce `NaN` rather than `1` the way `Number(true)` does. For this reason, `defaulted` will throw instead.

#### Booleans

Booleans must be specified in the environment using the words `"true"` or `"false"`, in any capitalization, or the numbers `"1"` or `"0"`. Any other value will throw if the default is expecting a boolean. Note that, like with numbers, this different than `Boolean()` casting since `process.env` only provides strings.


### Secrets

`defaulted` works well for secrets and allows you to provide non-sensitive defaults locally but set explicitly undefined values for production, guarding against deploying a new instance of an app without mandatory config. There also is no limit to the number of config objects that can be created. This allows for separating secret values from the regular config so they are clearly sensitive and it's easy to trace which code uses them.

For values that are not mocked by default, but mocked in tests, you can use the per-environment defaults to have live values locally and mock values in test.

For example, this config sets `SOME_SERVICE_API_KEY` to an insensitive default for an external service’s sandbox environment while requiring the production deployment context to define it. It also requires that staging and production environments define a `DATABASE_URL`, and gives tests explicitly mocked secrets.

```javascript
const config = defaulted(…);

const secrets = defaulted({
  DATABASE_URL: "postgres://localhost:5432/db",
  SMTP_USERNAME: "",
  SMTP_PASSWORD: "",
  SOME_SERVICE_API_KEY: "sandbox12345",
}, {
  test: {
    SMTP_USERNAME: "mockuser",
    SMTP_PASSWORD: "mockpass",
  },
  stag: {
    DATABASE_URL: undefined,
  },
  prod: {
    DATABASE_URL: undefined,
    SOME_SERVICE_API_KEY: undefined,
  },
});

export default config;
export { secrets };
```


### FAQ & Best Practices


#### ENVIRONMENT names

Name the `ENVIRONMENTS` by their primary functional difference, rather than a specific stage, app, or instance names. Some suggestions:
- `"prod"` is for live production instances, ones where it _matters_ when things go wrong
- `"dev"` is any non-production deployment, be it Staging, QA, UAT, SIT, or any other name or acronym, potentially even locally on a developer machine
  - There could be several deployments or stages in a pipeline that all use `"dev"`
- `"test"` is any CI or similar test context that has needs specific changes for automation or instrumentation
- `"local"` is a good alternative to `"dev"` when perhaps certain infrastructure pieces like queues need to be simulated for convenience

Often you won’t need explicit local defaults, so if there are more than three, that is a hint the config needs a simplification pass. Likewise if each environment needs to set a lot of variables, reconsider how different the environments need to be from each other.


#### 12 Factor Config

> I thought the 12 Factor App said to store [config](https://12factor.net/config) in the environment.

It does, and it’s right! But taken to a dogmatic extreme, putting everything entirely into the environment makes consistency difficult and the app becomes _too_ sensitive to its deployed context. In practice, there usually are distinct categories of environments. Apps should own their expectations of configuration while allowing for explicit overrides on a per-deployment basis. `defaulted` seeks a balance between the purity of `env`-based config with the practicality of consistent groupings, and centralizes the definition with declarative defaults. Ideally, an app requires zero environment variables to be run locally for development. The config still ultimately lives in the environment, but `defaulted` can simplify establishment of the default values.

For example, if you add a new set of features behind a flag purely in the environment, you have to update every context the app is deployed in to test it out—even if it's a benign-enough feature that it should be available in staging by default. Also, you want other developers to be seeing the latest config of the app while working on it, and know if their own changes are going to conflict. Some configs like feature flags are closely coupled to the code, and the most appropriate default value can change depending on the state of the code, so that default should be declared and versioned alongside it.

In another example, certain external services may not have sandbox versions, or are risky to run in non-prod contexts. Or there are sandbox versions but they are not accessible for local dev so local needs to default to mocks — but those services must default to not-mocked in prod. Or you _never_ want to send real emails or texts in test contexts and blow your SMS budget. `defaulted` allows you explicitly set configs for certain contexts, and then override on a per-deploy basis. It also provides a layer of validation, to prevent the app from running with required config.


#### Why not NODE_ENV?

> Why not NODE_ENV?

Apps and tooling have different interpretations of `NODE_ENV`, some only allowing specific values. The consensus seems to be it refers to a _build_ or _performance_ configuration rather than a precise deployment context. When `NODE_ENV=production`, bundles are minified, debug instrumentation disabled, etc. Those changes are important for production, but all those are also valuable for any non-prod environment where you want to test code that is as close to the actual prod version as possible. They’re also necessary to practice stateless builds that can be promoted to production. Besides, `NODE_ENV` is node-specific, whereas `ENVIRONMENT` does not imply a particular technology, so other services can respond to it without confusion.


#### Nesting or lists

Storing more complex values in the env beyond a singular token is not recommended. However, you are free to use regular strings for that and parse them yourself. `defaulted` doesn’t support validating such values because the schemas quickly become complicated or app-/technology-specific, and are better handled by the app itself.


#### Key names

Any valid object property name is allowed for defaults. This includes mixed cases, spaces, and non-alphanumeric characters. That said, spaces are disallowed in most [POSIX environments](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap08.html), and some even disallow lowercase. Others are case-insensitive. Even if there is a default defined, the app may not be able to read `some key` from the environment. To maximize compatibility, and reinforce the notion that these values should be constant for the life of the process, use uppercase with underscores, eg `FEATURE_FLAG`.



## Author

[Alec Perkins](https://alecperkins.net)



## License

This package is licensed under the [MIT License](https://opensource.org/licenses/MIT).

See `./LICENSE` for more information.
