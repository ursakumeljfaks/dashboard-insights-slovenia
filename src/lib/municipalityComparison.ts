import { municipalityData, type MunicipalityData } from "@/data/realEstateData";

export type SampleConfidenceLevel = "low" | "medium" | "higher";

export type SampleConfidence = {
  level: SampleConfidenceLevel;
  label: string;
  shortLabel: string;
  description: string;
};

export type NumericDifference = {
  /**
   * Signed difference expressed as municipality A minus municipality B.
   */
  absolute: number;
  /**
   * Signed difference relative to municipality B. Null when B is zero.
   */
  percentage: number | null;
  relation: "higher" | "lower" | "equal";
};

export type NumericComparison = {
  first: number;
  second: number;
  difference: NumericDifference;
};

export type MunicipalityComparison = {
  first: MunicipalityData;
  second: MunicipalityData;
  pricePerM2: NumericComparison;
  localNetSalary: NumericComparison;
  affordabilityRatio: NumericComparison;
  transactionCount: NumericComparison;
  sampleConfidence: {
    first: SampleConfidence;
    second: SampleConfidence;
  };
};

export const municipalityOptions = [...municipalityData].sort((first, second) =>
  first.municipality.localeCompare(second.municipality, "sl"),
);

export function calculateAffordabilityRatio(pricePerM2: number, monthlyNetSalary: number): number | null {
  if (!Number.isFinite(pricePerM2) || !Number.isFinite(monthlyNetSalary) || pricePerM2 < 0 || monthlyNetSalary <= 0) {
    return null;
  }

  return pricePerM2 / monthlyNetSalary;
}

export function calculateNumericDifference(first: number, second: number): NumericDifference {
  const absolute = first - second;
  const percentage = second === 0 ? null : (absolute / Math.abs(second)) * 100;

  return {
    absolute,
    percentage,
    relation: absolute > 0 ? "higher" : absolute < 0 ? "lower" : "equal",
  };
}

export function getSampleConfidence(sampleCount: number): SampleConfidence {
  if (sampleCount < 5) {
    return {
      level: "low",
      label: "Nizka kakovost vzorca",
      shortLabel: "Nizka",
      description: "Manj kot 5 transakcij. Rezultat je zgolj orientacijski.",
    };
  }

  if (sampleCount < 15) {
    return {
      level: "medium",
      label: "Srednja kakovost vzorca",
      shortLabel: "Srednja",
      description: "Od 5 do 14 transakcij. Primerjavo beri previdno.",
    };
  }

  return {
    level: "higher",
    label: "Višja kakovost vzorca",
    shortLabel: "Višja",
    description: "Najmanj 15 transakcij. Večji vzorec je stabilnejši, ni pa jamstvo reprezentativnosti.",
  };
}

export function getMunicipalityByName(name: string): MunicipalityData | undefined {
  return municipalityData.find((row) => row.municipality === name);
}

export function compareMunicipalities(
  first: MunicipalityData,
  second: MunicipalityData,
): MunicipalityComparison {
  const firstAffordabilityRaw = calculateAffordabilityRatio(first.avgPricePerM2, first.avgNetSalary);
  const secondAffordabilityRaw = calculateAffordabilityRatio(second.avgPricePerM2, second.avgNetSalary);

  if (firstAffordabilityRaw == null || secondAffordabilityRaw == null) {
    throw new Error("Za izračun dostopnosti sta potrebni veljavna cena/m² in pozitivna mesečna neto plača.");
  }

  // The interface displays the ratio to two decimals, so comparisons use the
  // same precision and never describe two identical displayed values as different.
  const firstAffordability = Number(firstAffordabilityRaw.toFixed(2));
  const secondAffordability = Number(secondAffordabilityRaw.toFixed(2));

  return {
    first,
    second,
    pricePerM2: {
      first: first.avgPricePerM2,
      second: second.avgPricePerM2,
      difference: calculateNumericDifference(first.avgPricePerM2, second.avgPricePerM2),
    },
    localNetSalary: {
      first: first.avgNetSalary,
      second: second.avgNetSalary,
      difference: calculateNumericDifference(first.avgNetSalary, second.avgNetSalary),
    },
    affordabilityRatio: {
      first: firstAffordability,
      second: secondAffordability,
      difference: calculateNumericDifference(firstAffordability, secondAffordability),
    },
    transactionCount: {
      first: first.sampleCount,
      second: second.sampleCount,
      difference: calculateNumericDifference(first.sampleCount, second.sampleCount),
    },
    sampleConfidence: {
      first: getSampleConfidence(first.sampleCount),
      second: getSampleConfidence(second.sampleCount),
    },
  };
}
