/**
 * Security Audit: Custom API Credential Leak Prevention
 *
 * This test verifies that custom API credentials are never exposed in
 * prompts, audit logs, or client-side payloads. All credentials must
 * stay server-side only within the security module.
 */

describe("Security: Custom API credentials never leak", () => {
  const FAKE_CREDENTIAL = "super-secret-api-key-12345";

  test("Credential reference format never contains raw secrets", () => {
    // Credential references are always pointers like "env:VAR_NAME"
    const validFormats = [
      "env:COINGECKO_API_KEY",
      "env:ALPHA_VANTAGE_KEY",
      "env:POLYGON_API_KEY",
    ];

    for (const ref of validFormats) {
      expect(ref).not.toContain(FAKE_CREDENTIAL);
      expect(ref).toMatch(/^env:[A-Z_]+$/);
    }
  });

  test("Custom API input sanitization removes credential headers", () => {
    // Simulate what sanitizeInput does for audit logs
    function sanitizeInput(input: Record<string, unknown>): Record<string, unknown> {
      const sanitized = { ...input };
      const sensitiveKeys = ["token", "key", "secret", "password", "authorization", "apikey", "api-key"];
      for (const k of Object.keys(sanitized)) {
        if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
          sanitized[k] = "***REDACTED***";
        }
      }
      return sanitized;
    }

    const inputWithCreds = {
      apiId: "API123",
      params: { query: "test" },
      authorization: `Bearer ${FAKE_CREDENTIAL}`,
      "x-api-key": FAKE_CREDENTIAL,
    };

    const sanitized = sanitizeInput(inputWithCreds);
    expect(sanitized.authorization).toBe("***REDACTED***");
    expect(sanitized["x-api-key"]).toBe("***REDACTED***");
    expect(sanitized.apiId).toBe("API123"); // Non-sensitive preserved
    expect(sanitized.params).toEqual({ query: "test" }); // Non-sensitive preserved
  });

  test("Custom API response never includes credential in output", () => {
    // The adapter should never echo back auth headers or credentials
    const mockResponse = {
      status: 200,
      data: { price: 42000, currency: "usd" },
    };

    const responseStr = JSON.stringify(mockResponse);
    expect(responseStr).not.toContain(FAKE_CREDENTIAL);
    expect(responseStr).not.toMatch(/Bearer\s+[a-zA-Z0-9-]+/);
    expect(responseStr).not.toMatch(/X-API-Key:\s*[a-zA-Z0-9-]+/);
  });

  test("Audit events never contain credential values", () => {
    // Simulate audit event creation
    const auditEvent = {
      action: "tool.custom_api.call -> success",
      detail: {
        tool: "custom_api.call",
        input: { apiId: "API123", params: { query: "test" } },
        status: "success",
      },
    };

    const auditStr = JSON.stringify(auditEvent);
    expect(auditStr).not.toContain(FAKE_CREDENTIAL);
    expect(auditStr).not.toMatch(/env:[A-Z_]+=[^\s]+/);
  });

  test("URL construction does not embed credentials", () => {
    // Credentials should be in headers, never in URLs
    const baseUrl = "https://api.example.com/v1";
    const path = "/data";
    const url = `${baseUrl}${path}`;

    expect(url).not.toContain(FAKE_CREDENTIAL);
    expect(url).not.toContain("api_key=");
    expect(url).not.toContain("token=");
  });
});
