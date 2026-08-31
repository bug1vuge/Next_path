import {Skeleton} from "@/components/ui/states";

export default function LocaleLoading() {
  return (
    <div aria-busy="true" className="container-page py-14" role="status">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-4 h-5 w-full max-w-xl" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({length: 6}, (_, index) => (
          <Skeleton className="h-44" key={index} />
        ))}
      </div>
    </div>
  );
}
