import { Router } from "express";
import { randomUUID } from "node:crypto";
import { google } from "googleapis";
import { db } from "@workspace/db";
import { siteConfigTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { encrypt, decrypt, isEncrypted } from "../lib/encryption";

const router = Router();

const GMB_ACCOUNTS_URL = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
const GMB_LOCATIONS_URL = (accountName: string) =>
  `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`;
const GMB_POSTS_URL = (locationName: string) =>
  `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`;

const SCOPES = ["https://www.googleapis.com/auth/business.manage"];

const STATE_TTL_MS = 10 * 60 * 1000;

async function getOAuthCredentials(): Promise<{ clientId: string; clientSecret: string } | null> {
  const envClientId = process.env["GOOGLE_CLIENT_ID"];
  const envClientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  if (envClientId && envClientSecret) {
    return { clientId: envClientId, clientSecret: envClientSecret };
  }
  const [dbClientId, dbClientSecret] = await Promise.all([
    getEncryptedSiteConfig("gbClientId"),
    getEncryptedSiteConfig("gbClientSecret"),
  ]);
  if (dbClientId && dbClientSecret) {
    return { clientId: dbClientId, clientSecret: dbClientSecret };
  }
  return null;
}

async function buildOAuth2ClientAsync(redirectUri: string) {
  const creds = await getOAuthCredentials();
  if (!creds) return null;
  return new google.auth.OAuth2(creds.clientId, creds.clientSecret, redirectUri);
}

function buildRedirectUri(req: import("express").Request): string {
  const override = process.env["GOOGLE_REDIRECT_URI"];
  if (override) return override;
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol ?? "https";
  const host = (req.headers["x-forwarded-host"] as string | undefined) ?? req.headers.host ?? "";
  return `${proto}://${host}/api/google/business/oauth-callback`;
}

async function getSiteConfig(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(siteConfigTable)
    .where(eq(siteConfigTable.key, key))
    .limit(1);
  return row?.value ?? null;
}

async function upsertSiteConfig(key: string, value: string): Promise<void> {
  const existing = await getSiteConfig(key);
  if (existing !== null) {
    await db
      .update(siteConfigTable)
      .set({ value, updatedAt: new Date() })
      .where(eq(siteConfigTable.key, key));
  } else {
    await db.insert(siteConfigTable).values({ key, value });
  }
}

async function getEncryptedSiteConfig(key: string): Promise<string | null> {
  const raw = await getSiteConfig(key);
  if (raw === null) return null;

  if (isEncrypted(raw)) {
    try {
      return decrypt(raw);
    } catch (err) {
      logger.error({ err, key }, "ENCRYPTION_KEY mismatch or corrupt ciphertext — credential cannot be decrypted. Verify ENCRYPTION_KEY secret is correct.");
      throw new Error(`Failed to decrypt stored credential '${key}'. Check that ENCRYPTION_KEY has not changed.`);
    }
  }

  logger.info({ key }, "Migrating plain-text credential to encrypted storage");
  try {
    await upsertSiteConfig(key, encrypt(raw));
  } catch (err) {
    logger.warn({ err, key }, "Failed to re-encrypt plain-text credential during migration");
  }
  return raw;
}

async function upsertEncryptedSiteConfig(key: string, value: string): Promise<void> {
  await upsertSiteConfig(key, encrypt(value));
}

async function deleteSiteConfig(key: string): Promise<void> {
  await db.delete(siteConfigTable).where(eq(siteConfigTable.key, key));
}

async function getPendingCredentials(): Promise<{ clientId: string; clientSecret: string } | null> {
  const [pendingClientId, pendingClientSecret] = await Promise.all([
    getEncryptedSiteConfig("gbPendingClientId"),
    getEncryptedSiteConfig("gbPendingClientSecret"),
  ]);
  if (pendingClientId && pendingClientSecret) {
    return { clientId: pendingClientId, clientSecret: pendingClientSecret };
  }
  return null;
}

async function promotePendingCredentials(): Promise<void> {
  const pending = await getPendingCredentials();
  if (!pending) return;
  await Promise.all([
    upsertEncryptedSiteConfig("gbClientId", pending.clientId),
    upsertEncryptedSiteConfig("gbClientSecret", pending.clientSecret),
    deleteSiteConfig("gbPendingClientId"),
    deleteSiteConfig("gbPendingClientSecret"),
  ]);
}

async function clearPendingCredentials(): Promise<void> {
  await Promise.all([
    deleteSiteConfig("gbPendingClientId"),
    deleteSiteConfig("gbPendingClientSecret"),
  ]);
}

async function getTokens(): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryMs: number;
} | null> {
  const [at, rt, exp] = await Promise.all([
    getSiteConfig("gbAccessToken"),
    getSiteConfig("gbRefreshToken"),
    getSiteConfig("gbTokenExpiry"),
  ]);
  if (!at || !rt) return null;
  return { accessToken: at, refreshToken: rt, expiryMs: Number(exp ?? 0) };
}

async function getValidAccessToken(req: import("express").Request): Promise<string | null> {
  const tokens = await getTokens();
  if (!tokens) return null;

  const { accessToken, refreshToken, expiryMs } = tokens;
  const needsRefresh = !expiryMs || Date.now() > expiryMs - 60_000;

  if (!needsRefresh) return accessToken;

  try {
    const oauth2Client = await buildOAuth2ClientAsync(buildRedirectUri(req));
    if (!oauth2Client) return null;
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    if (credentials.access_token) {
      await Promise.all([
        upsertSiteConfig("gbAccessToken", credentials.access_token),
        upsertSiteConfig("gbTokenExpiry", String(credentials.expiry_date ?? 0)),
      ]);
      return credentials.access_token;
    }
  } catch (err) {
    logger.warn({ err }, "Google Business: failed to refresh token");
  }
  return null;
}

async function gmb<T>(
  url: string,
  accessToken: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { method = "GET", body } = options;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GMB API ${method} ${url} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

router.get("/google/business/redirect-uri", requireAuth, requireAdmin, (req, res) => {
  res.json({ redirectUri: buildRedirectUri(req) });
});

router.post("/google/business/verify-credentials", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body as { clientId?: string; clientSecret?: string };
    if (!clientId?.trim() || !clientSecret?.trim()) {
      res.status(400).json({ valid: false, error: "Both clientId and clientSecret are required" });
      return;
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        grant_type: "authorization_code",
        code: "dummy_verification_code",
        redirect_uri: "https://example.com",
      }),
    });

    const data = await tokenRes.json() as { error?: string; error_description?: string };

    if (data.error === "invalid_grant") {
      res.json({ valid: true });
    } else if (data.error === "invalid_client") {
      res.json({ valid: false, error: "Client ID or Secret not recognized by Google" });
    } else {
      res.json({ valid: false, error: data.error_description ?? data.error ?? "Unexpected response from Google" });
    }
  } catch (err) {
    logger.error({ err }, "Google Business: verify credentials failed");
    res.status(500).json({ valid: false, error: "Failed to reach Google — check your internet connection" });
  }
});

router.get("/google/business/credentials", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [dbClientId, dbClientSecret] = await Promise.all([
      getEncryptedSiteConfig("gbClientId"),
      getEncryptedSiteConfig("gbClientSecret"),
    ]);
    const hasEnv = !!(process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]);
    res.json({
      source: hasEnv ? "env" : dbClientId && dbClientSecret ? "db" : "none",
      clientIdSet: hasEnv || !!dbClientId,
      clientSecretSet: hasEnv || !!dbClientSecret,
      clientIdPreview: dbClientId ? `${dbClientId.slice(0, 8)}…` : null,
    });
  } catch (err) {
    logger.error({ err }, "Google Business: get credentials failed");
    res.status(500).json({ error: "Failed to fetch credentials" });
  }
});

router.put("/google/business/credentials", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body as { clientId?: string; clientSecret?: string };
    if (!clientId?.trim() || !clientSecret?.trim()) {
      res.status(400).json({ error: "Both clientId and clientSecret are required" });
      return;
    }
    await Promise.all([
      upsertEncryptedSiteConfig("gbPendingClientId", clientId.trim()),
      upsertEncryptedSiteConfig("gbPendingClientSecret", clientSecret.trim()),
    ]);
    res.json({ saved: true });
  } catch (err) {
    logger.error({ err }, "Google Business: save credentials failed");
    res.status(500).json({ error: "Failed to save credentials" });
  }
});

router.delete("/google/business/credentials", requireAuth, requireAdmin, async (_req, res) => {
  try {
    await Promise.all([
      deleteSiteConfig("gbClientId"),
      deleteSiteConfig("gbClientSecret"),
      deleteSiteConfig("gbPendingClientId"),
      deleteSiteConfig("gbPendingClientSecret"),
    ]);
    res.json({ deleted: true });
  } catch (err) {
    logger.error({ err }, "Google Business: delete credentials failed");
    res.status(500).json({ error: "Failed to delete credentials" });
  }
});

router.get("/google/business/auth-url", requireAuth, requireAdmin, async (req, res) => {
  const pendingCreds = await getPendingCredentials();
  const creds = pendingCreds ?? (await getOAuthCredentials());
  if (!creds) {
    res.status(503).json({ error: "Google OAuth credentials not configured" });
    return;
  }

  const state = randomUUID();
  const expiry = Date.now() + STATE_TTL_MS;
  const isPending = !!pendingCreds;
  await upsertSiteConfig("gbOAuthState", `${state}:${expiry}${isPending ? ":pending" : ""}`);

  const redirectUri = buildRedirectUri(req);
  const oauth2Client = new google.auth.OAuth2(creds.clientId, creds.clientSecret, redirectUri);
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state,
  });

  res.json({ url });
});

router.get("/google/business/oauth-callback", async (req, res) => {
  const dashboardBase = process.env["DASHBOARD_URL"] ?? "";
  const code = req.query["code"] as string | undefined;
  const error = req.query["error"] as string | undefined;
  const stateParam = req.query["state"] as string | undefined;

  if (error || !code) {
    res.redirect(`${dashboardBase}/google-business?error=${encodeURIComponent(error ?? "no_code")}`);
    return;
  }

  try {
    const storedStateRaw = await getSiteConfig("gbOAuthState");
    if (!storedStateRaw || !stateParam) {
      logger.warn("Google Business: OAuth callback missing state");
      res.redirect(`${dashboardBase}/google-business?error=invalid_state`);
      return;
    }

    const [storedState, expiryStr, pendingFlag] = storedStateRaw.split(":");
    const expiry = Number(expiryStr ?? 0);
    const isPendingFlow = pendingFlag === "pending";

    if (storedState !== stateParam || Date.now() > expiry) {
      logger.warn({ storedState, stateParam }, "Google Business: OAuth state mismatch or expired");
      res.redirect(`${dashboardBase}/google-business?error=invalid_state`);
      return;
    }

    await deleteSiteConfig("gbOAuthState");

    const redirectUri = buildRedirectUri(req);

    let oauth2Client: InstanceType<typeof google.auth.OAuth2>;
    if (isPendingFlow) {
      const pendingCreds = await getPendingCredentials();
      if (!pendingCreds) {
        logger.warn("Google Business: pending credentials missing during OAuth callback");
        res.redirect(`${dashboardBase}/google-business?error=missing_credentials`);
        return;
      }
      oauth2Client = new google.auth.OAuth2(pendingCreds.clientId, pendingCreds.clientSecret, redirectUri);
    } else {
      const built = await buildOAuth2ClientAsync(redirectUri);
      if (!built) {
        res.redirect(`${dashboardBase}/google-business?error=missing_credentials`);
        return;
      }
      oauth2Client = built;
    }

    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      if (isPendingFlow) await clearPendingCredentials().catch(() => {});
      res.redirect(`${dashboardBase}/google-business?error=no_tokens`);
      return;
    }

    await Promise.all([
      upsertSiteConfig("gbAccessToken", tokens.access_token),
      upsertSiteConfig("gbRefreshToken", tokens.refresh_token),
      upsertSiteConfig("gbTokenExpiry", String(tokens.expiry_date ?? 0)),
      ...(isPendingFlow ? [promotePendingCredentials()] : []),
    ]);

    const accessToken = tokens.access_token;

    try {
      const accountsRes = await gmb<{ accounts?: Array<{ name: string; accountName?: string }> }>(
        GMB_ACCOUNTS_URL,
        accessToken
      );
      const accounts = accountsRes.accounts ?? [];

      if (accounts.length === 0) {
        res.redirect(`${dashboardBase}/google-business?connected=1&needs_account=1`);
        return;
      }

      if (accounts.length > 1) {
        const savedAccountName = await getSiteConfig("gbAccountName");
        const matchedAccount = savedAccountName
          ? accounts.find((a) => a.name === savedAccountName)
          : undefined;

        if (!matchedAccount) {
          await Promise.all([
            deleteSiteConfig("gbAccountName"),
            deleteSiteConfig("gbAccountDisplayName"),
            deleteSiteConfig("gbLocationName"),
            deleteSiteConfig("gbLocationDisplayName"),
          ]);
          res.redirect(`${dashboardBase}/google-business?connected=1&needs_account=1`);
          return;
        }

        logger.info({ accountName: matchedAccount.name }, "Google Business: auto-reselected previously saved account");
        const accountDisplayName = matchedAccount.accountName ?? matchedAccount.name;
        await Promise.all([
          upsertSiteConfig("gbAccountName", matchedAccount.name),
          upsertSiteConfig("gbAccountDisplayName", accountDisplayName),
        ]);

        try {
          const locRes = await gmb<{ locations?: Array<{ name: string; title?: string }> }>(
            GMB_LOCATIONS_URL(matchedAccount.name),
            accessToken
          );
          const locations = locRes.locations ?? [];
          if (locations.length === 0) {
            await Promise.all([
              deleteSiteConfig("gbLocationName"),
              deleteSiteConfig("gbLocationDisplayName"),
            ]);
          } else if (locations.length === 1) {
            const loc = locations[0];
            const locationDisplayName = loc.title ?? loc.name;
            await Promise.all([
              upsertSiteConfig("gbLocationName", loc.name),
              upsertSiteConfig("gbLocationDisplayName", locationDisplayName),
            ]);
          } else if (locations.length > 1) {
            const savedLocationName = await getSiteConfig("gbLocationName");
            const matchedLoc = savedLocationName
              ? locations.find((l) => l.name === savedLocationName)
              : undefined;
            if (matchedLoc) {
              const locationDisplayName = matchedLoc.title ?? matchedLoc.name;
              await upsertSiteConfig("gbLocationDisplayName", locationDisplayName);
              logger.info({ locationName: matchedLoc.name }, "Google Business: auto-reselected previously saved location");
            } else {
              await Promise.all([
                deleteSiteConfig("gbLocationName"),
                deleteSiteConfig("gbLocationDisplayName"),
              ]);
              res.redirect(`${dashboardBase}/google-business?connected=1&needs_location=1`);
              return;
            }
          }
        } catch (locErr) {
          logger.warn({ locErr }, "Google Business: could not list locations after auto-account-reselect");
          await Promise.all([
            deleteSiteConfig("gbLocationName"),
            deleteSiteConfig("gbLocationDisplayName"),
          ]);
        }

        res.redirect(`${dashboardBase}/google-business?connected=1`);
        return;
      }

      const account = accounts[0];
      const accountDisplayName = account.accountName ?? account.name;

      const previousAccountName = await getSiteConfig("gbAccountName");
      const accountChanged = previousAccountName !== null && previousAccountName !== account.name;

      if (accountChanged) {
        logger.info(
          { newAccount: account.name, previousAccount: previousAccountName },
          "Google Business: account changed — clearing saved location preference"
        );
      }

      await Promise.all([
        upsertSiteConfig("gbAccountName", account.name),
        upsertSiteConfig("gbAccountDisplayName", accountDisplayName),
        ...(accountChanged
          ? [deleteSiteConfig("gbLocationName"), deleteSiteConfig("gbLocationDisplayName")]
          : []),
      ]);

      try {
        const locRes = await gmb<{ locations?: Array<{ name: string; title?: string }> }>(
          GMB_LOCATIONS_URL(account.name),
          accessToken
        );
        const locations = locRes.locations ?? [];
        if (locations.length === 0) {
          await Promise.all([
            deleteSiteConfig("gbLocationName"),
            deleteSiteConfig("gbLocationDisplayName"),
          ]);
        } else if (locations.length === 1) {
          const loc = locations[0];
          const locationDisplayName = loc.title ?? loc.name;
          await Promise.all([
            upsertSiteConfig("gbLocationName", loc.name),
            upsertSiteConfig("gbLocationDisplayName", locationDisplayName),
          ]);
        } else if (locations.length > 1) {
          const savedLocationName = await getSiteConfig("gbLocationName");
          const matchedLoc = savedLocationName
            ? locations.find((l) => l.name === savedLocationName)
            : undefined;
          if (matchedLoc) {
            const locationDisplayName = matchedLoc.title ?? matchedLoc.name;
            await upsertSiteConfig("gbLocationDisplayName", locationDisplayName);
            logger.info({ locationName: matchedLoc.name }, "Google Business: auto-reselected previously saved location");
          } else {
            await Promise.all([
              deleteSiteConfig("gbLocationName"),
              deleteSiteConfig("gbLocationDisplayName"),
            ]);
            res.redirect(`${dashboardBase}/google-business?connected=1&needs_location=1`);
            return;
          }
        }
      } catch (locErr) {
        logger.warn({ locErr }, "Google Business: could not list locations");
        await Promise.all([
          deleteSiteConfig("gbLocationName"),
          deleteSiteConfig("gbLocationDisplayName"),
        ]);
      }
    } catch (accErr) {
      logger.warn({ accErr }, "Google Business: could not list accounts");
      await Promise.all([
        deleteSiteConfig("gbAccountName"),
        deleteSiteConfig("gbAccountDisplayName"),
        deleteSiteConfig("gbLocationName"),
        deleteSiteConfig("gbLocationDisplayName"),
      ]);
      res.redirect(`${dashboardBase}/google-business?connected=1&needs_account=1`);
      return;
    }

    res.redirect(`${dashboardBase}/google-business?connected=1`);
  } catch (err) {
    logger.error({ err }, "Google Business: OAuth callback failed");
    await clearPendingCredentials().catch(() => {});
    res.redirect(`${dashboardBase}/google-business?error=oauth_failed`);
  }
});

router.get("/google/business/status", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const tokens = await getTokens();
    if (!tokens) {
      const creds = await getOAuthCredentials();
      res.json({ connected: false, hasCredentials: !!creds });
      return;
    }
    const [accountDisplayName, accountName, locationDisplayName, locationName] = await Promise.all([
      getSiteConfig("gbAccountDisplayName"),
      getSiteConfig("gbAccountName"),
      getSiteConfig("gbLocationDisplayName"),
      getSiteConfig("gbLocationName"),
    ]);
    res.json({
      connected: true,
      hasCredentials: true,
      accountName: accountDisplayName,
      locationName: locationDisplayName,
      needsAccountPick: !accountName,
      needsLocationPick: !!accountName && !locationName,
    });
  } catch (err) {
    logger.error({ err }, "Google Business: status check failed");
    res.status(500).json({ error: "Failed to check status" });
  }
});

router.get("/google/business/accounts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);
    if (!accessToken) {
      res.status(401).json({ error: "Not connected to Google Business" });
      return;
    }
    const accountsRes = await gmb<{ accounts?: Array<{ name: string; accountName?: string }> }>(
      GMB_ACCOUNTS_URL,
      accessToken
    );
    const accounts = (accountsRes.accounts ?? []).map((a) => ({
      name: a.name,
      accountName: a.accountName ?? a.name,
    }));
    res.json({ accounts });
  } catch (err) {
    logger.error({ err }, "Google Business: list accounts failed");
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.put("/google/business/account", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { accountName } = req.body as { accountName?: string };
    if (!accountName?.trim()) {
      res.status(400).json({ error: "accountName is required" });
      return;
    }
    const accessToken = await getValidAccessToken(req);
    if (!accessToken) {
      res.status(401).json({ error: "Not connected to Google Business" });
      return;
    }
    const accountsRes = await gmb<{ accounts?: Array<{ name: string; accountName?: string }> }>(
      GMB_ACCOUNTS_URL,
      accessToken
    );
    const account = (accountsRes.accounts ?? []).find((a) => a.name === accountName.trim());
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    const accountDisplayName = account.accountName ?? account.name;
    await Promise.all([
      upsertSiteConfig("gbAccountName", account.name),
      upsertSiteConfig("gbAccountDisplayName", accountDisplayName),
      deleteSiteConfig("gbLocationName"),
      deleteSiteConfig("gbLocationDisplayName"),
    ]);

    try {
      const locRes = await gmb<{ locations?: Array<{ name: string; title?: string }> }>(
        GMB_LOCATIONS_URL(account.name),
        accessToken
      );
      const locations = locRes.locations ?? [];
      if (locations.length === 1) {
        const loc = locations[0];
        const locationDisplayName = loc.title ?? loc.name;
        await Promise.all([
          upsertSiteConfig("gbLocationName", loc.name),
          upsertSiteConfig("gbLocationDisplayName", locationDisplayName),
        ]);
        res.json({ saved: true, accountName: account.name, accountDisplayName, needsLocationPick: false });
        return;
      } else if (locations.length > 1) {
        res.json({ saved: true, accountName: account.name, accountDisplayName, needsLocationPick: true });
        return;
      }
    } catch (locErr) {
      logger.warn({ locErr }, "Google Business: could not list locations after account selection");
    }

    res.json({ saved: true, accountName: account.name, accountDisplayName, needsLocationPick: false });
  } catch (err) {
    logger.error({ err }, "Google Business: set account failed");
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.get("/google/business/locations", requireAuth, requireAdmin, async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);
    if (!accessToken) {
      res.status(401).json({ error: "Not connected to Google Business" });
      return;
    }
    const accountName = await getSiteConfig("gbAccountName");
    if (!accountName) {
      res.status(400).json({ error: "Account not configured. Please reconnect." });
      return;
    }
    const locRes = await gmb<{ locations?: Array<{ name: string; title?: string }> }>(
      GMB_LOCATIONS_URL(accountName),
      accessToken
    );
    const locations = (locRes.locations ?? []).map((l) => ({
      name: l.name,
      title: l.title ?? l.name,
    }));
    res.json({ locations });
  } catch (err) {
    logger.error({ err }, "Google Business: list locations failed");
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.put("/google/business/location", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { locationName } = req.body as { locationName?: string };
    if (!locationName?.trim()) {
      res.status(400).json({ error: "locationName is required" });
      return;
    }
    const accessToken = await getValidAccessToken(req);
    if (!accessToken) {
      res.status(401).json({ error: "Not connected to Google Business" });
      return;
    }
    const accountName = await getSiteConfig("gbAccountName");
    if (!accountName) {
      res.status(400).json({ error: "Account not configured. Please reconnect." });
      return;
    }
    const locRes = await gmb<{ locations?: Array<{ name: string; title?: string }> }>(
      GMB_LOCATIONS_URL(accountName),
      accessToken
    );
    const loc = (locRes.locations ?? []).find((l) => l.name === locationName.trim());
    if (!loc) {
      res.status(404).json({ error: "Location not found" });
      return;
    }
    const locationDisplayName = loc.title ?? loc.name;
    await Promise.all([
      upsertSiteConfig("gbLocationName", loc.name),
      upsertSiteConfig("gbLocationDisplayName", locationDisplayName),
    ]);
    res.json({ saved: true, locationName: loc.name, locationDisplayName });
  } catch (err) {
    logger.error({ err }, "Google Business: set location failed");
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.post("/google/business/post", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { text, photoUrl } = req.body as { text?: string; photoUrl?: string };
    if (!text?.trim()) {
      res.status(400).json({ error: "Post text is required" });
      return;
    }

    const accessToken = await getValidAccessToken(req);
    if (!accessToken) {
      res.status(401).json({ error: "Not connected to Google Business" });
      return;
    }

    const accountName = await getSiteConfig("gbAccountName");
    const locationRaw = await getSiteConfig("gbLocationName");

    if (!accountName || !locationRaw) {
      res.status(400).json({ error: "Account or location not configured. Please reconnect." });
      return;
    }

    const locationPath = locationRaw.startsWith("accounts/")
      ? locationRaw
      : `${accountName}/locations/${locationRaw.replace("locations/", "")}`;

    const postBody: Record<string, unknown> = {
      languageCode: "en",
      summary: text.trim(),
      topicType: "STANDARD",
    };

    if (photoUrl?.trim()) {
      postBody["media"] = [{ mediaFormat: "PHOTO", sourceUrl: photoUrl.trim() }];
    }

    const result = await gmb<{ name?: string }>(
      GMB_POSTS_URL(locationPath),
      accessToken,
      { method: "POST", body: postBody }
    );

    res.json({ success: true, postName: result.name });
  } catch (err) {
    logger.error({ err }, "Google Business: post creation failed");
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.get("/google/business/posts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);
    if (!accessToken) {
      res.status(401).json({ error: "Not connected to Google Business" });
      return;
    }

    const accountName = await getSiteConfig("gbAccountName");
    const locationRaw = await getSiteConfig("gbLocationName");

    if (!accountName || !locationRaw) {
      res.status(400).json({ error: "Account or location not configured. Please reconnect." });
      return;
    }

    const locationPath = locationRaw.startsWith("accounts/")
      ? locationRaw
      : `${accountName}/locations/${locationRaw.replace("locations/", "")}`;

    const url = `${GMB_POSTS_URL(locationPath)}?pageSize=10`;
    const result = await gmb<{
      localPosts?: Array<{
        name?: string;
        summary?: string;
        createTime?: string;
        updateTime?: string;
        state?: string;
        searchUrl?: string;
        media?: Array<{ sourceUrl?: string }>;
      }>;
    }>(url, accessToken);

    const posts = (result.localPosts ?? [])
      .map((p) => ({
        name: p.name ?? "",
        summary: p.summary ?? "",
        createTime: p.createTime ?? "",
        state: p.state ?? "UNKNOWN",
        searchUrl: p.searchUrl ?? null,
        photoUrl: p.media?.[0]?.sourceUrl ?? null,
      }))
      .sort((a, b) => {
        const ta = a.createTime ? new Date(a.createTime).getTime() : 0;
        const tb = b.createTime ? new Date(b.createTime).getTime() : 0;
        return tb - ta;
      });

    res.json({ posts });
  } catch (err) {
    logger.error({ err }, "Google Business: list posts failed");
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.delete("/google/business/posts/:postId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const postId = String(req.params["postId"] ?? "");
    if (!postId.trim()) {
      res.status(400).json({ error: "postId is required" });
      return;
    }

    const accessToken = await getValidAccessToken(req);
    if (!accessToken) {
      res.status(401).json({ error: "Not connected to Google Business" });
      return;
    }

    const accountName = await getSiteConfig("gbAccountName");
    const locationRaw = await getSiteConfig("gbLocationName");

    if (!accountName || !locationRaw) {
      res.status(400).json({ error: "Account or location not configured. Please reconnect." });
      return;
    }

    const locationPath = locationRaw.startsWith("accounts/")
      ? locationRaw
      : `${accountName}/locations/${locationRaw.replace("locations/", "")}`;

    const postName = `${locationPath}/localPosts/${postId}`;
    const deleteUrl = `https://mybusiness.googleapis.com/v4/${postName}`;

    await gmb<Record<string, unknown>>(deleteUrl, accessToken, { method: "DELETE" });

    res.json({ deleted: true });
  } catch (err) {
    logger.error({ err }, "Google Business: delete post failed");
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

router.delete("/google/business/disconnect", requireAuth, requireAdmin, async (_req, res) => {
  try {
    await Promise.all([
      deleteSiteConfig("gbAccessToken"),
      deleteSiteConfig("gbRefreshToken"),
      deleteSiteConfig("gbTokenExpiry"),
      deleteSiteConfig("gbAccountName"),
      deleteSiteConfig("gbAccountDisplayName"),
      deleteSiteConfig("gbOAuthState"),
    ]);
    res.json({ disconnected: true });
  } catch (err) {
    logger.error({ err }, "Google Business: disconnect failed");
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

export default router;
