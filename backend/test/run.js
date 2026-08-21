import "dotenv/config";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET ||= "test-secret";

await import("./smoke.test.js");
await import("./http-auth.test.js");
await import("./result-calculation.test.js");
