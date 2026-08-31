"use client";

import {useTranslations} from "next-intl";
import {useEffect} from "react";
import {buttonClass} from "@/components/ui/button";
import {ErrorState} from "@/components/ui/states";

export default function LocaleError({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page py-20">
      <ErrorState
        action={
          <button className={buttonClass("primary")} onClick={reset} type="button">
            {t("retry")}
          </button>
        }
        text={t("errorText")}
        title={t("errorTitle")}
      />
    </div>
  );
}
