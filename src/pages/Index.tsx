import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Home,
  Map,
  MapPin,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

import AffordabilityTable from "@/components/AffordabilityTable";
import SalaryVsPriceChart from "@/components/SalaryVsPriceChart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getLeastAffordable,
  getMostAffordable,
  municipalityData,
} from "@/data/realEstateData";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
};

const StatCard = ({ icon: Icon, label, value, sub }: StatCardProps) => (
  <Card className="border-0 bg-card/90 shadow-sm ring-1 ring-border/70">
    <CardContent className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const Index = () => {
  const mostAffordable = getMostAffordable(8);
  const leastAffordable = getLeastAffordable(8);

  const avgPrice = Math.round(
    municipalityData.reduce((s, d) => s + d.avgPricePerM2, 0) /
      municipalityData.length,
  );

  const avgSalary = Math.round(
    municipalityData.reduce((s, d) => s + d.avgNetSalary, 0) /
      municipalityData.length,
  );

  const totalSamples = municipalityData.reduce((s, d) => s + d.sampleCount, 0);

  const mostAffordableName = mostAffordable[0]?.municipality ?? "—";
  const leastAffordableName = leastAffordable[0]?.municipality ?? "—";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Nepremičninski trg Slovenije
          </p>

          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Kje je stanovanje glede na lokalno plačo najbolj dostopno?
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Dashboard primerja cene stanovanj, povprečne neto plače in število
            transakcij po slovenskih občinah.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/map">
                Odpri zemljevid
                <Map className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link to="/methodology">
                Kako beremo podatke?
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-0 bg-primary text-primary-foreground shadow-xl">
          <CardContent className="p-6 sm:p-7">
            <p className="text-sm font-medium uppercase tracking-[0.2em] opacity-80">
              Glavni vpogled
            </p>

            <h2 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl">
              Cena sama po sebi ne pove dovolj.
            </h2>

            <p className="mt-4 leading-7 opacity-90">
              Bolj poštena primerjava nastane, ko ceno/m² primerjamo z lokalno
              plačo in hkrati upoštevamo, koliko transakcij je v občini sploh
              na voljo.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm opacity-80">Najbolj dostopna</p>
                <p className="mt-1 text-xl font-semibold">{mostAffordableName}</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm opacity-80">Najmanj dostopna</p>
                <p className="mt-1 text-xl font-semibold">{leastAffordableName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Home}
          label="Občin v analizi"
          value={municipalityData.length.toString()}
          sub="primerjava po občinah"
        />
        <StatCard
          icon={TrendingUp}
          label="Povprečna cena/m²"
          value={`€${avgPrice.toLocaleString()}`}
          sub="stanovanja v vzorcu"
        />
        <StatCard
          icon={TrendingDown}
          label="Povprečna neto plača"
          value={`€${avgSalary.toLocaleString()}`}
          sub="lokalna kupna moč"
        />
        <StatCard
          icon={MapPin}
          label="Transakcije"
          value={totalSamples.toLocaleString()}
          sub="skupni analizirani vzorec"
        />
      </section>

      <section className="mt-10">
        <Card className="border-0 bg-card/90 shadow-sm ring-1 ring-border/70">
          <CardHeader>
            <CardTitle>Plača vs. cena stanovanj</CardTitle>
            <CardDescription>
              Vsaka točka predstavlja občino. Nižje in bolj desno pomeni boljše
              razmerje med lokalno plačo in ceno stanovanj.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <SalaryVsPriceChart />
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <AffordabilityTable
          title="Najbolj dostopne občine"
          description="Nižje razmerje pomeni, da je cena/m² ugodnejša glede na lokalno neto plačo."
          data={mostAffordable}
          variant="affordable"
        />

        <AffordabilityTable
          title="Najmanj dostopne občine"
          description="Višje razmerje pomeni, da je cena/m² manj ugodna glede na lokalno neto plačo."
          data={leastAffordable}
          variant="expensive"
        />
      </section>
    </div>
  );
};

export default Index;