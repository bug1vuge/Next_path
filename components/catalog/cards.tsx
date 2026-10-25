"use client";

import {
  Brain,
  Briefcase,
  Compass,
  Cpu,
  FlaskConical,
  GraduationCap,
  MapPin,
  Palette,
  Ruler,
  Scale,
  Stethoscope,
  type LucideIcon
} from "lucide-react";
import {useTranslations} from "next-intl";
import {buttonClass, chipClass} from "@/components/ui/button";
import {FavouriteButton} from "@/components/ui/favourite-button";
import {Link} from "@/i18n/navigation";

const ICONS: Record<string, LucideIcon> = {
  cpu: Cpu,
  stethoscope: Stethoscope,
  ruler: Ruler,
  briefcase: Briefcase,
  palette: Palette,
  brain: Brain,
  scale: Scale,
  "flask-conical": FlaskConical,
  compass: Compass
};

export type DirectionCardData = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  professionCount: number;
  skills: string[];
};

export type ProfessionCardData = {
  slug: string;
  name: string;
  description: string;
  directionSlug: string;
  directionName: string;
  salaryLabel: string | null;
  demandLabel: string | null;
  skills: string[];
};

export type UniversityCardData = {
  slug: string;
  name: string;
  country: string;
  city: string;
  ratingLabel: string | null;
  tuition: string | null;
  programCount: number;
};

export function DirectionCard({direction}: {direction: DirectionCardData}) {
  const t = useTranslations("directions");
  const tCommon = useTranslations("common");
  const Icon = ICONS[direction.icon] ?? Compass;

  return (
    <article className="np-card group flex flex-col rounded-3xl border border-border bg-surface p-6 transition-[translate,border-color,box-shadow] duration-500 ease-[cubic-bezier(.22,.9,.25,1)] hover:-translate-y-1 hover:border-brand-soft hover:shadow-[0_24px_48px_-24px_rgb(28_42_57/0.28)]" data-reveal>
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand transition-[rotate,scale,background-color,color] duration-500 ease-[cubic-bezier(.22,.9,.25,1)] group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-brand group-hover:text-white">
          <Icon aria-hidden size={22} />
        </span>
        <FavouriteButton compact kind="direction" slug={direction.slug} />
      </div>
      <h3 className="mt-4 text-lg font-extrabold">{direction.name}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{direction.description}</p>
      {direction.skills.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {direction.skills.slice(0, 4).map((skill) => (
            <li className={chipClass} key={skill}>
              {skill}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-4 text-sm font-bold text-muted">{t("professionsCount", {count: direction.professionCount})}</p>
      <Link className={`${buttonClass("secondary")} mt-5 self-start`} href={`/directions/${direction.slug}`}>
        {tCommon("more")}
      </Link>
    </article>
  );
}

export function ProfessionCard({profession, match}: {profession: ProfessionCardData; match?: number}) {
  const t = useTranslations("professions");
  const tCommon = useTranslations("common");

  return (
    <article className="np-card group flex flex-col rounded-3xl border border-border bg-surface p-6 transition-[translate,border-color,box-shadow] duration-500 ease-[cubic-bezier(.22,.9,.25,1)] hover:-translate-y-1 hover:border-brand-soft hover:shadow-[0_24px_48px_-24px_rgb(28_42_57/0.28)]" data-reveal>
      <div className="flex items-start justify-between gap-3">
        <Link className="text-xs font-bold text-brand hover:underline" href={`/directions/${profession.directionSlug}`}>
          {profession.directionName}
        </Link>
        <FavouriteButton compact kind="profession" slug={profession.slug} />
      </div>
      <h3 className="mt-3 text-lg font-extrabold">{profession.name}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{profession.description}</p>

      <dl className="mt-4 grid gap-1 text-sm">
        {profession.salaryLabel ? (
          <div className="flex gap-2">
            <dt className="text-muted">{t("salaryLevel")}:</dt>
            <dd className="font-semibold">{profession.salaryLabel}</dd>
          </div>
        ) : null}
        {profession.demandLabel ? (
          <div className="flex gap-2">
            <dt className="text-muted">{t("demand")}:</dt>
            <dd className="font-semibold">{profession.demandLabel}</dd>
          </div>
        ) : null}
        {match !== undefined ? (
          <div className="flex gap-2">
            <dt className="text-muted">{t("matchLabel")}:</dt>
            <dd className="font-semibold tabular-nums">{match}%</dd>
          </div>
        ) : null}
      </dl>

      {profession.skills.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {profession.skills.slice(0, 3).map((skill) => (
            <li className={chipClass} key={skill}>
              {skill}
            </li>
          ))}
        </ul>
      ) : null}

      <Link className={`${buttonClass("secondary")} mt-5 self-start`} href={`/professions/${profession.slug}`}>
        {tCommon("more")}
      </Link>
    </article>
  );
}

export function UniversityCard({university}: {university: UniversityCardData}) {
  const t = useTranslations("universities");
  const tCommon = useTranslations("common");

  return (
    <article className="np-card group flex flex-col rounded-3xl border border-border bg-surface p-6 transition-[translate,border-color,box-shadow] duration-500 ease-[cubic-bezier(.22,.9,.25,1)] hover:-translate-y-1 hover:border-brand-soft hover:shadow-[0_24px_48px_-24px_rgb(28_42_57/0.28)]" data-reveal>
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-muted">
          <MapPin aria-hidden size={14} />
          {university.city ? `${university.country}, ${university.city}` : university.country}
        </span>
        <FavouriteButton compact kind="university" slug={university.slug} />
      </div>
      <h3 className="mt-3 text-lg font-extrabold">{university.name}</h3>

      <dl className="mt-4 grid gap-1 text-sm">
        {university.ratingLabel ? (
          <div className="flex gap-2">
            <dt className="text-muted">{t("rating")}:</dt>
            <dd className="font-semibold">{university.ratingLabel}</dd>
          </div>
        ) : null}
        {university.tuition ? (
          <div className="flex gap-2">
            <dt className="text-muted">{t("tuition")}:</dt>
            <dd className="font-semibold">{university.tuition}</dd>
          </div>
        ) : null}
        <div className="flex gap-2">
          <dt className="text-muted">{tCommon("programs")}:</dt>
          <dd className="font-semibold tabular-nums">{university.programCount}</dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center gap-2">
        <Link className={buttonClass("secondary")} href={`/universities/${university.slug}`}>
          {tCommon("more")}
        </Link>
        <span className="grid size-11 place-items-center rounded-full bg-soft text-muted transition-[rotate,scale,color] duration-500 ease-[cubic-bezier(.22,.9,.25,1)] group-hover:-rotate-6 group-hover:scale-110 group-hover:text-brand">
          <GraduationCap aria-hidden size={20} />
        </span>
      </div>
    </article>
  );
}
