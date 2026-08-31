import {getTranslations, setRequestLocale} from "next-intl/server";
import {TestRunner, type TestQuestion} from "@/components/test/test-runner";
import {buttonClass} from "@/components/ui/button";
import {PageHeader} from "@/components/ui/page-header";
import {EmptyState} from "@/components/ui/states";
import {Link} from "@/i18n/navigation";
import {getDirectionSlugs, getQuestions} from "@/lib/catalog";
import {localizedText} from "@/lib/content";
import type {Locale} from "@/lib/locales";

export default async function TestPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("test");
  const tCommon = await getTranslations("common");

  const [questions, directionSlugs] = await Promise.all([getQuestions(), getDirectionSlugs()]);

  const items: TestQuestion[] = questions.map((question) => ({
    id: question.id,
    order: question.order,
    block: question.block,
    text: localizedText(question, "text", locale),
    options: question.options.map((option) => ({
      id: option.id,
      text: localizedText(option, "text", locale),
      weights: (option.weights ?? {}) as Record<string, number>
    }))
  }));

  return (
    <div className="container-page pb-16">
      <PageHeader title={t("title")} description={t("intro", {count: items.length})} />
      {items.length === 0 ? (
        <EmptyState
          action={
            <Link className={buttonClass("secondary")} href="/directions">
              {tCommon("more")}
            </Link>
          }
          text={t("emptyText")}
          title={t("emptyTitle")}
        />
      ) : (
        <TestRunner directionSlugs={directionSlugs} questions={items} />
      )}
    </div>
  );
}
