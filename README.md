
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

Set up centralized config with defaults that may be overridden by environment variables. The defaults act like a schema. Only keys present in the defaults will be extracted from the environment, and they will be cast to a type matching the type of the default value.

```javascript
const config = defaulted({
  DATABASE_URL: "postgres://localhost:5432/db",
  NEW_FEATURE_ENABLED: true,
  SERVICE_URL: "https://sandbox-api.example.com",
});
```

Read config values:

```javascript
const client = new DBClient(config.DATABASE_URL);

if (config.NEW_FEATURE_ENABLED) {
  console.log("Enabled!");
} else {
  console.log("Not Enabled!");
}

const response = await fetch(config.SERVICE_URL);
```

Override values via env:

```javascript
> NEW_FEATURE_ENABLED=false node main.js
Not Enabled!
```

Trying to access config keys not defined or set any will throw:

```javascript
if (config.OTHER_FEATURE) { // <-- Throws!
config.NEW_FEATURE_ENABLED = false // <-- Throws!
```

### Environment Overrides

`defaulted()` takes one or two arguments: the default values to use if the matching variables are not defined in the environment, and an optional mapping of overrides. These overrides will be selected based on value of the `ENVIRONMENT` variable.

For another example, given this setup:

```javascript
const config = defaulted({
  DATABASE_URL: "postgres://localhost:5432/db",
  MOCK_EMAIL: true,
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: 587,
}, {
  prod: {
    DATABASE_URL: undefined,
    MOCK_EMAIL: false,
  },
  test: {
    MOCK_EMAIL: false,
    SMTP_HOST: "smtp-echo.local"
  },
});
```

If you _do_ want to send email from your local machine, you can disable the mocking just for that "deployment" by starting the server with something like `MOCK_EMAIL=false npm start`. Conversely, a deployment with `ENVIRONMENT=prod` will not mock email by default unless overridden by the environment. The `prod` environment also requires the `DATABASE_URL` be defined, while local dev doesn't need any additional configuration out of the box.


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


### `defaulted.secrets()`

`defaulted` works well for secrets and allows you to provide non-sensitive defaults locally, but set explicitly undefined values for production. This guards against deploying a new instance of an app without mandatory secret config. This is possible with the regular `defaulted`, but gets repetitive. The `defaulted.secrets(…)` function makes this easier by inverting the approach to merging the defaults.

```javascript
const secrets = defaulted.secrets([
  "SESSION_SECRET",
  "SOME_API_KEY",
], {
  local: {
    SESSION_SECRET: "dev-session-secret",
  },
  test: {
    SESSION_SECRET: "test-session-secret",
    SOME_API_KEY: "mocked",
  },
});
```

When calling `defaulted.secrets`, specified keys _do not_ have default values unless defined in the environment overrides, and are required to be provided by env vars. The function will throw if they are not found in `process.env`. This way, local development or tests can have out-of-the-box unsensitive defaults if available, but production _must_ provide the secrets via env variables.

Like regular `defaulted`-based configs, accessing keys not specified in the initial list, trying to set a key, or trying to override an unspecified key will throw. These operations will also fail type checking but make sure the list of keys is marked `as const` for thorough strictness.

```typescript
const secrets = defaulted.secrets([
  "SESSION_SECRET",
  "SOME_API_KEY",
] as const);
```

Note that secret values are passed through as strings. If for some reason you do need Number or Boolean secrets, you can use the regular `defaulted` call and set the env overrides to `undefined` to make them mandatory:

```javascript
const secrets = defaulted({
  SECRET_NUMBER: 4,
}, {
  prod: {
    SECRET_NUMBER: undefined,
  },
});
```
The above will throw in `ENVIRONMENT=prod` if `SECRET_NUMBER` is not in the env.


### FAQ & Best Practices

#### Secrets

A useful way to handle secrets is create an explicit secrets config. This separates secret values from the regular config so they are clearly sensitive and it's easy to trace which code uses them.

```javascript
const config = defaulted({
  SOME_API_URL: "https://sandbox-api.example.com",
}, {
  prod: {
    SOME_API_URL: "https://api.example.com",
  },
});

const secrets = defaulted.secrets([
  "DATABASE_URL",
  "SOME_API_KEY",
], {
  local: {
    DATABASE_URL: "postgres://localhost:5432/db",
    SOME_API_KEY: "sandbox12345",
  },
  test: {
    SOME_API_KEY: "mocked",
  },
  stag: {
    SOME_API_KEY: "sandbox12345",
  },
  prod: {
  },
});

export default config;
export { secrets };
```

With this setup, it’s easy to trace the usage of any particular config, and especially the secrets:

```javascript
import config, { secrets } from "./config";
import APIClient from "some-api";

export function getAPIClient () {
  return new APIClient(config.SOME_API_URL, {
    token: secrets.SOME_API_KEY,
  });
}
```


#### ENVIRONMENT names

Name the `ENVIRONMENTS` by their primary functional difference, rather than a specific stage, app, or instance names. Some suggestions:
- `"prod"` is for live production instances, ones where it _matters_ when things go wrong
- `"dev"` is any non-production deployment, be it Staging, QA, UAT, SIT, or any other name or acronym, potentially even locally on a developer machine (there could be any number of deployments or stages in a pipeline using this `ENVIRONMENT`)
- `"test"` is any CI or similar test context that needs specific changes for mocking or instrumentation
- `"local"` is a good alternative to `"dev"` when perhaps certain infrastructure pieces like queues need to be simulated

If there are more than a few `ENVIRONMENT`s, that’s a hint the config needs a simplification pass. Likewise if each environment needs to set a lot of variables, reconsider how different the environments need to be from each other.

Note that different deployments can share an `ENVIRONMENT` but set different values in their specific instance. The `EVIRONMENT` is just a label that selects a set of config defaults and expectations as defined in the code.


#### 12 Factor Config

> I thought the 12 Factor App said to store [config](https://12factor.net/config) in the environment.

It does, and it’s right! `defaulted` is more precisely a way to manage the _defaults_, and ensure consistency. It seeks a balance between the purity of env-based config with the practicality of consistent groupings with centralized declarative defaults.

In practice, unless you’re always doing it live there usually are at least two classes of config: production and non-production. External tools can help manage this, but apps should own their expectations of configuration while allowing for explicit overrides on a per-deployment basis.


#### Why not NODE_ENV?

Apps and tooling have different interpretations of `NODE_ENV`, some only allowing specific values. The consensus seems to be it refers to a build-time _performance_ configuration rather than a deployment context. When `NODE_ENV=production`, bundles are minified, debug instrumentation disabled, dev dependencies omitted etc. Those changes are important for production, but they’re also valuable for any non-prod environment where you want to test code that is as close to the actual prod version as possible. They’re also necessary to practice stateless builds that can be promoted to production. Besides, `NODE_ENV` is node-specific, whereas `ENVIRONMENT` does not imply a particular technology, so other services can respond to it without confusion.


#### Nesting or lists

Storing more complex values in the env beyond a singular token is not recommended. However, you are free to use regular strings for that and parse them yourself. `defaulted` doesn’t support validating such values because the schemas quickly become complicated or app/technology-specific, and are better handled by the app itself if they are absolutely necessary. Odds are they are better suited as data rather than config.


#### Key names

To maximize compatibility, and reinforce the notion that these values should be constant for the life of the process, use uppercase with underscores, eg `FEATURE_FLAG`.

Any valid object property name is allowed for defaults. This includes mixed cases, spaces, and non-alphanumeric characters. That said, spaces are disallowed in most [POSIX environments](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap08.html), and some even disallow lowercase. Others are case-insensitive. Even if there is a default defined, the app may not be able to read `some key` from the environment.

#### Client-side

`defaulted` does not work in the browser. It requires a `process.env` global to read from. This avoids shipping all the dev and test configs in a prod .js bundle, or making a stateful build that needs to be recompiled for every ENVIRONMENT and obviating the whole point of this library.

To facilitate passing the config as a whole to the client, a worker or a subprocess, or some other context that needs JSON-serializable values, non-secret configs support `toJSON`.

For example, given this config:

```javascript
const config = defaulted({
  FEATURE_ENABLED: true
}, {
  prod: {
    FEATURE_ENABLED: false
  }
});
```

…and this template…

```javascript
const myPage = _.template(`
<h1>{{ context_val }}</h1>
<script type="text/json" id="config">
  {{config}}
</script>
<script>
  const config = JSON.parse(document.getElementById("config").innerHTML);
  if (config.FEATURE_ENABLED) {
    console.log('feature!')
  } else {
    console.log('no feature);
  }
</script>
`);

const markup = myPage({
  context_val: "abc",
  config: JSON.stringify(config),
});
```

…this markup will be produced when `ENVIRONMENT=prod`:

```html
<h1>abc</h1>
<script type="text/json" id="config">
  {"FEATURE_ENABLED":false}
</script>
<script>
  const config = JSON.parse(document.getElementById("config").innerHTML);
  if (config.FEATURE_ENABLED) {
    console.log('feature!')
  } else {
    console.log('no feature);
  }
</script>
```

Note that a config defined through `secrets()` will NOT allow itself to be serialized to JSON directly. You must copy each value out individually into a new object for serialization, if for some reason you need to pass secrets around in JSON.


## Author

[Alec Perkins](https://alecperkins.net)



## License

This package is licensed under the [MIT License](https://opensource.org/licenses/MIT).

See `./LICENSE` for more information.
