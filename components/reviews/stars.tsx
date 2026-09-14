import {Star} from "lucide-react";

/** A read-only 1–5 star rating. `label` is what screen readers hear ("4 из 5"). */
export function Stars({value, label, size = 16}: {value: number; label: string; size?: number}) {
  const filled = Math.round(value);
  return (
    <span aria-label={label} className="inline-flex shrink-0 items-center gap-0.5" role="img">
      {[1, 2, 3, 4, 5].map((position) => (
        <Star
          aria-hidden
          className={position <= filled ? "fill-amber-400 text-amber-400" : "text-border"}
          key={position}
          size={size}
        />
      ))}
    </span>
  );
}
