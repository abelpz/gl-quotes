const config = {
  displayName: "uw-quote-helpers tests",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.{test,spec}.{ts,js}"],

  collectCoverage: true,
  coverageReporters: ["text", "cobertura"],
};

export default config;
