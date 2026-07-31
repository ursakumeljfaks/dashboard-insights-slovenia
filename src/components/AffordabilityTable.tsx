import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { MunicipalityData } from "@/data/realEstateData";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AffordabilityTableProps {
  title: string;
  description: string;
  data: MunicipalityData[];
  variant: "affordable" | "expensive";
}

const numberFormatter = new Intl.NumberFormat("sl-SI");

const getConfidenceLabel = (sampleCount: number) => {
  if (sampleCount < 5) return "nizek vzorec";
  if (sampleCount < 15) return "srednji vzorec";
  return "višji vzorec";
};

const AffordabilityTable = ({ title, description, data, variant }: AffordabilityTableProps) => {
  const RatioIcon = variant === "affordable" ? ArrowDownRight : ArrowUpRight;

  return (
    <section aria-labelledby={`${variant}-table-title`}>
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              variant === "affordable" ? "bg-primary" : "bg-[hsl(var(--chart-negative))]"
            }`}
            aria-hidden="true"
          />
          <h3 id={`${variant}-table-title`} className="text-xl font-bold tracking-[-0.025em] text-foreground">
            {title}
          </h3>
        </div>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="-mx-2 overflow-hidden rounded-xl border border-border/80 sm:mx-0">
        <Table className="min-w-[650px]">
          <TableCaption className="sr-only">
            {title}. Stolpec vzorec prikazuje število transakcij, na katerih temelji podatek.
          </TableCaption>
          <TableHeader>
            <TableRow className="border-border/80 bg-secondary/45 hover:bg-secondary/45">
              <TableHead scope="col" className="h-10 w-12 px-3 text-xs font-bold uppercase tracking-[0.1em]">
                #
              </TableHead>
              <TableHead scope="col" className="h-10 px-3 text-xs font-bold uppercase tracking-[0.1em] text-foreground">
                Občina
              </TableHead>
              <TableHead scope="col" className="h-10 px-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-foreground">
                Cena/m²
              </TableHead>
              <TableHead scope="col" className="h-10 px-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-foreground">
                Plača
              </TableHead>
              <TableHead scope="col" className="h-10 px-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-foreground">
                Vzorec
              </TableHead>
              <TableHead scope="col" className="h-10 px-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-foreground">
                Razmerje
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={row.municipality} className="border-border/65 hover:bg-primary/[0.035]">
                <TableCell className="px-3 py-3.5 font-mono text-xs font-semibold text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="px-3 py-3.5 font-semibold text-foreground">{row.municipality}</TableCell>
                <TableCell className="px-3 py-3.5 text-right text-sm text-foreground tabular-nums">
                  €{numberFormatter.format(row.avgPricePerM2)}
                </TableCell>
                <TableCell className="px-3 py-3.5 text-right text-sm text-muted-foreground tabular-nums">
                  €{numberFormatter.format(row.avgNetSalary)}
                </TableCell>
                <TableCell className="px-3 py-3.5 text-right">
                  <span className="font-mono text-xs font-semibold text-foreground">{numberFormatter.format(row.sampleCount)}</span>
                  <span className="sr-only">, {getConfidenceLabel(row.sampleCount)}</span>
                </TableCell>
                <TableCell className="px-3 py-3.5 text-right">
                  <span
                    className={`inline-flex min-w-[4.5rem] items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                      variant === "affordable"
                        ? "bg-primary/10 text-primary"
                        : "bg-[hsl(var(--chart-negative)/0.12)] text-[hsl(var(--chart-negative))]"
                    }`}
                  >
                    <RatioIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {row.affordabilityRatio.toFixed(2)}×
                    <span className="sr-only">{variant === "affordable" ? ", nižje razmerje" : ", višje razmerje"}</span>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Stolpec vzorec prikazuje število transakcij, na katerih temelji podatek. Razmerje pove, koliko mesečnih neto
        plač je potrebnih za en m² stanovanja (cena/m² deljena z neto plačo).
      </p>
    </section>
  );
};

export default AffordabilityTable;
