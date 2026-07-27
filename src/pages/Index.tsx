import AffordabilityTable from "@/components/AffordabilityTable";
import SalaryVsPriceChart from "@/components/SalaryVsPriceChart";
import { Button } from "@/components/ui/button";
import { municipalityData } from "@/data/realEstateData";
import {
  ArrowRight,
  Building2,
  Database,
  Info,
  Map,
  MapPin,
  Scale,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

type MarketMetricProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
};

const numberFormatter = new Intl.NumberFormat("sl-SI");

const MarketMetric = ({ icon: Icon, label, value, note }: MarketMetricProps) => (
  <div className="min-w-0 bg-card px-4 py-3.5">
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <p className="text-[0.68rem] font-semibold uppercase leading-4 tracking-[0.12em]">{label}</p>
    </div>
    <div className="mt-2 min-w-0">
      <p className="truncate text-2xl font-bold tracking-[-0.035em] text-foreground tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  </div>
);

const DataStatus = () => (
  <div className="flex flex-col gap-3 rounded-xl border border-border/90 bg-card px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-800">
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Primerjalni podatkovni nabor</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          {municipalityData.length} občin · vir in obdobje agregata še nista dokumentirana
        </p>
      </div>
    </div>
    <Link
      className="ml-10 inline-flex min-h-9 shrink-0 items-center text-xs font-semibold text-primary underline-offset-4 hover:underline sm:ml-0"
      to="/methodology"
    >
      Preveri metodologijo
      <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  </div>
);

const ViewAction = ({
  description,
  icon: Icon,
  label,
  to,
}: {
  description: string;
  icon: LucideIcon;
  label: string;
  to: string;
}) => (
  <Link
    to={to}
    className="group flex min-w-0 items-center gap-3 rounded-lg border border-border/90 bg-card p-3.5 transition-colors hover:border-primary/30 hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
    </div>
    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
  </Link>
);

const Index = () => {
  const comparisonReadyMunicipalities = municipalityData.filter((row) => row.sampleCount >= 15);
  const mostAffordable = [...comparisonReadyMunicipalities]
    .sort((first, second) => first.affordabilityRatio - second.affordabilityRatio)
    .slice(0, 6);
  const leastAffordable = [...comparisonReadyMunicipalities]
    .sort((first, second) => second.affordabilityRatio - first.affordabilityRatio)
    .slice(0, 6);

  const avgPrice = Math.round(municipalityData.reduce((sum, row) => sum + row.avgPricePerM2, 0) / municipalityData.length);
  const avgSalary = Math.round(municipalityData.reduce((sum, row) => sum + row.avgNetSalary, 0) / municipalityData.length);
  const totalSamples = municipalityData.reduce((sum, row) => sum + row.sampleCount, 0);

  return (
    <div>
      <section className="border-b border-border/80 bg-secondary/20" aria-labelledby="page-title">
        <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Pregled trga</p>
              <h1
                id="page-title"
                className="mt-2 text-3xl font-bold tracking-[-0.035em] text-foreground sm:text-4xl"
              >
                Slovenski nepremičninski trg po občinah
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                Primerjajte cene stanovanj z lokalnimi plačami in preverite, koliko transakcij podpira posamezen
                občinski podatek.
              </p>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 lg:flex">
              <Button asChild className="h-11 rounded-lg px-2 min-[360px]:px-4">
                <Link to="/compare">
                  Primerjaj občini
                  <ArrowRight className="hidden h-4 w-4 min-[360px]:block" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-lg bg-card px-2 min-[360px]:px-4">
                <Link to="/map">
                  <Map className="h-4 w-4" aria-hidden="true" />
                  Zemljevid
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8" aria-labelledby="relationship-title">
        <div className="mb-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Analitični pregled</p>
            <Link
              to="/methodology"
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-1 text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 sm:text-sm"
            >
              Metodologija
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <h2 id="relationship-title" className="mt-1.5 text-2xl font-bold tracking-[-0.03em] text-foreground sm:text-3xl">
            Plača vs. cena stanovanj
          </h2>
          <p className="mt-2 max-w-5xl text-sm leading-6 text-muted-foreground">
            Vsaka pika je občina: neto plača (vodoravno) proti ceni na m² (navpično), velikost pike pa prikazuje
            število transakcij, barva pa cenovni razred (glej legendo pod grafom).
          </p>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-border/90 bg-card shadow-[0_24px_70px_-46px_hsl(var(--foreground)/0.4)] xl:grid xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0 p-4 sm:p-5 lg:p-6">
            <SalaryVsPriceChart />
          </div>

          <aside className="border-t border-border/80 bg-secondary/35 p-6 sm:p-8 xl:border-l xl:border-t-0" aria-labelledby="chart-guide-title">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Vodnik po prikazu</p>
            <h3 id="chart-guide-title" className="mt-3 text-xl font-bold tracking-[-0.025em] text-foreground">
              Kako brati graf
            </h3>

            <ol className="mt-6 space-y-6">
              <li className="grid grid-cols-[2rem_1fr] gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card font-mono text-xs font-bold text-primary">
                  1
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Položaj je primerjava</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Desno pomeni višjo plačo, višje pa dražji m².</p>
                </div>
              </li>
              <li className="grid grid-cols-[2rem_1fr] gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card font-mono text-xs font-bold text-primary">
                  2
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Velikost pomeni vzorec</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Večja pika temelji na več transakcijah.</p>
                </div>
              </li>
              <li className="grid grid-cols-[2rem_1fr] gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card font-mono text-xs font-bold text-primary">
                  3
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Barva je cenovni razred</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Ni ocena kakovosti bivanja ali priporočilo.</p>
                </div>
              </li>
            </ol>
          </aside>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <DataStatus />

          <div className="overflow-hidden rounded-xl border border-border/90 bg-border/80">
            <div className="grid h-full grid-cols-2 gap-px xl:grid-cols-4">
              <MarketMetric
                icon={Building2}
                label="Cena / m²"
                value={`€${numberFormatter.format(avgPrice)}`}
                note="neuteženo povp. občin"
              />
              <MarketMetric
                icon={WalletCards}
                label="Neto plača"
                value={`€${numberFormatter.format(avgSalary)}`}
                note="neuteženo povp. občin"
              />
              <MarketMetric
                icon={Database}
                label="Vzorec"
                value={numberFormatter.format(totalSamples)}
                note="transakcij v naboru"
              />
              <MarketMetric
                icon={MapPin}
                label="Občine"
                value={String(municipalityData.length)}
                note="v primerjalnem pregledu"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ViewAction
            icon={Scale}
            label="Primerjaj dve občini"
            description="Pet ločenih meril brez skupne ocene"
            to="/compare"
          />
          <ViewAction
            icon={Map}
            label="Razišči zemljevid"
            description="Cene in transakcije po lokaciji"
            to="/map"
          />
        </div>
      </section>

      <section className="border-y border-border/80 bg-secondary/30" aria-labelledby="affordability-title">
        <div className="mx-auto max-w-[1480px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Dostopnost v kontekstu</p>
              <h2 id="affordability-title" className="mt-3 text-3xl font-bold tracking-[-0.035em] text-foreground sm:text-4xl">
                Razmerje je začetek vprašanja.
              </h2>
            </div>
            <p className="text-sm leading-6 text-muted-foreground lg:text-right">
              Nižje razmerje pomeni manj mesečnih neto plač za en m². Pri sklepanju vedno preverite tudi število
              transakcij.
            </p>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-border/90 bg-card lg:grid lg:grid-cols-2 lg:divide-x lg:divide-border/80">
            <div className="min-w-0 p-5 sm:p-7 lg:p-8">
              <AffordabilityTable
                title="Nižje razmerje"
                description="Najnižja razmerja med občinami z najmanj 15 transakcijami."
                data={mostAffordable}
                variant="affordable"
              />
            </div>
            <div className="min-w-0 border-t border-border/80 p-5 sm:p-7 lg:border-t-0 lg:p-8">
              <AffordabilityTable
                title="Višje razmerje"
                description="Najvišja razmerja med občinami z najmanj 15 transakcijami."
                data={leastAffordable}
                variant="expensive"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-primary/15 bg-primary/[0.055] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <Scale className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">Rang ne nadomesti primerjave.</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Primerjajte vseh pet meril in preverite kakovost obeh vzorcev.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="h-11 shrink-0 rounded-full border-primary/30 bg-card px-5 text-primary hover:bg-primary hover:text-primary-foreground">
              <Link to="/compare">
                Odpri primerjavo
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
