import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET ||= "test-secret";

const { default: app } = await import("../src/app.js");

let server;
let baseUrl;

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body && {
        "Content-Type": "application/json",
      }),
      ...options.headers,
    },
  });

  return {
    response,
    body: await response.json(),
  };
};

before(async () => {
  server = app.listen(0);

  await new Promise((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();

  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

describe("HTTP auth and route behavior", () => {
  it("returns the health response without authentication", async () => {
    const { response, body } = await request("/api/health");

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.message, "Student Portal API is running.");
    assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  });

  it("rejects invalid login payloads before hitting the service layer", async () => {
    const { response, body } = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "not-an-email",
        password: "",
      }),
    });

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.message, "Validation failed.");
    assert.ok(body.errors.some((error) => error.field === "body.email"));
    assert.ok(body.errors.some((error) => error.field === "body.password"));
  });

  it("rejects protected routes without a bearer token", async () => {
    const protectedPaths = [
      "/api/auth/me",
      "/api/courses",
      "/api/users",
      "/api/results",
      "/api/announcements",
      "/api/dashboard",
    ];

    for (const path of protectedPaths) {
      const { response, body } = await request(path);

      assert.equal(response.status, 401, path);
      assert.equal(body.success, false, path);
      assert.equal(body.message, "Authentication is required.", path);
    }
  });

  it("rejects malformed bearer tokens", async () => {
    const { response, body } = await request("/api/auth/me", {
      headers: {
        Authorization: "Bearer not-a-jwt",
      },
    });

    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.message, "Invalid authentication token.");
  });
});
