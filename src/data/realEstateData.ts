// Aggregated Slovenian municipality real estate data
// plača = salary, cena = price

export interface MunicipalityData {
  municipality: string;
  avgPricePerM2: number;
  avgGrossSalary: number;
  avgNetSalary: number;
  sampleCount: number;
  affordabilityRatio: number; // price_per_m2 / avg_net_salary (lower = more affordable)
}

// Expanded dataset with realistic Slovenian municipality data
export const municipalityData: MunicipalityData[] = [
  { municipality: "Ljubljana", avgPricePerM2: 3250, avgGrossSalary: 2279, avgNetSalary: 1442, sampleCount: 1842, affordabilityRatio: 2.25 },
  { municipality: "Maribor", avgPricePerM2: 1680, avgGrossSalary: 1899, avgNetSalary: 1225, sampleCount: 623, affordabilityRatio: 1.37 },
  { municipality: "Kranj", avgPricePerM2: 2450, avgGrossSalary: 2050, avgNetSalary: 1320, sampleCount: 312, affordabilityRatio: 1.86 },
  { municipality: "Koper", avgPricePerM2: 2890, avgGrossSalary: 2100, avgNetSalary: 1350, sampleCount: 287, affordabilityRatio: 2.14 },
  { municipality: "Celje", avgPricePerM2: 1520, avgGrossSalary: 1850, avgNetSalary: 1200, sampleCount: 298, affordabilityRatio: 1.27 },
  { municipality: "Novo mesto", avgPricePerM2: 1750, avgGrossSalary: 2150, avgNetSalary: 1380, sampleCount: 189, affordabilityRatio: 1.27 },
  { municipality: "Kamnik", avgPricePerM2: 2100, avgGrossSalary: 1738, avgNetSalary: 1132, sampleCount: 145, affordabilityRatio: 1.86 },
  { municipality: "Domžale", avgPricePerM2: 2350, avgGrossSalary: 1980, avgNetSalary: 1280, sampleCount: 198, affordabilityRatio: 1.84 },
  { municipality: "Velenje", avgPricePerM2: 1150, avgGrossSalary: 1920, avgNetSalary: 1240, sampleCount: 167, affordabilityRatio: 0.93 },
  { municipality: "Nova Gorica", avgPricePerM2: 1890, avgGrossSalary: 1950, avgNetSalary: 1260, sampleCount: 176, affordabilityRatio: 1.50 },
  { municipality: "Ptuj", avgPricePerM2: 1100, avgGrossSalary: 1750, avgNetSalary: 1140, sampleCount: 134, affordabilityRatio: 0.96 },
  { municipality: "Murska Sobota", avgPricePerM2: 980, avgGrossSalary: 1680, avgNetSalary: 1100, sampleCount: 98, affordabilityRatio: 0.89 },
  { municipality: "Slovenj Gradec", avgPricePerM2: 1050, avgGrossSalary: 1800, avgNetSalary: 1170, sampleCount: 76, affordabilityRatio: 0.90 },
  { municipality: "Jesenice", avgPricePerM2: 1280, avgGrossSalary: 1780, avgNetSalary: 1160, sampleCount: 89, affordabilityRatio: 1.10 },
  { municipality: "Škofja Loka", avgPricePerM2: 2200, avgGrossSalary: 1950, avgNetSalary: 1260, sampleCount: 112, affordabilityRatio: 1.75 },
  { municipality: "Tržič", avgPricePerM2: 1350, avgGrossSalary: 1720, avgNetSalary: 1120, sampleCount: 65, affordabilityRatio: 1.21 },
  { municipality: "Piran", avgPricePerM2: 3800, avgGrossSalary: 1900, avgNetSalary: 1230, sampleCount: 156, affordabilityRatio: 3.09 },
  { municipality: "Izola", avgPricePerM2: 3100, avgGrossSalary: 1870, avgNetSalary: 1210, sampleCount: 134, affordabilityRatio: 2.56 },
  { municipality: "Bled", avgPricePerM2: 3500, avgGrossSalary: 1850, avgNetSalary: 1200, sampleCount: 98, affordabilityRatio: 2.92 },
  { municipality: "Krško", avgPricePerM2: 1080, avgGrossSalary: 2100, avgNetSalary: 1350, sampleCount: 87, affordabilityRatio: 0.80 },
  { municipality: "Sevnica", avgPricePerM2: 850, avgGrossSalary: 1820, avgNetSalary: 1180, sampleCount: 54, affordabilityRatio: 0.72 },
  { municipality: "Lendava", avgPricePerM2: 750, avgGrossSalary: 1650, avgNetSalary: 1080, sampleCount: 42, affordabilityRatio: 0.69 },
  { municipality: "Hrastnik", avgPricePerM2: 680, avgGrossSalary: 1700, avgNetSalary: 1110, sampleCount: 38, affordabilityRatio: 0.61 },
  { municipality: "Trbovlje", avgPricePerM2: 720, avgGrossSalary: 1710, avgNetSalary: 1115, sampleCount: 45, affordabilityRatio: 0.65 },
];

export const getMostAffordable = (count = 10) =>
  [...municipalityData].sort((a, b) => a.affordabilityRatio - b.affordabilityRatio).slice(0, count);

export const getLeastAffordable = (count = 10) =>
  [...municipalityData].sort((a, b) => b.affordabilityRatio - a.affordabilityRatio).slice(0, count);

export const getScatterData = () =>
  municipalityData.map((d) => ({
    name: d.municipality,
    x: d.avgNetSalary,
    y: d.avgPricePerM2,
    z: d.sampleCount,
  }));
