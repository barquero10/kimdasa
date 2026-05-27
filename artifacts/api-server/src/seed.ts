import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  marketPricesTable,
  siteConfigTable,
} from "@workspace/db/schema";

async function seedUsers() {
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminPassword) {
    throw new Error(
      "ADMIN_SEED_PASSWORD environment variable is required to seed the admin user. " +
      "Set it as a Replit secret before running this script."
    );
  }

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, "admin@kimdasa.com"));
  if (existing.length > 0) {
    console.log("Admin user already exists — skipping.");
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await db.insert(usersTable).values({
    email: "admin@kimdasa.com",
    name: "Kimdasa Admin",
    passwordHash,
    role: "admin",
  });
  console.log("Admin user seeded: admin@kimdasa.com");
}

async function seedMarketPrices() {
  const existing = await db.select().from(marketPricesTable);
  if (existing.length > 0) {
    console.log(`Market prices already seeded (${existing.length} entries) — skipping.`);
    return;
  }

  type Region = "new_jersey" | "pennsylvania";

  const categories: Array<{
    category: string;
    unit: string;
    nj: { min: string; avg: string; premium: string };
    pa: { min: string; avg: string; premium: string };
  }> = [
    {
      category: "Asphalt Shingles (3-tab)",
      unit: "per sq ft installed",
      nj: { min: "3.50", avg: "4.50", premium: "6.00" },
      pa: { min: "3.00", avg: "4.00", premium: "5.50" },
    },
    {
      category: "Architectural Shingles",
      unit: "per sq ft installed",
      nj: { min: "4.50", avg: "5.75", premium: "7.50" },
      pa: { min: "4.00", avg: "5.25", premium: "7.00" },
    },
    {
      category: "Metal Roofing (Standing Seam)",
      unit: "per sq ft installed",
      nj: { min: "9.00", avg: "12.00", premium: "16.00" },
      pa: { min: "8.00", avg: "11.00", premium: "15.00" },
    },
    {
      category: "Flat Roof (EPDM Rubber)",
      unit: "per sq ft installed",
      nj: { min: "5.00", avg: "7.50", premium: "11.00" },
      pa: { min: "4.50", avg: "7.00", premium: "10.00" },
    },
    {
      category: "Flat Roof (TPO Membrane)",
      unit: "per sq ft installed",
      nj: { min: "5.50", avg: "8.00", premium: "12.00" },
      pa: { min: "5.00", avg: "7.50", premium: "11.00" },
    },
    {
      category: "Vinyl Siding",
      unit: "per sq ft installed",
      nj: { min: "3.00", avg: "4.50", premium: "6.50" },
      pa: { min: "2.75", avg: "4.00", premium: "6.00" },
    },
    {
      category: "Hardie Board Siding",
      unit: "per sq ft installed",
      nj: { min: "6.00", avg: "8.50", premium: "12.00" },
      pa: { min: "5.50", avg: "8.00", premium: "11.00" },
    },
    {
      category: "Gutters (Aluminum K-Style)",
      unit: "per linear ft installed",
      nj: { min: "6.00", avg: "9.00", premium: "14.00" },
      pa: { min: "5.50", avg: "8.00", premium: "12.00" },
    },
    {
      category: "Downspouts",
      unit: "per linear ft installed",
      nj: { min: "4.00", avg: "6.50", premium: "10.00" },
      pa: { min: "3.50", avg: "6.00", premium: "9.00" },
    },
    {
      category: "Soffit (Aluminum)",
      unit: "per sq ft installed",
      nj: { min: "3.00", avg: "5.00", premium: "8.00" },
      pa: { min: "2.75", avg: "4.50", premium: "7.00" },
    },
    {
      category: "Fascia (Aluminum Wrap)",
      unit: "per linear ft installed",
      nj: { min: "4.00", avg: "6.50", premium: "10.00" },
      pa: { min: "3.50", avg: "6.00", premium: "9.00" },
    },
    {
      category: "Window Capping",
      unit: "per window",
      nj: { min: "150.00", avg: "250.00", premium: "400.00" },
      pa: { min: "125.00", avg: "225.00", premium: "375.00" },
    },
    {
      category: "Windows (Double-Hung Vinyl)",
      unit: "per window installed",
      nj: { min: "350.00", avg: "550.00", premium: "900.00" },
      pa: { min: "300.00", avg: "500.00", premium: "850.00" },
    },
    {
      category: "Doors (Entry Steel)",
      unit: "per door installed",
      nj: { min: "700.00", avg: "1100.00", premium: "1800.00" },
      pa: { min: "650.00", avg: "1000.00", premium: "1600.00" },
    },
    {
      category: "Repairs (General Exterior)",
      unit: "per hour labor",
      nj: { min: "75.00", avg: "110.00", premium: "160.00" },
      pa: { min: "65.00", avg: "95.00", premium: "140.00" },
    },
    {
      category: "Crew Labor Cost",
      unit: "per crew per day",
      nj: { min: "900.00", avg: "1200.00", premium: "1600.00" },
      pa: { min: "800.00", avg: "1050.00", premium: "1400.00" },
    },
    {
      category: "Material Cost Markup",
      unit: "percentage over wholesale",
      nj: { min: "15.00", avg: "20.00", premium: "30.00" },
      pa: { min: "15.00", avg: "20.00", premium: "30.00" },
    },
    {
      category: "Overhead",
      unit: "percentage of job total",
      nj: { min: "10.00", avg: "12.00", premium: "15.00" },
      pa: { min: "10.00", avg: "12.00", premium: "15.00" },
    },
    {
      category: "Profit Margin",
      unit: "percentage of job total",
      nj: { min: "15.00", avg: "20.00", premium: "25.00" },
      pa: { min: "15.00", avg: "20.00", premium: "25.00" },
    },
    {
      category: "Sales Commission",
      unit: "percentage of job total",
      nj: { min: "5.00", avg: "8.00", premium: "12.00" },
      pa: { min: "5.00", avg: "8.00", premium: "12.00" },
    },
    {
      category: "Kitchen Remodeling (full)",
      unit: "per sq ft of kitchen",
      nj: { min: "200.00", avg: "325.00", premium: "500.00" },
      pa: { min: "175.00", avg: "290.00", premium: "450.00" },
    },
    {
      category: "Bathroom Remodeling (full)",
      unit: "per sq ft of bathroom",
      nj: { min: "275.00", avg: "425.00", premium: "650.00" },
      pa: { min: "250.00", avg: "385.00", premium: "575.00" },
    },
    {
      category: "Drywall (Install + Finish)",
      unit: "per sq ft installed",
      nj: { min: "2.50", avg: "3.50", premium: "5.00" },
      pa: { min: "2.25", avg: "3.25", premium: "4.50" },
    },
    {
      category: "Interior Painting",
      unit: "per sq ft of wall",
      nj: { min: "2.50", avg: "4.00", premium: "6.00" },
      pa: { min: "2.25", avg: "3.50", premium: "5.50" },
    },
    {
      category: "Laminate / LVP Flooring",
      unit: "per sq ft installed",
      nj: { min: "4.50", avg: "7.00", premium: "10.00" },
      pa: { min: "4.00", avg: "6.50", premium: "9.00" },
    },
    {
      category: "Hardwood Flooring",
      unit: "per sq ft installed",
      nj: { min: "9.00", avg: "13.00", premium: "20.00" },
      pa: { min: "8.00", avg: "12.00", premium: "18.00" },
    },
    {
      category: "Tile Work (Floor & Wall)",
      unit: "per sq ft installed",
      nj: { min: "11.00", avg: "16.00", premium: "25.00" },
      pa: { min: "10.00", avg: "15.00", premium: "23.00" },
    },
    {
      category: "Interior Carpentry (Trim/Molding)",
      unit: "per linear ft installed",
      nj: { min: "4.00", avg: "7.00", premium: "12.00" },
      pa: { min: "3.50", avg: "6.50", premium: "11.00" },
    },
    {
      category: "Custom Closets",
      unit: "per linear ft of closet",
      nj: { min: "200.00", avg: "400.00", premium: "800.00" },
      pa: { min: "175.00", avg: "350.00", premium: "700.00" },
    },
    {
      category: "Basement Finishing",
      unit: "per sq ft finished",
      nj: { min: "35.00", avg: "55.00", premium: "90.00" },
      pa: { min: "30.00", avg: "50.00", premium: "80.00" },
    },
    {
      category: "Attic Finishing",
      unit: "per sq ft finished",
      nj: { min: "50.00", avg: "80.00", premium: "130.00" },
      pa: { min: "45.00", avg: "70.00", premium: "120.00" },
    },
    {
      category: "Interior Demolition",
      unit: "per sq ft of room",
      nj: { min: "4.00", avg: "6.50", premium: "10.00" },
      pa: { min: "3.50", avg: "6.00", premium: "9.00" },
    },
  ];

  const rows: Array<{
    category: string;
    region: Region;
    unit: string;
    minPrice: string;
    avgPrice: string;
    premiumPrice: string;
  }> = [];

  for (const c of categories) {
    rows.push({
      category: c.category,
      region: "new_jersey",
      unit: c.unit,
      minPrice: c.nj.min,
      avgPrice: c.nj.avg,
      premiumPrice: c.nj.premium,
    });
    rows.push({
      category: c.category,
      region: "pennsylvania",
      unit: c.unit,
      minPrice: c.pa.min,
      avgPrice: c.pa.avg,
      premiumPrice: c.pa.premium,
    });
  }

  await db.insert(marketPricesTable).values(rows);
  console.log(
    `Market prices seeded: ${rows.length} entries (${categories.length} categories × 2 regions).`
  );
}

async function seedSiteConfig() {
  const existing = await db.select().from(siteConfigTable);
  if (existing.length > 0) {
    console.log("Site config already seeded — skipping.");
    return;
  }
  await db.insert(siteConfigTable).values([
    {
      key: "hero_presentation_enabled",
      value: "true",
      description: "Show AI video presentation in hero section",
    },
    {
      key: "phone_number",
      value: "(908) 800-3190",
      description: "Primary company phone number",
    },
    {
      key: "email_address",
      value: "constructionkimdasa@gmail.com",
      description: "Primary company email address",
    },
    {
      key: "service_area_nj",
      value: "true",
      description: "Service area: New Jersey enabled",
    },
    {
      key: "service_area_pa",
      value: "true",
      description: "Service area: Pennsylvania enabled",
    },
    {
      key: "chatbot_enabled",
      value: "true",
      description: "Show AI chatbot on public website",
    },
    {
      key: "estimator_enabled",
      value: "true",
      description: "Show public estimate calculator",
    },
    {
      key: "company_name",
      value: "Kimdasa Construction",
      description: "Company display name",
    },
    {
      key: "company_tagline",
      value: "Premium Exterior Remodeling — NJ & PA",
      description: "Hero section tagline",
    },
  ]);
  console.log("Site config seeded.");
}

async function main() {
  console.log("Running database seed...");
  try {
    await seedUsers();
    await seedMarketPrices();
    await seedSiteConfig();
    console.log("Seed complete.");
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

main();
