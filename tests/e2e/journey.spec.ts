import {expect, test, type Page} from "@playwright/test";
import kk from "../../messages/kk.json";
import ru from "../../messages/ru.json";

/**
 * One run through the whole product: test → results → direction → profession →
 * universities → favourites → admission plan → career path, then the same
 * opening steps with the interface switched to Kazakh.
 */

async function answerEveryQuestion(page: Page) {
  await expect(page.getByRole("progressbar")).toBeVisible();

  for (let guard = 0; guard < 200; guard += 1) {
    await page.locator('input[type="radio"]').first().check();

    const finish = page.getByRole("button", {name: ru.test.finish, exact: true});
    if (await finish.isVisible()) {
      await finish.click();
      return;
    }

    await page.getByRole("button", {name: ru.test.next, exact: true}).click();
  }

  throw new Error("The test never reached its final question.");
}

test("a visitor can walk the whole journey", async ({page}) => {
  // Home → start the test.
  await page.goto("/ru");
  await expect(page.getByRole("heading", {level: 1, name: ru.home.title})).toBeVisible();
  await page.getByRole("link", {name: ru.home.startTest}).first().click();
  await expect(page).toHaveURL(/\/ru\/test$/);

  await page.getByRole("button", {name: ru.test.start}).click();
  await answerEveryQuestion(page);

  // Results with real percentages. The move to the results page is a
  // client-side navigation that first loads the page's data.
  await page.waitForURL(/\/ru\/test\/results$/, {timeout: 60_000});
  await expect(page.getByRole("heading", {level: 1, name: ru.results.title})).toBeVisible();

  const percentages = await page.locator("text=/^\\d+%$/").allTextContents();
  expect(percentages.length).toBeGreaterThanOrEqual(3);
  expect(percentages.some((value) => Number.parseInt(value, 10) > 0)).toBe(true);

  // Top direction.
  await page.getByRole("link", {name: ru.results.exploreDirection}).first().click();
  await expect(page).toHaveURL(/\/ru\/directions\/[^/]+$/);
  const directionHeading = page.getByRole("heading", {level: 1});
  await expect(directionHeading).toBeVisible();

  // A profession inside that direction.
  const professionLink = page
    .locator("section")
    .filter({hasText: ru.directions.professionsTitle})
    .getByRole("link", {name: ru.common.more})
    .first();
  await professionLink.click();
  await expect(page).toHaveURL(/\/ru\/professions\/[^/]+$/);

  // Salary level and demand render from the source values.
  await expect(page.getByText(ru.professions.salaryLevel).first()).toBeVisible();
  await expect(page.getByText(ru.professions.demand).first()).toBeVisible();

  // Through to a university that teaches it.
  const universityCard = page
    .locator("section")
    .filter({hasText: ru.professions.universitiesTitle})
    .getByRole("link", {name: ru.common.more})
    .first();
  await universityCard.click();
  await expect(page).toHaveURL(/\/ru\/universities\/[^/]+$/);
  const universityName = await page.getByRole("heading", {level: 1}).textContent();
  expect(universityName?.trim().length).toBeGreaterThan(0);

  // Save it, then find it in favourites.
  await page.getByRole("button", {name: ru.common.save}).first().click();
  await expect(page.getByRole("button", {name: ru.common.saved})).toBeVisible();

  await page.goto("/ru/favorites");
  await expect(page.getByRole("heading", {level: 1, name: ru.favorites.title})).toBeVisible();
  await expect(page.getByRole("heading", {level: 3, name: universityName!.trim()})).toBeVisible();

  // Admission plan and career path.
  await page.goto("/ru/admission-plan");
  await expect(page.getByRole("heading", {level: 1, name: ru.admissionPlan.title})).toBeVisible();
  await expect(page.getByText(universityName!.trim())).toBeVisible();

  await page.goto("/ru/professions");
  await page.getByRole("link", {name: ru.common.more}).first().click();
  await page.getByRole("button", {name: ru.careerPath.build}).click();
  await page.waitForURL(/\/ru\/career-path\?profession=/, {timeout: 60_000});
  await expect(page.getByRole("heading", {name: ru.careerPath.universitiesTitle})).toBeVisible();

  // The career map opens on its progress slider and every station is rendered.
  await expect(page.getByRole("progressbar", {name: ru.careerPath.progressTitle})).toBeVisible();
  for (const section of [
    ru.careerPath.profileTitle,
    ru.careerPath.directionsTitle,
    ru.careerPath.professionsTitle,
    ru.careerPath.choiceTitle,
    ru.careerPath.admissionTitle,
    ru.careerPath.developmentTitle,
    ru.careerPath.pathTitle,
    ru.careerPath.alternativesTitle
  ]) {
    await expect(page.getByRole("heading", {name: section})).toBeVisible();
  }

  // The profile is built from the answers given above, and ticking a
  // development step moves the progress slider.
  await expect(page.getByText(ru.careerPath.blockCaption.strengths)).toBeVisible();
  const before = await page.getByRole("progressbar").getAttribute("aria-valuenow");
  await page.getByRole("button", {name: ru.careerPath.development.portfolio}).click();
  await expect(page.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow", before ?? "");
});

test("the interface switches fully to Kazakh", async ({page}) => {
  await page.goto("/kk");
  await expect(page.getByRole("heading", {level: 1, name: kk.home.title})).toBeVisible();

  // Navigation, buttons and footer are Kazakh, with no Russian or English left
  // in the interface chrome.
  await expect(page.getByRole("link", {name: kk.home.startTest})).toBeVisible();
  await expect(page.getByText(kk.footer.description)).toBeVisible();
  const home = (await page.locator("body").textContent()) ?? "";
  expect(home).not.toContain(ru.home.title);
  expect(home).not.toContain(ru.navigation.universities);
  expect(home).not.toContain("Find your next path");

  await page.getByRole("link", {name: kk.home.startTest}).first().click();
  await expect(page).toHaveURL(/\/kk\/test$/);
  await expect(page.getByRole("heading", {level: 1, name: kk.test.title})).toBeVisible();
  await page.getByRole("button", {name: kk.test.start}).click();
  await expect(page.getByText(kk.test.chooseOption)).toBeVisible();

  // Catalogue content is Russian only, and the interface says so rather than
  // pretending it is translated.
  await page.goto("/kk/directions");
  await expect(page.getByRole("heading", {level: 1, name: kk.directions.title})).toBeVisible();
  await expect(page.getByText(kk.common.contentLanguageNotice)).toBeVisible();

  const chrome = (await page.getByRole("banner").textContent()) ?? "";
  expect(chrome).toContain(kk.navigation.universities);
  expect(chrome).not.toContain(ru.navigation.universities);
  expect(chrome).not.toContain("Universities");
});

test("the mobile layout never overflows sideways", async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});

  for (const path of [
    "/ru",
    "/ru/test",
    "/ru/directions",
    "/ru/professions",
    "/ru/universities",
    "/ru/favorites",
    "/ru/admission-plan",
    "/ru/career-path",
    "/ru/grants",
    "/ru/search",
    "/ru/about"
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `${path} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1);
  }
});
