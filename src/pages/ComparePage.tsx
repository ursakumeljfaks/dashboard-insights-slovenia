import { GitCompareArrows } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MunicipalityComparison from "@/components/compare/MunicipalityComparison";

const ComparePage = () => (
  <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
    <header className="mb-7 max-w-3xl">
      <Badge variant="outline" className="mb-3 gap-1.5 bg-card">
        <GitCompareArrows aria-hidden="true" className="h-3.5 w-3.5" />
        Primerjava občin
      </Badge>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Dve občini, pet jasnih pogledov</h1>
      <p className="mt-3 text-base leading-7 text-muted-foreground sm:text-lg">
        Primerjaj ceno, lokalno neto plačo, dostopnost, število transakcij in kakovost vzorca brez skritega
        točkovanja. Vsaka dimenzija ostane vidna zase.
      </p>
    </header>

    <MunicipalityComparison />
  </div>
);

export default ComparePage;
