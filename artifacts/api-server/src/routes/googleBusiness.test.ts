import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

const { configStore, fetchResponses, getTokenImpl } = vi.hoisted(() => {
  const configStore = new Map<string, string>();

  const fetchResponses: {
    accounts: Array<{ name: string; accountName?: string }>;
    locations: Array<{ name: string; title?: string }>;
  } = {
    accounts: [],
    locations: [],
  };

  const getTokenImpl = {
    fn: async (_code: string) => ({
      tokens: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expiry_date: Date.now() + 3600_000,
      },
    }),
  };

  return { configStore, fetchResponses, getTokenImpl };
});

vi.mock("drizzle-orm", () => ({
  eq: (_col: unknown, val: string) => ({ _val: val }),
}));

vi.mock("@workspace/db/schema", () => ({
  siteConfigTable: { key: "key", value: "value", updatedAt: "updatedAt" },
}));

vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({
      from: (_table: unknown) => ({
        where: (cond: { _val: string }) => ({
          limit: async (_n: number) => {
            const val = configStore.get(cond._val);
            return val !== undefined ? [{ key: cond._val, value: val }] : [];
          },
        }),
      }),
    }),
    update: (_table: unknown) => ({
      set: (data: { value: string }) => ({
        where: async (cond: { _val: string }) => {
          configStore.set(cond._val, data.value);
        },
      }),
    }),
    delete: (_table: unknown) => ({
      where: async (cond: { _val: string }) => {
        configStore.delete(cond._val);
      },
    }),
    insert: (_table: unknown) => ({
      values: async (data: { key: string; value: string }) => {
        configStore.set(data.key, data.value);
      },
    }),
  },
  siteConfigTable: { key: "key", value: "value", updatedAt: "updatedAt" },
}));

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: function OAuth2Mock() {
        return {
          generateAuthUrl: () => "https://accounts.google.com/o/oauth2/auth",
          getToken: async (code: string) => getTokenImpl.fn(code),
          setCredentials: () => {},
          refreshAccessToken: async () => ({
            credentials: { access_token: "refreshed-token", expiry_date: Date.now() + 3600_000 },
          }),
        };
      },
    },
  },
}));

vi.mock("../middlewares/auth", () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("../lib/encryption", () => ({
  encrypt: (v: string) => v,
  decrypt: (v: string) => v,
  isEncrypted: () => false,
}));

import googleBusinessRouter from "./googleBusiness";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", googleBusinessRouter);
  return app;
}

const STATE = "test-state-uuid";
const EXPIRY_FAR_FUTURE = Date.now() + 10 * 60 * 1000;

beforeEach(() => {
  configStore.clear();
  fetchResponses.accounts = [];
  fetchResponses.locations = [];

  getTokenImpl.fn = async () => ({
    tokens: {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      expiry_date: Date.now() + 3600_000,
    },
  });

  process.env["GOOGLE_CLIENT_ID"] = "test-client-id";
  process.env["GOOGLE_CLIENT_SECRET"] = "test-client-secret";
  process.env["GOOGLE_REDIRECT_URI"] = "https://example.com/api/google/business/oauth-callback";
  process.env["DASHBOARD_URL"] = "";

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("mybusinessaccountmanagement.googleapis.com")) {
        return {
          ok: true,
          json: async () => ({ accounts: fetchResponses.accounts }),
        } as Response;
      }
      if (urlStr.includes("mybusinessbusinessinformation.googleapis.com")) {
        return {
          ok: true,
          json: async () => ({ locations: fetchResponses.locations }),
        } as Response;
      }
      return { ok: false, status: 404, text: async () => "Not found" } as unknown as Response;
    }),
  );
});

describe("OAuth callback — account-change clears saved location", () => {
  it("redirects to needs_location when the returned account differs from the saved one", async () => {
    configStore.set("gbOAuthState", `${STATE}:${EXPIRY_FAR_FUTURE}`);
    configStore.set("gbAccountName", "accounts/OLD_ACCOUNT");
    configStore.set("gbAccountDisplayName", "Old Account");
    configStore.set("gbLocationName", "accounts/OLD_ACCOUNT/locations/loc1");
    configStore.set("gbLocationDisplayName", "Old Location");

    fetchResponses.accounts = [{ name: "accounts/NEW_ACCOUNT", accountName: "New Account" }];
    fetchResponses.locations = [
      { name: "accounts/NEW_ACCOUNT/locations/loc_a", title: "Branch A" },
      { name: "accounts/NEW_ACCOUNT/locations/loc_b", title: "Branch B" },
    ];

    const app = buildApp();
    const res = await request(app)
      .get(`/api/google/business/oauth-callback?code=test-code&state=${STATE}`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers["location"]).toContain("needs_location=1");
    expect(res.headers["location"]).toContain("connected=1");

    expect(configStore.get("gbAccountName")).toBe("accounts/NEW_ACCOUNT");
    expect(configStore.has("gbLocationName")).toBe(false);
    expect(configStore.has("gbLocationDisplayName")).toBe(false);
  });

  it("auto-selects the saved location when the returned account is the same", async () => {
    configStore.set("gbOAuthState", `${STATE}:${EXPIRY_FAR_FUTURE}`);
    configStore.set("gbAccountName", "accounts/SAME_ACCOUNT");
    configStore.set("gbAccountDisplayName", "Same Account");
    configStore.set("gbLocationName", "accounts/SAME_ACCOUNT/locations/loc1");
    configStore.set("gbLocationDisplayName", "Main Location");

    fetchResponses.accounts = [{ name: "accounts/SAME_ACCOUNT", accountName: "Same Account" }];
    fetchResponses.locations = [
      { name: "accounts/SAME_ACCOUNT/locations/loc1", title: "Main Location" },
      { name: "accounts/SAME_ACCOUNT/locations/loc2", title: "Branch" },
    ];

    const app = buildApp();
    const res = await request(app)
      .get(`/api/google/business/oauth-callback?code=test-code&state=${STATE}`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers["location"]).toContain("connected=1");
    expect(res.headers["location"]).not.toContain("needs_location");

    expect(configStore.get("gbAccountName")).toBe("accounts/SAME_ACCOUNT");
    expect(configStore.get("gbLocationName")).toBe("accounts/SAME_ACCOUNT/locations/loc1");
  });

  it("clears a previously saved location when the single returned account now has zero locations", async () => {
    configStore.set("gbOAuthState", `${STATE}:${EXPIRY_FAR_FUTURE}`);
    configStore.set("gbAccountName", "accounts/SAME_ACCOUNT");
    configStore.set("gbAccountDisplayName", "Same Account");
    configStore.set("gbLocationName", "accounts/SAME_ACCOUNT/locations/stale-loc");
    configStore.set("gbLocationDisplayName", "Stale Location");

    fetchResponses.accounts = [{ name: "accounts/SAME_ACCOUNT", accountName: "Same Account" }];
    fetchResponses.locations = [];

    const app = buildApp();
    const res = await request(app)
      .get(`/api/google/business/oauth-callback?code=test-code&state=${STATE}`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers["location"]).toContain("connected=1");
    expect(res.headers["location"]).not.toContain("needs_location");

    expect(configStore.get("gbAccountName")).toBe("accounts/SAME_ACCOUNT");
    expect(configStore.get("gbAccountDisplayName")).toBe("Same Account");
    expect(configStore.has("gbLocationName")).toBe(false);
    expect(configStore.has("gbLocationDisplayName")).toBe(false);
  });
});

describe("OAuth callback — accounts API throws", () => {
  it("clears all stale account and location data and redirects with needs_account when accounts API throws", async () => {
    configStore.set("gbOAuthState", `${STATE}:${EXPIRY_FAR_FUTURE}`);
    configStore.set("gbAccountName", "accounts/OLD_ACCOUNT");
    configStore.set("gbAccountDisplayName", "Old Account");
    configStore.set("gbLocationName", "accounts/OLD_ACCOUNT/locations/loc1");
    configStore.set("gbLocationDisplayName", "Old Location");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes("mybusinessaccountmanagement.googleapis.com")) {
          throw new Error("Network error: accounts API unreachable");
        }
        return { ok: false, status: 404, text: async () => "Not found" } as unknown as Response;
      }),
    );

    const app = buildApp();
    const res = await request(app)
      .get(`/api/google/business/oauth-callback?code=test-code&state=${STATE}`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers["location"]).toContain("connected=1");
    expect(res.headers["location"]).toContain("needs_account=1");

    expect(configStore.has("gbAccountName")).toBe(false);
    expect(configStore.has("gbAccountDisplayName")).toBe(false);
    expect(configStore.has("gbLocationName")).toBe(false);
    expect(configStore.has("gbLocationDisplayName")).toBe(false);
  });
});

describe("OAuth callback — multi-account branch (accounts.length > 1)", () => {
  it("clears account and location and redirects with needs_account=1 when no account matches the saved one", async () => {
    configStore.set("gbOAuthState", `${STATE}:${EXPIRY_FAR_FUTURE}`);
    configStore.set("gbAccountName", "accounts/OLD_ACCOUNT");
    configStore.set("gbAccountDisplayName", "Old Account");
    configStore.set("gbLocationName", "accounts/OLD_ACCOUNT/locations/loc1");
    configStore.set("gbLocationDisplayName", "Old Location");

    fetchResponses.accounts = [
      { name: "accounts/ACCOUNT_A", accountName: "Account A" },
      { name: "accounts/ACCOUNT_B", accountName: "Account B" },
    ];

    const app = buildApp();
    const res = await request(app)
      .get(`/api/google/business/oauth-callback?code=test-code&state=${STATE}`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers["location"]).toContain("connected=1");
    expect(res.headers["location"]).toContain("needs_account=1");

    expect(configStore.has("gbAccountName")).toBe(false);
    expect(configStore.has("gbAccountDisplayName")).toBe(false);
    expect(configStore.has("gbLocationName")).toBe(false);
    expect(configStore.has("gbLocationDisplayName")).toBe(false);
  });

  it("auto-reselects the saved account and location when both match", async () => {
    configStore.set("gbOAuthState", `${STATE}:${EXPIRY_FAR_FUTURE}`);
    configStore.set("gbAccountName", "accounts/ACCOUNT_A");
    configStore.set("gbAccountDisplayName", "Account A");
    configStore.set("gbLocationName", "accounts/ACCOUNT_A/locations/loc1");
    configStore.set("gbLocationDisplayName", "Main Location");

    fetchResponses.accounts = [
      { name: "accounts/ACCOUNT_A", accountName: "Account A" },
      { name: "accounts/ACCOUNT_B", accountName: "Account B" },
    ];
    fetchResponses.locations = [
      { name: "accounts/ACCOUNT_A/locations/loc1", title: "Main Location" },
      { name: "accounts/ACCOUNT_A/locations/loc2", title: "Branch" },
    ];

    const app = buildApp();
    const res = await request(app)
      .get(`/api/google/business/oauth-callback?code=test-code&state=${STATE}`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers["location"]).toContain("connected=1");
    expect(res.headers["location"]).not.toContain("needs_account");
    expect(res.headers["location"]).not.toContain("needs_location");

    expect(configStore.get("gbAccountName")).toBe("accounts/ACCOUNT_A");
    expect(configStore.get("gbAccountDisplayName")).toBe("Account A");
    expect(configStore.get("gbLocationName")).toBe("accounts/ACCOUNT_A/locations/loc1");
    expect(configStore.get("gbLocationDisplayName")).toBe("Main Location");
  });

  it("clears location and redirects with needs_location=1 when account matches but saved location is gone", async () => {
    configStore.set("gbOAuthState", `${STATE}:${EXPIRY_FAR_FUTURE}`);
    configStore.set("gbAccountName", "accounts/ACCOUNT_A");
    configStore.set("gbAccountDisplayName", "Account A");
    configStore.set("gbLocationName", "accounts/ACCOUNT_A/locations/deleted-loc");
    configStore.set("gbLocationDisplayName", "Deleted Location");

    fetchResponses.accounts = [
      { name: "accounts/ACCOUNT_A", accountName: "Account A" },
      { name: "accounts/ACCOUNT_B", accountName: "Account B" },
    ];
    fetchResponses.locations = [
      { name: "accounts/ACCOUNT_A/locations/loc1", title: "Location One" },
      { name: "accounts/ACCOUNT_A/locations/loc2", title: "Location Two" },
    ];

    const app = buildApp();
    const res = await request(app)
      .get(`/api/google/business/oauth-callback?code=test-code&state=${STATE}`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers["location"]).toContain("connected=1");
    expect(res.headers["location"]).toContain("needs_location=1");

    expect(configStore.get("gbAccountName")).toBe("accounts/ACCOUNT_A");
    expect(configStore.get("gbAccountDisplayName")).toBe("Account A");
    expect(configStore.has("gbLocationName")).toBe(false);
    expect(configStore.has("gbLocationDisplayName")).toBe(false);
  });

  it("auto-selects the single location when the matched account has exactly one location", async () => {
    configStore.set("gbOAuthState", `${STATE}:${EXPIRY_FAR_FUTURE}`);
    configStore.set("gbAccountName", "accounts/ACCOUNT_A");
    configStore.set("gbAccountDisplayName", "Account A");

    fetchResponses.accounts = [
      { name: "accounts/ACCOUNT_A", accountName: "Account A" },
      { name: "accounts/ACCOUNT_B", accountName: "Account B" },
    ];
    fetchResponses.locations = [
      { name: "accounts/ACCOUNT_A/locations/only-loc", title: "Only Location" },
    ];

    const app = buildApp();
    const res = await request(app)
      .get(`/api/google/business/oauth-callback?code=test-code&state=${STATE}`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers["location"]).toContain("connected=1");
    expect(res.headers["location"]).not.toContain("needs_account");
    expect(res.headers["location"]).not.toContain("needs_location");

    expect(configStore.get("gbAccountName")).toBe("accounts/ACCOUNT_A");
    expect(configStore.get("gbAccountDisplayName")).toBe("Account A");
    expect(configStore.get("gbLocationName")).toBe("accounts/ACCOUNT_A/locations/only-loc");
    expect(configStore.get("gbLocationDisplayName")).toBe("Only Location");
  });

  it("redirects with connected=1 and no needs_location when the matched account returns zero locations", async () => {
    configStore.set("gbOAuthState", `${STATE}:${EXPIRY_FAR_FUTURE}`);
    configStore.set("gbAccountName", "accounts/ACCOUNT_A");
    configStore.set("gbAccountDisplayName", "Account A");

    fetchResponses.accounts = [
      { name: "accounts/ACCOUNT_A", accountName: "Account A" },
      { name: "accounts/ACCOUNT_B", accountName: "Account B" },
    ];
    fetchResponses.locations = [];

    const app = buildApp();
    const res = await request(app)
      .get(`/api/google/business/oauth-callback?code=test-code&state=${STATE}`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers["location"]).toContain("connected=1");
    expect(res.headers["location"]).not.toContain("needs_location");

    expect(configStore.get("gbAccountName")).toBe("accounts/ACCOUNT_A");
    expect(configStore.get("gbAccountDisplayName")).toBe("Account A");
    expect(configStore.has("gbLocationName")).toBe(false);
    expect(configStore.has("gbLocationDisplayName")).toBe(false);
  });

  it("clears a previously saved location when the matched account now returns zero locations", async () => {
    configStore.set("gbOAuthState", `${STATE}:${EXPIRY_FAR_FUTURE}`);
    configStore.set("gbAccountName", "accounts/ACCOUNT_A");
    configStore.set("gbAccountDisplayName", "Account A");
    configStore.set("gbLocationName", "accounts/ACCOUNT_A/locations/stale-loc");
    configStore.set("gbLocationDisplayName", "Stale Location");

    fetchResponses.accounts = [
      { name: "accounts/ACCOUNT_A", accountName: "Account A" },
      { name: "accounts/ACCOUNT_B", accountName: "Account B" },
    ];
    fetchResponses.locations = [];

    const app = buildApp();
    const res = await request(app)
      .get(`/api/google/business/oauth-callback?code=test-code&state=${STATE}`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers["location"]).toContain("connected=1");
    expect(res.headers["location"]).not.toContain("needs_location");

    expect(configStore.get("gbAccountName")).toBe("accounts/ACCOUNT_A");
    expect(configStore.get("gbAccountDisplayName")).toBe("Account A");
    expect(configStore.has("gbLocationName")).toBe(false);
    expect(configStore.has("gbLocationDisplayName")).toBe(false);
  });
});

describe("OAuth callback — location API throws clears stale location", () => {
  it("single-account branch: clears saved location when location fetch throws", async () => {
    configStore.set("gbOAuthState", `${STATE}:${EXPIRY_FAR_FUTURE}`);
    configStore.set("gbAccountName", "accounts/SAME_ACCOUNT");
    configStore.set("gbAccountDisplayName", "Same Account");
    configStore.set("gbLocationName", "accounts/SAME_ACCOUNT/locations/stale-loc");
    configStore.set("gbLocationDisplayName", "Stale Location");

    fetchResponses.accounts = [{ name: "accounts/SAME_ACCOUNT", accountName: "Same Account" }];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes("mybusinessaccountmanagement.googleapis.com")) {
          return {
            ok: true,
            json: async () => ({ accounts: fetchResponses.accounts }),
          } as Response;
        }
        if (urlStr.includes("mybusinessbusinessinformation.googleapis.com")) {
          throw new Error("Network error fetching locations");
        }
        return { ok: false, status: 404, text: async () => "Not found" } as unknown as Response;
      }),
    );

    const app = buildApp();
    const res = await request(app)
      .get(`/api/google/business/oauth-callback?code=test-code&state=${STATE}`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers["location"]).toContain("connected=1");

    expect(configStore.get("gbAccountName")).toBe("accounts/SAME_ACCOUNT");
    expect(configStore.has("gbLocationName")).toBe(false);
    expect(configStore.has("gbLocationDisplayName")).toBe(false);
  });

  it("multi-account branch: clears saved location when location fetch throws", async () => {
    configStore.set("gbOAuthState", `${STATE}:${EXPIRY_FAR_FUTURE}`);
    configStore.set("gbAccountName", "accounts/ACCOUNT_A");
    configStore.set("gbAccountDisplayName", "Account A");
    configStore.set("gbLocationName", "accounts/ACCOUNT_A/locations/stale-loc");
    configStore.set("gbLocationDisplayName", "Stale Location");

    fetchResponses.accounts = [
      { name: "accounts/ACCOUNT_A", accountName: "Account A" },
      { name: "accounts/ACCOUNT_B", accountName: "Account B" },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes("mybusinessaccountmanagement.googleapis.com")) {
          return {
            ok: true,
            json: async () => ({ accounts: fetchResponses.accounts }),
          } as Response;
        }
        if (urlStr.includes("mybusinessbusinessinformation.googleapis.com")) {
          throw new Error("Network error fetching locations");
        }
        return { ok: false, status: 404, text: async () => "Not found" } as unknown as Response;
      }),
    );

    const app = buildApp();
    const res = await request(app)
      .get(`/api/google/business/oauth-callback?code=test-code&state=${STATE}`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers["location"]).toContain("connected=1");

    expect(configStore.get("gbAccountName")).toBe("accounts/ACCOUNT_A");
    expect(configStore.has("gbLocationName")).toBe(false);
    expect(configStore.has("gbLocationDisplayName")).toBe(false);
  });
});

describe("Manual account picker (PUT /account) — always clears saved location", () => {
  it("clears the saved location whenever a new account is explicitly picked", async () => {
    configStore.set("gbAccessToken", "existing-access-token");
    configStore.set("gbRefreshToken", "existing-refresh-token");
    configStore.set("gbTokenExpiry", String(Date.now() + 3600_000));
    configStore.set("gbAccountName", "accounts/OLD_ACCOUNT");
    configStore.set("gbAccountDisplayName", "Old Account");
    configStore.set("gbLocationName", "accounts/OLD_ACCOUNT/locations/loc1");
    configStore.set("gbLocationDisplayName", "Old Location");

    fetchResponses.accounts = [
      { name: "accounts/NEW_ACCOUNT", accountName: "New Account" },
      { name: "accounts/OLD_ACCOUNT", accountName: "Old Account" },
    ];
    fetchResponses.locations = [
      { name: "accounts/NEW_ACCOUNT/locations/loc_a", title: "Branch A" },
      { name: "accounts/NEW_ACCOUNT/locations/loc_b", title: "Branch B" },
    ];

    const app = buildApp();
    const res = await request(app)
      .put("/api/google/business/account")
      .send({ accountName: "accounts/NEW_ACCOUNT" });

    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(true);
    expect(res.body.needsLocationPick).toBe(true);

    expect(configStore.get("gbAccountName")).toBe("accounts/NEW_ACCOUNT");
    expect(configStore.has("gbLocationName")).toBe(false);
    expect(configStore.has("gbLocationDisplayName")).toBe(false);
  });

  it("clears the saved location even when the same account is re-picked", async () => {
    configStore.set("gbAccessToken", "existing-access-token");
    configStore.set("gbRefreshToken", "existing-refresh-token");
    configStore.set("gbTokenExpiry", String(Date.now() + 3600_000));
    configStore.set("gbAccountName", "accounts/SAME_ACCOUNT");
    configStore.set("gbAccountDisplayName", "Same Account");
    configStore.set("gbLocationName", "accounts/SAME_ACCOUNT/locations/loc1");
    configStore.set("gbLocationDisplayName", "Main Location");

    fetchResponses.accounts = [{ name: "accounts/SAME_ACCOUNT", accountName: "Same Account" }];
    fetchResponses.locations = [
      { name: "accounts/SAME_ACCOUNT/locations/loc1", title: "Main Location" },
      { name: "accounts/SAME_ACCOUNT/locations/loc2", title: "Branch" },
    ];

    const app = buildApp();
    const res = await request(app)
      .put("/api/google/business/account")
      .send({ accountName: "accounts/SAME_ACCOUNT" });

    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(true);
    expect(res.body.needsLocationPick).toBe(true);

    expect(configStore.get("gbAccountName")).toBe("accounts/SAME_ACCOUNT");
    expect(configStore.has("gbLocationName")).toBe(false);
    expect(configStore.has("gbLocationDisplayName")).toBe(false);
  });
});
