import { Router } from "express";
import { db } from "@workspace/db";
import { siteConfigTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

interface CacheEntry {
  data: GoogleReviewsData;
  fetchedAt: number;
}

interface GoogleReviewsData {
  placeId: string;
  name: string;
  rating: number;
  userRatingsTotal: number;
  reviewUrl: string;
  reviews: {
    authorName: string;
    authorPhoto: string | null;
    rating: number;
    text: string;
    relativeTime: string;
    time: number;
  }[];
}

const CACHE_TTL_MS = 60 * 60 * 1000;
let cache: CacheEntry | null = null;

async function getSiteConfigValue(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(siteConfigTable)
    .where(eq(siteConfigTable.key, key))
    .limit(1);
  return row?.value ?? null;
}

router.get("/google/reviews", async (_req, res) => {
  try {
    const apiKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!apiKey) {
      res.status(503).json({ error: "Google API key not configured" });
      return;
    }

    const placeId = await getSiteConfigValue("googlePlaceId");
    if (!placeId) {
      res.status(404).json({ error: "Google Place ID not configured" });
      return;
    }

    const reviewUrl = (await getSiteConfigValue("googleReviewUrl")) ?? "";

    if (cache && cache.data.placeId === placeId && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      res.json({ ...cache.data, reviewUrl: reviewUrl || cache.data.reviewUrl });
      return;
    }

    const fields = "name,rating,user_ratings_total,reviews";
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${encodeURIComponent(fields)}&reviews_sort=newest&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      logger.warn({ status: response.status }, "Google Places API non-200 response");
      res.status(502).json({ error: "Google Places API request failed" });
      return;
    }

    const json = (await response.json()) as {
      status: string;
      result?: {
        name?: string;
        rating?: number;
        user_ratings_total?: number;
        reviews?: Array<{
          author_name?: string;
          profile_photo_url?: string;
          rating?: number;
          text?: string;
          relative_time_description?: string;
          time?: number;
        }>;
      };
      error_message?: string;
    };

    if (json.status !== "OK" || !json.result) {
      logger.warn({ status: json.status, msg: json.error_message }, "Google Places API error status");
      res.status(502).json({ error: "Google Places API returned an error", detail: json.status });
      return;
    }

    const r = json.result;
    const data: GoogleReviewsData = {
      placeId,
      name: r.name ?? "Kimdasa Construction",
      rating: typeof r.rating === "number" ? Math.round(r.rating * 10) / 10 : 0,
      userRatingsTotal: typeof r.user_ratings_total === "number" ? r.user_ratings_total : 0,
      reviewUrl,
      reviews: (r.reviews ?? []).slice(0, 5).map((rv) => ({
        authorName: rv.author_name ?? "Anonymous",
        authorPhoto: rv.profile_photo_url ?? null,
        rating: typeof rv.rating === "number" ? rv.rating : 5,
        text: rv.text ?? "",
        relativeTime: rv.relative_time_description ?? "",
        time: typeof rv.time === "number" ? rv.time : 0,
      })),
    };

    cache = { data, fetchedAt: Date.now() };
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Google reviews fetch failed");
    res.status(500).json({ error: "Failed to fetch Google reviews" });
  }
});

export default router;
