import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  Banknote,
  ChartNoAxesColumn,
  House,
  Scale,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  compareMunicipalities,
  getMunicipalityByName,
  municipalityOptions,
  type NumericDifference,
  type SampleConfidence,
} from "@/lib/municipalityComparison";
import ComparisonDimension from "./ComparisonDimension";

const currencyFormatter = new Intl.NumberFormat("sl-SI", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("sl-SI", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("sl-SI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentageFormatter = new Intl.NumberFormat("sl-SI", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const confidenceOrder: Record<SampleConfidence["level"], number> = {
  low: 0,
  medium: 1,
  higher: 2,
};

const confidenceClassName: Record<SampleConfidence["level"], string> = {
  low: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  medium: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  higher:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
};

const relationWord = (difference: NumericDifference, higher: string, lower: string) => {
  if (difference.relation === "equal") return null;
  return difference.relation === "higher" ? higher : lower;
};

const formatPercentageDifference = (difference: NumericDifference) =>
  difference.percentage == null ? "" : ` (${percentageFormatter.format(Math.abs(difference.percentage))} %)`;

const describeCurrencyDifference = (
  firstName: string,
  secondName: string,
  difference: NumericDifference,
  suffix: string,
) => {
  const relation = relationWord(difference, "višja", "nižja");
  if (!relation) return `${firstName} in ${secondName} imata enako prikazano vrednost.`;

  return `Prikazana vrednost za občino ${firstName} je za ${currencyFormatter.format(Math.abs(difference.absolute))}${suffix} ${relation} kot za občino ${secondName}${formatPercentageDifference(difference)}.`;
};

const describeAffordabilityDifference = (
  firstName: string,
  secondName: string,
  difference: NumericDifference,
) => {
  const relation = relationWord(difference, "več", "manj");
  if (!relation) return `Za 1 m² je v obeh občinah potrebnih enako mesečnih neto plač.`;

  return `Za 1 m² je v občini ${firstName} potrebnih za ${decimalFormatter.format(Math.abs(difference.absolute))} mesečne neto plače ${relation} kot v občini ${secondName}${formatPercentageDifference(difference)}.`;
};

const describeTransactionDifference = (
  firstName: string,
  secondName: string,
  difference: NumericDifference,
) => {
  const relation = relationWord(difference, "več", "manj");
  if (!relation) return `Oba občinska agregata temeljita na enakem številu transakcij.`;

  return `Agregat za občino ${firstName} vsebuje ${numberFormatter.format(Math.abs(difference.absolute))} transakcij ${relation} kot agregat za občino ${secondName}.`;
};

const describeConfidenceDifference = (
  firstName: string,
  secondName: string,
  first: SampleConfidence,
  second: SampleConfidence,
) => {
  if (first.level === second.level) {
    return `${firstName} in ${secondName} sta v istem razredu kakovosti vzorca: ${first.shortLabel.toLocaleLowerCase("sl")}.`;
  }

  const relation = confidenceOrder[first.level] > confidenceOrder[second.level] ? "višjem" : "nižjem";
  return `${firstName} je po velikosti vzorca v ${relation} kakovostnem razredu kot ${secondName}.`;
};

const ConfidenceBadge = ({ confidence }: { confidence: SampleConfidence }) => (
  <Badge variant="outline" className={`px-3 py-1 text-sm ${confidenceClassName[confidence.level]}`}>
    {confidence.shortLabel}
  </Badge>
);

const MunicipalityComparison = () => {
  const [firstName, setFirstName] = useState("Ljubljana");
  const [secondName, setSecondName] = useState("Maribor");

  const comparison = useMemo(() => {
    const first = getMunicipalityByName(firstName);
    const second = getMunicipalityByName(secondName);
    return first && second ? compareMunicipalities(first, second) : null;
  }, [firstName, secondName]);

  const swapMunicipalities = () => {
    setFirstName(secondName);
    setSecondName(firstName);
  };

  if (!comparison) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Primerjave ni mogoče prikazati</AlertTitle>
        <AlertDescription>Izbrani občini nista v primerjalnem naboru.</AlertDescription>
      </Alert>
    );
  }

  const { first, second } = comparison;

  return (
    <div className="space-y-5">
      <Alert className="border-amber-300 bg-amber-50/70 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
        <TriangleAlert aria-hidden="true" className="h-4 w-4" />
        <AlertTitle>Pomembna omejitev podatkov</AlertTitle>
        <AlertDescription>
          Primerjalni nabor ne navaja obdobja ali izvora. Zemljevid uporablja ločen, časovno označen nabor brez
          podatkov o plačah, zato teh dveh naborov namenoma ne združujemo. Rezultate uporabljaj kot orientacijo.{" "}
          <Link className="font-medium underline underline-offset-4 hover:no-underline" to="/methodology">
            Preberi metodologijo
          </Link>
          .
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Izberi občini</CardTitle>
          <CardDescription>
            Razlike so izračunane kot občina A glede na občino B. Zamenjava občin obrne smer primerjave.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="municipality-a">
                Občina A
              </label>
              <Select
                value={firstName}
                onValueChange={(value) => value !== secondName && setFirstName(value)}
              >
                <SelectTrigger id="municipality-a" aria-label="Izberi občino A">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {municipalityOptions.map((row) => (
                    <SelectItem
                      key={row.municipality}
                      disabled={row.municipality === secondName}
                      value={row.municipality}
                    >
                      {row.municipality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              aria-label="Zamenjaj občini A in B"
              className="w-full md:w-11 md:px-0"
              onClick={swapMunicipalities}
              size="default"
              title="Zamenjaj občini"
              type="button"
              variant="outline"
            >
              <ArrowLeftRight aria-hidden="true" />
              <span className="md:sr-only">Zamenjaj občini</span>
            </Button>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="municipality-b">
                Občina B
              </label>
              <Select
                value={secondName}
                onValueChange={(value) => value !== firstName && setSecondName(value)}
              >
                <SelectTrigger id="municipality-b" aria-label="Izberi občino B">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {municipalityOptions.map((row) => (
                    <SelectItem
                      key={row.municipality}
                      disabled={row.municipality === firstName}
                      value={row.municipality}
                    >
                      {row.municipality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 rounded-xl border bg-muted/35 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium text-foreground">
          {first.municipality} <span className="text-muted-foreground">proti</span> {second.municipality}
        </p>
        <p className="text-muted-foreground">Pet ločenih pogledov · brez skupne ocene ali zmagovalca</p>
      </div>

      <p aria-live="polite" className="sr-only">
        Primerjava občine {first.municipality} z občino {second.municipality} je posodobljena.
      </p>

      <div className="grid gap-4 xl:grid-cols-2">
        <ComparisonDimension
          id="price-per-square-metre"
          icon={House}
          title="Cena / m²"
          description="Povprečna cena za kvadratni meter v primerjalnem naboru."
          first={{
            name: first.municipality,
            value: (
              <>
                {currencyFormatter.format(comparison.pricePerM2.first)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/ m²</span>
              </>
            ),
          }}
          second={{
            name: second.municipality,
            value: (
              <>
                {currencyFormatter.format(comparison.pricePerM2.second)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/ m²</span>
              </>
            ),
          }}
          difference={describeCurrencyDifference(
            first.municipality,
            second.municipality,
            comparison.pricePerM2.difference,
            "/m²",
          )}
        />

        <ComparisonDimension
          id="local-net-salary"
          icon={Banknote}
          title="Lokalna neto plača"
          description="Povprečna mesečna neto plača, kot je zapisana v istem primerjalnem naboru."
          first={{
            name: first.municipality,
            value: (
              <>
                {currencyFormatter.format(comparison.localNetSalary.first)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/ mesec</span>
              </>
            ),
          }}
          second={{
            name: second.municipality,
            value: (
              <>
                {currencyFormatter.format(comparison.localNetSalary.second)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/ mesec</span>
              </>
            ),
          }}
          difference={describeCurrencyDifference(
            first.municipality,
            second.municipality,
            comparison.localNetSalary.difference,
            "",
          )}
          footnote="Nabor ne pojasni leta plače niti tega, ali meri delovna mesta ali prebivalce občine."
        />

        <ComparisonDimension
          id="affordability-ratio"
          icon={Scale}
          title="Razmerje dostopnosti"
          description="Mesečnih neto plač za 1 m². Nižje razmerje pomeni večjo dostopnost."
          first={{
            name: first.municipality,
            value: (
              <>
                {decimalFormatter.format(comparison.affordabilityRatio.first)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">neto plače</span>
              </>
            ),
          }}
          second={{
            name: second.municipality,
            value: (
              <>
                {decimalFormatter.format(comparison.affordabilityRatio.second)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">neto plače</span>
              </>
            ),
          }}
          difference={describeAffordabilityDifference(
            first.municipality,
            second.municipality,
            comparison.affordabilityRatio.difference,
          )}
          footnote="Formula: povprečna cena/m² ÷ povprečna mesečna neto plača."
        />

        <ComparisonDimension
          id="transaction-count"
          icon={ChartNoAxesColumn}
          title="Število transakcij"
          description="Število zapisov, na katerih temelji prikazani občinski agregat."
          first={{
            name: first.municipality,
            value: numberFormatter.format(comparison.transactionCount.first),
          }}
          second={{
            name: second.municipality,
            value: numberFormatter.format(comparison.transactionCount.second),
          }}
          difference={describeTransactionDifference(
            first.municipality,
            second.municipality,
            comparison.transactionCount.difference,
          )}
          footnote="Več transakcij navadno pomeni stabilnejši agregat, ne pa nujno reprezentativnega vzorca."
        />

        <div className="xl:col-span-2">
          <ComparisonDimension
            id="sample-confidence"
            icon={ShieldCheck}
            title="Kakovost vzorca"
            description="Okvirna kakovost agregata, določena izključno s številom transakcij."
            first={{
              name: first.municipality,
              value: <ConfidenceBadge confidence={comparison.sampleConfidence.first} />,
            }}
            second={{
              name: second.municipality,
              value: <ConfidenceBadge confidence={comparison.sampleConfidence.second} />,
            }}
            difference={describeConfidenceDifference(
              first.municipality,
              second.municipality,
              comparison.sampleConfidence.first,
              comparison.sampleConfidence.second,
            )}
            footnote="Pragovi: manj kot 5 nizka, od 5 do 14 srednja, 15 ali več višja kakovost vzorca. To ni statistični interval zaupanja."
          />
        </div>
      </div>
    </div>
  );
};

export default MunicipalityComparison;
