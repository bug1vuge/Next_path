import {getTranslations, setRequestLocale} from "next-intl/server";
import {AdmissionChecklist, type AdmissionUniversity} from "@/components/plan/admission-checklist";
import {PageHeader} from "@/components/ui/page-header";
import {getAdmissionIndex} from "@/lib/catalog";
import {localizedPlace, localizedText, localizedValue} from "@/lib/content";
import type {Locale} from "@/lib/locales";

export default async function AdmissionPlanPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admissionPlan");

  const universities = await getAdmissionIndex();
  const items: AdmissionUniversity[] = universities.map((university) => ({
    slug: university.slug,
    name: localizedText(university, "name", locale),
    place: localizedPlace(university, locale),
    exams: university.admission ? localizedValue(university.admission, "exams", locale) : null,
    ielts: university.admission?.ielts ?? null,
    sat: university.admission?.sat ?? null,
    grants: university.admission?.grants ?? null,
    deadline: university.admission?.deadline ?? null
  }));

  return (
    <div className="container-page pb-16">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <AdmissionChecklist universities={items} />
    </div>
  );
}
