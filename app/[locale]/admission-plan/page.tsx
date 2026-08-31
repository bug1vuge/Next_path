import {getTranslations, setRequestLocale} from "next-intl/server";
import {AdmissionChecklist, type AdmissionUniversity} from "@/components/plan/admission-checklist";
import {ContentNotice} from "@/components/ui/content-notice";
import {PageHeader} from "@/components/ui/page-header";
import {getAdmissionIndex} from "@/lib/catalog";
import {localizedText} from "@/lib/content";
import type {Locale} from "@/lib/locales";

export default async function AdmissionPlanPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admissionPlan");

  const universities = await getAdmissionIndex();
  const items: AdmissionUniversity[] = universities.map((university) => ({
    slug: university.slug,
    name: localizedText(university, "name", locale),
    place: university.city ? `${university.country}, ${university.city}` : university.country,
    exams: university.admission?.exams ?? null,
    ielts: university.admission?.ielts ?? null,
    sat: university.admission?.sat ?? null,
    grants: university.admission?.grants ?? null,
    deadline: university.admission?.deadline ?? null
  }));

  return (
    <div className="container-page pb-16">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <ContentNotice locale={locale} />
      <AdmissionChecklist universities={items} />
    </div>
  );
}
