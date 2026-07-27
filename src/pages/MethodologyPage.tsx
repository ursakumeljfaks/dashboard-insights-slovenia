import { Link } from "react-router-dom";
import { ArrowRight, Calculator, Database, Info, ShieldCheck, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const dimensions = [
  {
    number: "01",
    title: "Cena / m²",
    body: "Povprečna cena za kvadratni meter, zapisana v primerjalnem občinskem naboru. Ker nabor ne vsebuje obdobja, je ne predstavljamo kot trenutno tržno ceno.",
  },
  {
    number: "02",
    title: "Lokalna neto plača",
    body: "Povprečna mesečna neto plača iz istega nabora. Vir, leto in pomen lokalnosti niso dokumentirani, zato je podatek orientacijski.",
  },
  {
    number: "03",
    title: "Razmerje dostopnosti",
    body: "Povprečno ceno/m² delimo s povprečno mesečno neto plačo. Rezultat pove, koliko mesečnih neto plač je potrebnih za 1 m²; nižje je dostopnejše.",
  },
  {
    number: "04",
    title: "Število transakcij",
    body: "Število zapisov, uporabljenih v občinskem agregatu. V primerjavi pokažemo tudi absolutno razliko med občinama.",
  },
  {
    number: "05",
    title: "Kakovost vzorca",
    body: "Opisni razred, ki temelji samo na številu transakcij: manj kot 5 nizka, od 5 do 14 srednja, 15 ali več višja kakovost vzorca.",
  },
];

const MethodologyPage = () => (
  <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
    <header className="max-w-3xl">
      <Badge variant="outline" className="mb-3 gap-1.5 bg-card">
        <Info aria-hidden="true" className="h-3.5 w-3.5" />
        Metodologija
      </Badge>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Kako brati primerjavo občin</h1>
      <p className="mt-3 text-base leading-7 text-muted-foreground sm:text-lg">
        Primerjava namerno ne združuje petih dimenzij v skupno oceno. Tako ostanejo predpostavke, razlike in omejitve
        podatkov vidne.
      </p>
    </header>

    <Alert className="mt-7 border-amber-300 bg-amber-50/70 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
      <TriangleAlert aria-hidden="true" className="h-4 w-4" />
      <AlertTitle>Rezultati so orientacijski</AlertTitle>
      <AlertDescription>
        Primerjalni nabor ne dokumentira obdobja, izvora ali postopka zbiranja. Zato iz njega ni mogoče zanesljivo
        sklepati o trenutnem trgu ali vzročnih razlikah med občinami.
      </AlertDescription>
    </Alert>

    <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
      <Card>
        <CardHeader>
          <div
            aria-hidden="true"
            className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Database className="h-5 w-5" />
          </div>
          <CardTitle>Podatkovna osnova tega MVP-ja</CardTitle>
          <CardDescription>En vir za vseh pet prikazanih dimenzij.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
          <p>
            Primerjava uporablja agregirane vrstice iz <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">realEstateData.ts</code>,
            ker je to edini trenutni projektni nabor, ki za isto občinsko vrstico vsebuje ceno, plačo in število
            transakcij.
          </p>
          <p>
            Dve prepoznani skrajšani podvojitvi občinskih imen sta iz primerjave izločeni. Nasprotujočih vrednosti ne
            združujemo, ker nabor nima izvora, ki bi upravičil izbiro ali tehtano povprečje.
          </p>
          <p>
            Zemljevid uporablja ločen nabor <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">municipalityAccessibilityLatest.ts</code>.
            Ta vsebuje leta cen in podatke o dostopnosti storitev, vendar nima plač. Občinske primerjave na zemljevidu
            omejimo na najnovejše leto v tem naboru, naborov pa ne združujemo, saj bi s tem povezali časovno
            neopredeljene plače z drugimi cenami. Referenčno povprečje cene na zemljevidu je tehtano s številom
            transakcij v prikazanih občinskih agregatih.
          </p>
          <p>
            Za metodološko močnejšo prihodnjo različico morajo cene in plače imeti naveden vir, isto primerljivo
            obdobje ter jasno definicijo vrste nepremičnine.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div
            aria-hidden="true"
            className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Calculator className="h-5 w-5" />
          </div>
          <CardTitle>Formula dostopnosti</CardTitle>
          <CardDescription>Mesečnih neto plač za 1 m².</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-muted/40 p-4 text-center">
            <div className="text-sm font-medium text-foreground">povprečna cena / m²</div>
            <div aria-hidden="true" className="mx-auto my-2 h-px w-40 bg-foreground/40" />
            <div className="text-sm font-medium text-foreground">povprečna mesečna neto plača</div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Primer: rezultat 2,00 pomeni dve povprečni mesečni neto plači za 1 m². Razmerje ne upošteva velikosti
            stanovanja, prihrankov, kredita, obresti ali drugih življenjskih stroškov. Prikazane vrednosti in njihove
            razlike so zaokrožene na dve decimalki.
          </p>
        </CardContent>
      </Card>
    </div>

    <section aria-labelledby="dimensions-title" className="mt-9">
      <div className="max-w-3xl">
        <h2 id="dimensions-title" className="text-2xl font-semibold tracking-tight text-foreground">
          Pet ločenih dimenzij
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Pri številskih dimenzijah je razlika vedno izračunana kot občina A minus občina B; odstotek je glede na
          občino B.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {dimensions.map((dimension, index) => (
          <article
            key={dimension.number}
            className={`rounded-xl border bg-card p-5 shadow-sm ${index === dimensions.length - 1 ? "md:col-span-2" : ""}`}
          >
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="font-mono text-xs font-semibold tracking-widest text-primary"
              >
                {dimension.number}
              </span>
              <div>
                <h3 className="font-semibold text-foreground">{dimension.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{dimension.body}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>

    <section aria-labelledby="confidence-title" className="mt-9">
      <Card>
        <CardHeader>
          <div
            aria-hidden="true"
            className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle id="confidence-title">Kaj “kakovost vzorca” pomeni — in česa ne</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-muted-foreground md:grid-cols-3">
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
            <p className="font-semibold">Nizka · n &lt; 5</p>
            <p className="mt-1">Zelo majhen vzorec; rezultat je predvsem orientacija.</p>
          </div>
          <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 text-sky-950 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-100">
            <p className="font-semibold">Srednja · n = 5–14</p>
            <p className="mt-1">Primerjava je uporabna, vendar občutljiva na posamezne transakcije.</p>
          </div>
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100">
            <p className="font-semibold">Višja · n ≥ 15</p>
            <p className="mt-1">Večji vzorec je stabilnejši, a še vedno ni dokaz reprezentativnosti.</p>
          </div>
          <p className="md:col-span-3">
            Ti razredi niso statistični intervali zaupanja. Ne merijo razpršenosti cen, pristranskosti izbora,
            popolnosti zajema ali primerljivosti prodanih stanovanj.
          </p>
        </CardContent>
      </Card>
    </section>

    <section aria-labelledby="limitations-title" className="mt-9 rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <h2 id="limitations-title" className="text-xl font-semibold text-foreground">
        Pri interpretaciji upoštevaj
      </h2>
      <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground md:grid-cols-2">
        <li className="rounded-lg bg-muted/45 p-4">Neznano obdobje pomeni, da vrednosti niso nujno časovno primerljive.</li>
        <li className="rounded-lg bg-muted/45 p-4">“Lokalna plača” v viru ni natančno definirana.</li>
        <li className="rounded-lg bg-muted/45 p-4">Povprečje je lahko občutljivo na izjemno drage ali poceni prodaje.</li>
        <li className="rounded-lg bg-muted/45 p-4">Več transakcij ne odpravi pristranskosti ali razlik v tipu stanovanj.</li>
      </ul>
    </section>

    <div className="mt-9 flex flex-col gap-3 rounded-xl border bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-foreground">Primerjaj brez skupne ocene</p>
        <p className="mt-1 text-sm text-muted-foreground">Vrni se k petim dimenzijam in preveri konkretni občini.</p>
      </div>
      <Button asChild className="shrink-0">
        <Link to="/compare">
          Odpri primerjavo
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  </div>
);

export default MethodologyPage;
