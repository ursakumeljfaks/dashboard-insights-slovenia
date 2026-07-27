import { describe, expect, it } from "vitest";
import type { MunicipalityData } from "@/data/realEstateData";
import {
  calculateAffordabilityRatio,
  calculateNumericDifference,
  compareMunicipalities,
  getSampleConfidence,
  municipalityOptions,
} from "@/lib/municipalityComparison";

const makeMunicipality = (overrides: Partial<MunicipalityData> = {}): MunicipalityData => ({
  municipality: "Testna občina",
  avgPricePerM2: 2_000,
  avgGrossSalary: 1_500,
  avgNetSalary: 1_000,
  sampleCount: 15,
  affordabilityRatio: 2,
  ...overrides,
});

describe("calculateAffordabilityRatio", () => {
  it("izračuna število mesečnih neto plač za 1 m²", () => {
    expect(calculateAffordabilityRatio(2_250, 1_500)).toBe(1.5);
  });

  it("zavrne manjkajočo ali neveljavno plačo", () => {
    expect(calculateAffordabilityRatio(2_250, 0)).toBeNull();
    expect(calculateAffordabilityRatio(2_250, Number.NaN)).toBeNull();
  });
});

describe("getSampleConfidence", () => {
  it.each([
    [0, "low"],
    [4, "low"],
    [5, "medium"],
    [14, "medium"],
    [15, "higher"],
  ] as const)("za n=%i vrne razred %s", (sampleCount, expectedLevel) => {
    expect(getSampleConfidence(sampleCount).level).toBe(expectedLevel);
  });
});

describe("calculateNumericDifference", () => {
  it("razliko izrazi kot A minus B in odstotek glede na B", () => {
    expect(calculateNumericDifference(120, 100)).toEqual({
      absolute: 20,
      percentage: 20,
      relation: "higher",
    });
  });

  it("pri ničelni primerjalni osnovi odstotka ne izračuna", () => {
    expect(calculateNumericDifference(10, 0).percentage).toBeNull();
  });
});

describe("compareMunicipalities", () => {
  it("vrne pet ločenih primerjalnih dimenzij brez skupne ocene", () => {
    const first = makeMunicipality({
      municipality: "Občina A",
      avgPricePerM2: 2_400,
      avgNetSalary: 1_200,
      sampleCount: 4,
    });
    const second = makeMunicipality({
      municipality: "Občina B",
      avgPricePerM2: 1_800,
      avgNetSalary: 1_500,
      sampleCount: 15,
    });

    const comparison = compareMunicipalities(first, second);

    expect(comparison.pricePerM2.difference.absolute).toBe(600);
    expect(comparison.localNetSalary.difference.absolute).toBe(-300);
    expect(comparison.affordabilityRatio.first).toBe(2);
    expect(comparison.affordabilityRatio.second).toBe(1.2);
    expect(comparison.transactionCount.difference.absolute).toBe(-11);
    expect(comparison.sampleConfidence.first.level).toBe("low");
    expect(comparison.sampleConfidence.second.level).toBe("higher");
    expect(comparison).not.toHaveProperty("score");
    expect(comparison).not.toHaveProperty("winner");
  });

  it("razliko dostopnosti uskladi z vrednostjo, prikazano na dve decimalki", () => {
    const first = makeMunicipality({
      municipality: "Duplek",
      avgPricePerM2: 1_568,
      avgNetSalary: 1_196,
    });
    const second = makeMunicipality({
      municipality: "Velenje",
      avgPricePerM2: 1_724,
      avgNetSalary: 1_315,
    });

    const comparison = compareMunicipalities(first, second);

    expect(comparison.affordabilityRatio.first).toBe(1.31);
    expect(comparison.affordabilityRatio.second).toBe(1.31);
    expect(comparison.affordabilityRatio.difference).toEqual({
      absolute: 0,
      percentage: 0,
      relation: "equal",
    });
  });
});

describe("municipalityOptions", () => {
  it("izloči znani podvojeni okrajšavi občinskih imen", () => {
    const names = municipalityOptions.map((row) => row.municipality);

    expect(names).not.toContain("Sv. Trojica V Slov. Goricah");
    expect(names).not.toContain("Sveti Jurij V Slov. Goricah");
    expect(new Set(names).size).toBe(names.length);
  });
});
