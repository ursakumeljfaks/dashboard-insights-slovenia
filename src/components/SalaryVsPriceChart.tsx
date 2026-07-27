import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { getScatterData } from "@/data/realEstateData";

const data = getScatterData();
const currencyFormatter = new Intl.NumberFormat("sl-SI");
type ScatterDatum = (typeof data)[number];
type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: ScatterDatum }>;
};

const legendItems = [
  { color: "hsl(var(--chart-positive))", label: "do 1.500 €/m²" },
  { color: "hsl(var(--primary))", label: "1.500–2.500 €/m²" },
  { color: "hsl(var(--chart-negative))", label: "nad 2.500 €/m²" },
];

const getPriceColor = (price: number) => {
  if (price > 2500) return "hsl(var(--chart-negative))";
  if (price > 1500) return "hsl(var(--primary))";
  return "hsl(var(--chart-positive))";
};

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;

  const municipality = payload[0].payload;

  return (
    <div className="min-w-48 rounded-xl border border-border/90 bg-card/95 p-3.5 shadow-[0_18px_45px_-18px_hsl(var(--foreground)/0.4)] backdrop-blur">
      <p className="font-bold tracking-[-0.01em] text-card-foreground">{municipality.name}</p>
      <dl className="mt-2 space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-5">
          <dt className="text-muted-foreground">Neto plača</dt>
          <dd className="font-semibold text-foreground tabular-nums">€{currencyFormatter.format(municipality.x)}</dd>
        </div>
        <div className="flex items-center justify-between gap-5">
          <dt className="text-muted-foreground">Cena/m²</dt>
          <dd className="font-semibold text-foreground tabular-nums">€{currencyFormatter.format(municipality.y)}</dd>
        </div>
        <div className="flex items-center justify-between gap-5">
          <dt className="text-muted-foreground">Transakcije</dt>
          <dd className="font-semibold text-foreground tabular-nums">{currencyFormatter.format(municipality.z)}</dd>
        </div>
      </dl>
    </div>
  );
};

const SalaryVsPriceChart = () => (
  <div className="w-full">
    <div
      className="h-[310px] w-full sm:h-[380px] lg:h-[430px]"
      role="img"
      aria-label={`Razsevni diagram ${data.length} občin. Vodoravna os prikazuje povprečno neto plačo, navpična os ceno na kvadratni meter, velikost pike pa število transakcij.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 12, bottom: 24, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            dataKey="x"
            name="Neto plača"
            height={48}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickFormatter={(value) => `€${currencyFormatter.format(value)}`}
            label={{
              value: "Povprečna neto plača",
              position: "insideBottom",
              offset: -12,
              fill: "hsl(var(--muted-foreground))",
              fontSize: 12,
              fontWeight: 600,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Cena/m²"
            width={64}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickFormatter={(value) => `€${currencyFormatter.format(value)}`}
          />
          <ZAxis type="number" dataKey="z" name="Število transakcij" range={[64, 500]} />
          <Tooltip cursor={{ stroke: "hsl(var(--primary))", strokeDasharray: "3 4", strokeOpacity: 0.45 }} content={<CustomTooltip />} />
          <Scatter data={data}>
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={getPriceColor(entry.y)}
                fillOpacity={0.78}
                stroke="hsl(var(--card))"
                strokeWidth={1.5}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>

    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/70 pt-4" aria-label="Legenda cenovnih razredov">
      <span className="mr-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Cena</span>
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-card"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  </div>
);

export default SalaryVsPriceChart;
