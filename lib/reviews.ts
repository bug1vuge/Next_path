import {db} from "./db";

/**
 * Site reviews left by visitors. Unlike the catalogue these are not imported:
 * they are written by the people using the site, published at once and shown to
 * everyone. A review the team hides stays in the table but is never read here.
 */
export async function getReviews(limit?: number) {
  return db.siteReview.findMany({
    where: {hidden: false},
    orderBy: {createdAt: "desc"},
    take: limit,
    select: {id: true, name: true, rating: true, text: true, createdAt: true}
  });
}

export async function getReviewSummary() {
  const summary = await db.siteReview.aggregate({
    where: {hidden: false},
    _count: {_all: true},
    _avg: {rating: true}
  });
  const average = summary._avg.rating;
  return {
    count: summary._count._all,
    average: average === null ? null : Math.round(average * 10) / 10
  };
}

export type SiteReviewItem = Awaited<ReturnType<typeof getReviews>>[number];
