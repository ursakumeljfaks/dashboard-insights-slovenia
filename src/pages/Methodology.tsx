import {
  AlertTriangle,
  BarChart3,
  Database,
  MapPinned,
  Route,
  ShieldCheck,
  Sigma,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const processSteps = [
  {
    title: "1. Zberemo prodaje stanovanj",
    text: "Osnovni vhod so realizirane transakcije stanovanj. To je pomembno, ker dashboard ne primerja oglaševanih cen, temveč cene, pri katerih je do prodaje dejansko prišlo.",
  },
  {
    title: "2. Podatke združimo po občinah",
    text: "Vsako transakcijo povežemo z občino. Tako posamezne prodaje pretvorimo v občinske kazalnike, ki jih lahko primerjamo med seboj.",
  },
  {
    title: "3. Ceno preračunamo na m²",
    text: "Ker stanovanja niso enako velika, absolutna cena ni dovolj dobra za primerjavo. Cena na kvadratni meter omogoči bolj pošteno primerjavo med različnimi prodajami in občinami.",
  },
  {
    title: "4. Ceno primerjamo z lokalno plačo",
    text: "Cena postane zares zanimiva šele, ko jo primerjamo s kupno močjo. Zato ceno na m² delimo s povprečno mesečno neto plačo v občini.",
  },
];

const confidenceLevels = [
  {
    range: "1–4 transakcije",
    title: "Nizka zanesljivost",
    text: "Rezultat je zelo občutljiv na posamezno prodajo. Ena netipična transakcija lahko močno spremeni povprečje, zato takšno občino beremo predvsem kot signal.",
    className: "border-amber-200 bg-amber-50 text-amber-950",
  },
  {
    range: "5–15 transakcij",
    title: "Srednja zanesljivost",
    text: "Vzorec je že uporabnejši, vendar primerjava še vedno zahteva previdnost. Rezultat je smiseln, ni pa nujno dovolj stabilen za močne zaključke.",
    className: "border-sky-200 bg-sky-50 text-sky-950",
  },
  {
    range: "15+ transakcij",
    title: "Višja zanesljivost",
    text: "Rezultat je praviloma stabilnejši, ker ga podpira več prodaj. Takšne občine so primernejše za neposredno primerjavo z drugimi občinami.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-950",
  },
];

const readingRules = [
  "Najprej poglej razmerje dostopnosti, ne samo cene na m².",
  "Nato preveri število transakcij, ker majhen vzorec pomeni večjo negotovost.",
  "Primerjaj tudi plačo, ker nizka cena ni nujno ugodna, če je nizka tudi lokalna kupna moč.",
  "Na zemljevidu preveri prostorski vzorec: ali gre za osamljen primer ali širše regionalno območje.",
  "POI podatke beri kot kontekst, ne kot dokaz, da je lokacija za vsakogar boljša ali slabša.",
];

const limitations = [
  {
    title: "Občinska raven skrije lokalne razlike",
    text: "Znotraj iste občine so lahko zelo različna naselja, soseske in tipi stanovanj. Občinsko povprečje je zato uporabno za širšo primerjavo, ne za oceno posamezne ulice ali stavbe.",
  },
  {
    title: "Cena/m² ne opiše celotne nepremičnine",
    text: "Cena na kvadratni meter ne zajame starosti stavbe, stanja stanovanja, nadstropja, opreme, parkirišča, energetske učinkovitosti ali kakovosti mikrolokacije.",
  },
  {
    title: "Majhni vzorci so lahko zavajajoči",
    text: "Pri občinah z malo prodajami lahko ena zelo poceni ali zelo draga transakcija premakne občino na vrh ali dno lestvice.",
  },
  {
    title: "Bližina storitve ni enaka kakovosti",
    text: "Če je lekarna, šola ali avtobusna postaja blizu, to še ne pomeni, da je storitev kakovostna, dovolj pogosta ali enako uporabna za vse prebivalce.",
  },
];

const Methodology = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div className="max-w-4xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Metodologija
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Kako beremo rezultate?
          </h1>

          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Dashboard ne poskuša preprosto povedati, kje so stanovanja
            najcenejša. To bi bilo premalo. Pri nepremičninah je pomembno
            vprašanje, kako se cena stanovanja poveže z lokalno plačo, koliko
            transakcij podpira rezultat in kakšen prostorski kontekst ima
            občina.
          </p>
        </div>

        <Card className="border-0 bg-primary text-primary-foreground shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Glavna ideja</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="leading-7 text-primary-foreground/90">
              Občina ni nujno najbolj dostopna zato, ker ima najnižjo ceno.
              Bolj pomembno je, koliko lokalnih mesečnih neto plač predstavlja
              en kvadratni meter stanovanja.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-0 bg-card/90 shadow-sm ring-1 ring-border/70">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sigma className="h-5 w-5" />
            </div>
            <CardTitle>Kazalnik dostopnosti</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="rounded-2xl bg-secondary p-5 text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Formula
              </div>

              <div className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                dostopnost = cena/m² ÷ mesečna neto plača
              </div>
            </div>

            <p className="mt-5 leading-7 text-muted-foreground">
              Nižje razmerje pomeni, da je stanovanje glede na lokalno plačo
              bolj dostopno. Če je razmerje{" "}
              <strong className="text-foreground">1.20x</strong>, to pomeni, da
              en kvadratni meter stanovanja stane približno 1.2 povprečne
              mesečne neto plače. Če je razmerje{" "}
              <strong className="text-foreground">2.80x</strong>, je isti
              kvadratni meter glede na lokalno plačo precej manj dostopen.
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card/90 shadow-sm ring-1 ring-border/70">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <CardTitle>Zakaj cena sama ni dovolj?</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="leading-7 text-muted-foreground">
              Občina z nizko ceno na kvadratni meter ni nujno najbolj ugodna,
              če so tam tudi plače nizke. Po drugi strani je lahko občina z
              višjo ceno relativno bolj dostopna, če so tam tudi plače višje.
            </p>

            <div className="mt-5 rounded-2xl border bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
              Zato dashboard ne dela samo lestvice “najcenejših občin”, ampak
              ceno postavi v odnos do lokalne kupne moči.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card className="border-0 bg-card/90 shadow-sm ring-1 ring-border/70">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Route className="h-5 w-5" />
            </div>
            <CardTitle>Kako nastane rezultat?</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {processSteps.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border bg-background/70 p-4"
                >
                  <div className="font-semibold">{step.title}</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        <Card className="border-0 bg-card/90 shadow-sm ring-1 ring-border/70">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <CardTitle>Transakcije kot osnovni signal</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="leading-7 text-muted-foreground">
              Vsaka občinska vrednost izhaja iz prodaj stanovanj. To pomeni, da
              rezultat ni abstrakten indeks, ampak je vezan na dejanske prodaje
              v podatkih. Vendar več transakcij pomeni stabilnejšo sliko trga,
              manj transakcij pa večjo možnost naključnega odstopanja.
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card/90 shadow-sm ring-1 ring-border/70">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <CardTitle>Povprečje in mediana</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="leading-7 text-muted-foreground">
              Povprečna cena je uporabna za splošno primerjavo, vendar je
              občutljiva na ekstremne prodaje. Mediana je pogosto bolj
              robustna, ker bolje pokaže tipično srednjo transakcijo. Zato je
              pri interpretaciji koristno gledati oba pogleda, kadar sta na
              voljo.
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card/90 shadow-sm ring-1 ring-border/70">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MapPinned className="h-5 w-5" />
            </div>
            <CardTitle>Prostorski kontekst</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="leading-7 text-muted-foreground">
              Zemljevid pokaže nekaj, česar tabela ne more: ali so drage in
              dostopnejše občine prostorsko zgoščene, ali gre za širši
              regionalni vzorec in kako se občine razlikujejo po bližini
              vsakodnevnih storitev.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card className="border-0 bg-card/90 shadow-sm ring-1 ring-border/70">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle>Kako zanesljiv je rezultat?</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="mb-5 max-w-4xl leading-7 text-muted-foreground">
              Lestvice občin lahko hitro delujejo zelo dokončno, vendar je pri
              njih pomembno vprašanje: koliko prodaj stoji za izračunom? Občina
              z eno samo transakcijo lahko izgleda izjemno dostopna ali
              izjemno draga, čeprav ta ena prodaja ne predstavlja nujno
              celotnega lokalnega trga.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              {confidenceLevels.map((level) => (
                <div
                  key={level.range}
                  className={`rounded-2xl border p-4 ${level.className}`}
                >
                  <div className="text-sm font-medium">{level.range}</div>
                  <div className="mt-1 text-lg font-semibold">
                    {level.title}
                  </div>
                  <p className="mt-2 text-sm leading-6">{level.text}</p>
                </div>
              ))}
            </div>

            <p className="mt-5 max-w-4xl text-sm leading-6 text-muted-foreground">
              To ne pomeni, da občine z malo transakcijami izločimo. Pomeni
              samo, da jih ne smemo brati enako samozavestno kot občine, kjer
              rezultat podpira večje število prodaj.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-0 bg-primary text-primary-foreground shadow-xl">
          <CardHeader>
            <CardTitle>Kako naj uporabnik bere dashboard?</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {readingRules.map((rule) => (
                <div
                  key={rule}
                  className="rounded-2xl bg-white/10 p-4 text-sm leading-6 text-primary-foreground/90"
                >
                  {rule}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card/90 shadow-sm ring-1 ring-border/70">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <CardTitle>Kaj dashboard lahko pokaže — in česa ne</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="leading-7 text-muted-foreground">
              Dashboard je namenjen primerjavi občin in iskanju vzorcev. Lahko
              pokaže, kje so stanovanja glede na lokalno plačo videti bolj ali
              manj dostopna. Ne more pa sam po sebi oceniti, ali je konkretno
              stanovanje dobra nakupna odločitev.
            </p>

            <div className="mt-5 rounded-2xl border bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
              Za konkreten nakup bi bilo treba upoštevati še stanje
              nepremičnine, mikrolokacijo, leto gradnje, pravno stanje,
              energetsko učinkovitost, stroške vzdrževanja in osebne potrebe
              kupca.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card className="border-0 bg-card/90 shadow-sm ring-1 ring-border/70">
          <CardHeader>
            <CardTitle>Omejitve interpretacije</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {limitations.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border bg-background/70 p-4"
                >
                  <div className="font-semibold">{item.title}</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 rounded-3xl border bg-card/90 p-6 shadow-sm ring-1 ring-border/70">
        <h2 className="text-xl font-semibold">Ključna interpretacija</h2>

        <p className="mt-3 max-w-5xl leading-7 text-muted-foreground">
          Najbolj uporaben rezultat ni nujno najnižja cena na kvadratni meter.
          Bolj pomembno je razmerje med ceno, lokalno plačo in zanesljivostjo
          vzorca. Zato je treba rezultate brati skupaj: cena/m², plača,
          dostopnost, število transakcij in prostorski kontekst.
        </p>

        <p className="mt-3 max-w-5xl leading-7 text-muted-foreground">
          Najboljše vprašanje zato ni samo, katera občina je prva na lestvici,
          ampak zakaj je tam, koliko podatkov podpira ta rezultat in ali gre za
          širši vzorec ali za posledico majhnega števila prodaj.
        </p>
      </section>
    </div>
  );
};

export default Methodology;