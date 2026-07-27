import { Button } from "@/components/ui/button";
import { ArrowRight, MapPinned } from "lucide-react";
import { Link } from "react-router-dom";
import SloveniaMap from "@/components/SloveniaMap";

const MapPage = () => {
  return (
    <div className="pb-12">
      <section className="border-b bg-card/55">
        <div className="mx-auto grid max-w-[1480px] gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <MapPinned className="h-4 w-4" aria-hidden="true" />
              Prostorski pregled
            </div>
            <h1 className="text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Od državnega pregleda do konkretne lokacije
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Raziščite cene in transakcije po občinah, nato povečajte zemljevid za podrobnosti o bližnjih
              storitvah. Občinski agregati in filtri transakcijskih točk so namenoma jasno ločeni.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/methodology">Kako brati podatke</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link to="/compare">
                Primerjaj občini
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <SloveniaMap />
      </div>
    </div>
  );
};

export default MapPage;
