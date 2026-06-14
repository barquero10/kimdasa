import app from "./app";
import { logger } from "./lib/logger";
import { startScheduler } from "./lib/scheduler";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";

async function maybeResetAdminPassword() {
  const newPassword = process.env["RESET_ADMIN_PASSWORD"];
  if (!newPassword) return;
  try {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.email, "admin@kimdasa.com"));
    logger.info("Admin password reset via RESET_ADMIN_PASSWORD env var");
  } catch (err) {
    logger.error({ err }, "Failed to reset admin password");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

maybeResetAdminPassword().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    startScheduler();
  });
});
