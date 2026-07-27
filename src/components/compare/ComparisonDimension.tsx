import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type MunicipalityValue = {
  name: string;
  value: ReactNode;
};

type ComparisonDimensionProps = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  first: MunicipalityValue;
  second: MunicipalityValue;
  difference: string;
  footnote?: string;
};

const ComparisonDimension = ({
  id,
  icon: Icon,
  title,
  description,
  first,
  second,
  difference,
  footnote,
}: ComparisonDimensionProps) => (
  <section aria-labelledby={`${id}-title`} className="overflow-hidden rounded-xl border bg-card shadow-sm">
    <div className="border-b bg-muted/35 px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 id={`${id}-title`} className="text-base font-semibold leading-6 text-foreground">
            {title}
          </h2>
          <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-px bg-border">
      <div className="min-w-0 bg-card p-4 sm:p-5">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Občina A</p>
        <p className="mt-1 truncate text-sm font-medium text-foreground" title={first.name}>
          {first.name}
        </p>
        <div className="mt-3 text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
          {first.value}
        </div>
      </div>

      <div className="min-w-0 bg-card p-4 sm:p-5">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Občina B</p>
        <p className="mt-1 truncate text-sm font-medium text-foreground" title={second.name}>
          {second.name}
        </p>
        <div className="mt-3 text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
          {second.value}
        </div>
      </div>
    </div>

    <div className="border-t px-4 py-3.5 sm:px-5">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Razlika A glede na B</p>
      <p className="mt-1 text-sm leading-6 text-foreground">{difference}</p>
      {footnote && <p className="mt-1 text-xs leading-5 text-muted-foreground">{footnote}</p>}
    </div>
  </section>
);

export default ComparisonDimension;
