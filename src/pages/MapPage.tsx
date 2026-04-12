import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Map } from "lucide-react";
import { Link } from "react-router-dom";
import SloveniaMap from "@/components/SloveniaMap";

const MapPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-3 px-6 py-5">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Map className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Zemljevid Slovenije</h1>
            <p className="text-sm text-muted-foreground">Interaktivni prikaz cen stanovanj po občinah</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Cene stanovanj po občinah</CardTitle>
            <CardDescription>
              Vsak krog predstavlja občino. Barva prikazuje ceno/m², velikost pa število transakcij.
              Kliknite na krog za podrobnosti.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SloveniaMap />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MapPage;
