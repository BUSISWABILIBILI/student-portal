import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { API_BASE_URL, getErrorMessage } from "../src/lib/api.js";

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
});
