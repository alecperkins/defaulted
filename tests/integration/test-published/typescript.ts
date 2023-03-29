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

if (
  config.MY_HOST !== "example.com"
  || config.PORT !== 8080
) {
  process.exit(1);
}

