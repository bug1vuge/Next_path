"use server";

import {revalidatePath} from "next/cache";
import {headers} from "next/headers";
import {db} from "@/lib/db";
import {validateReview, withinRateLimit, type ReviewErrorKey, type ReviewField} from "@/lib/review-input";

export type ReviewFormState = {
  status: "idle" | "success" | "error";
  /** Increments on every submission, so the form can re-apply what was typed after an error. */
  attempt: number;
  errors: Partial<Record<ReviewField, ReviewErrorKey>>;
  formError: "tooMany" | "failed" | null;
  values: {name: string; rating: string; text: string};
};

// Per-process memory is enough for a single Railway instance; it resets on deploy.
const submissions = new Map<string, number[]>();

export async function publishReview(previous: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    rating: String(formData.get("rating") ?? ""),
    text: String(formData.get("text") ?? "")
  };
  const base = {attempt: previous.attempt + 1, errors: {}, formError: null, values};

  // A field hidden from people; a bot that fills it gets a quiet success and nothing is saved.
  if (String(formData.get("website") ?? "").trim() !== "") {
    return {...base, status: "success", values: {name: "", rating: "", text: ""}};
  }

  const validation = validateReview(values);
  if (!validation.ok) return {...base, status: "error", errors: validation.errors};

  const requestHeaders = await headers();
  const sender = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "local";
  if (!withinRateLimit(submissions, sender, Date.now())) {
    return {...base, status: "error", formError: "tooMany"};
  }

  try {
    await db.siteReview.create({data: validation.review});
  } catch (error) {
    console.error("Failed to save a site review", error);
    return {...base, status: "error", formError: "failed"};
  }

  revalidatePath("/[locale]/reviews", "page");
  revalidatePath("/[locale]", "page");
  return {...base, status: "success", values: {name: "", rating: "", text: ""}};
}
