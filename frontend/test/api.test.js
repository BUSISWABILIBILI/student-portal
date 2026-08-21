import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ACCESS_TOKEN_KEY,
  API_BASE_URL,
  SESSION_EXPIRED_EVENT,
  getErrorMessage,
  handleUnauthorizedError,
} from "../src/lib/api.js";

const withMockWindow = async (task) => {
  const previousWindow = globalThis.window;

  try {
    return await task();
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
};

describe("frontend API helpers", () => {
  it("uses the local API base URL when Vite configuration is absent", () => {
    assert.equal(API_BASE_URL, "http://localhost:5000/api");
  });

  it("returns backend validation details with readable field names", () => {
    const message = getErrorMessage({
      response: {
        data: {
          message: "Validation failed.",
          errors: [
            {
              field: "body.email",
              message: "Enter a valid email address.",
            },
            {
              field: "body.newPassword",
              message: "Password must include a number.",
            },
          ],
        },
      },
    });

    assert.equal(
      message,
      [
        "Validation failed.",
        "email: Enter a valid email address.",
        "new password: Password must include a number.",
      ].join(" "),
    );
  });

  it("falls back to API and network error messages", () => {
    assert.equal(
      getErrorMessage({
        response: {
          data: {
            message: "Authentication is required.",
          },
        },
      }),
      "Authentication is required.",
    );

    assert.equal(
      getErrorMessage({
        message: "Network Error",
      }),
      "Network Error",
    );

    assert.equal(getErrorMessage({}), "The request could not be completed.");
  });

  it("clears stored sessions and announces unauthorized API responses", async () => {
    await withMockWindow(async () => {
      const storedValues = new Map([[ACCESS_TOKEN_KEY, "expired-token"]]);
      const dispatchedEvents = [];

      globalThis.window = {
        dispatchEvent(event) {
          dispatchedEvents.push(event.type);
        },
        localStorage: {
          getItem(key) {
            return storedValues.get(key) || null;
          },
          removeItem(key) {
            storedValues.delete(key);
          },
        },
      };

      await assert.rejects(
        handleUnauthorizedError({
          response: {
            status: 401,
          },
        }),
        (error) => error.response.status === 401,
      );

      assert.equal(storedValues.has(ACCESS_TOKEN_KEY), false);
      assert.deepEqual(dispatchedEvents, [SESSION_EXPIRED_EVENT]);
    });
  });

  it("leaves stored sessions alone for non-auth API failures", async () => {
    await withMockWindow(async () => {
      const storedValues = new Map([[ACCESS_TOKEN_KEY, "active-token"]]);
      const dispatchedEvents = [];

      globalThis.window = {
        dispatchEvent(event) {
          dispatchedEvents.push(event.type);
        },
        localStorage: {
          getItem(key) {
            return storedValues.get(key) || null;
          },
          removeItem(key) {
            storedValues.delete(key);
          },
        },
      };

      await assert.rejects(
        handleUnauthorizedError({
          response: {
            status: 500,
          },
        }),
        (error) => error.response.status === 500,
      );

      assert.equal(storedValues.get(ACCESS_TOKEN_KEY), "active-token");
      assert.deepEqual(dispatchedEvents, []);
    });
  });
});
