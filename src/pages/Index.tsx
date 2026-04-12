import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SalaryVsPriceChart from "@/components/SalaryVsPriceChart";
import AffordabilityTable from "@/components/AffordabilityTable";
import { getMostAffordable, getLeastAffordable, municipalityData } from "@/data/realEstateData";
import { Home, TrendingDown, TrendingUp, MapPin, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const StatCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) => (
  <Card>
    <CardContent className="flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </CardContent>
  </Card>
);

const Index = () => {
  const mostAffordable = getMostAffordable(8);
  const leastAffordable = getLeastAffordable(8);

  const avgPrice = Math.round(municipalityData.reduce((s, d) => s + d.avgPricePerM2, 0) / municipalityData.length);
  const avgSalary = Math.round(municipalityData.reduce((s, d) => s + d.avgNetSalary, 0) / municipalityData.length);
  const totalSamples = municipalityData.reduce((s, d) => s + d.sampleCount, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-3 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Home className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Nepremičninski trg Slovenije</h1>
            <p className="text-sm text-muted-foreground">Analiza cen stanovanj in plač po občinah</p>
          </div>
          <div className="ml-auto">
            <Link to="/map">
              <Button variant="outline" className="gap-2">
                <Map className="h-4 w-4" />
                Zemljevid
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-6 py-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={MapPin} label="Občin" value={String(municipalityData.length)} sub="v analizi" />
          <StatCard icon={Home} label="Povpr. cena/m²" value={`€${avgPrice.toLocaleString()}`} sub="vse občine" />
          <StatCard icon={TrendingUp} label="Povpr. neto plača" value={`€${avgSalary.toLocaleString()}`} sub="mesečno" />
          <StatCard icon={TrendingDown} label="Transakcij" value={totalSamples.toLocaleString()} sub="v obdobju" />
        </div>

        {/* Scatter chart */}
        <Card>
          <CardHeader>
            <CardTitle>Plača vs. cena stanovanj</CardTitle>
            <CardDescription>
              Primerjava povprečne neto plače in cene na m² po občinah. Velikost kroga prikazuje število transakcij.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SalaryVsPriceChart />
          </CardContent>
        </Card>

        {/* Tables */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <AffordabilityTable
                title="Najbolj dostopne občine"
                description="Najnižje razmerje med ceno/m² in povprečno neto plačo"
                data={mostAffordable}
                variant="affordable"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <AffordabilityTable
                title="Najmanj dostopne občine"
                description="Najvišje razmerje med ceno/m² in povprečno neto plačo"
                data={leastAffordable}
                variant="expensive"
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
