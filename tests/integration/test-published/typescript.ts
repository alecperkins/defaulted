import defaulted from "defaulted";

const config = defaulted({
  ENVIRONMENT: 'local',
  MY_HOST: "example.com",
  PORT: 1234,
}, {
  prod: {
    PORT: 80,
  },
  test: {
    PORT: 8080,
  },
});

const secrets = defaulted.secrets([
  "API_KEY",
  "OTHER_KEY",
] as const, {
  local: {
    API_KEY: "dev_key",
  },
});

if (
  config.MY_HOST !== "example.com"
  || config.PORT !== 8080
  || secrets.API_KEY !== "mock_key"
) {
  process.exit(1);
}

