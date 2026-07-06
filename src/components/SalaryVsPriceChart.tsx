import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getScatterData } from "@/data/realEstateData";

type ScatterTooltipPoint = {
  name: string;
  x: number;
  y: number;
  z: number;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: ScatterTooltipPoint;
  }>;
};

const data = getScatterData();

const avgSalary = Math.round(data.reduce((sum, d) => sum + d.x, 0) / data.length);
const avgPrice = Math.round(data.reduce((sum, d) => sum + d.y, 0) / data.length);

const formatEuro = (value: number) => `€${Math.round(value).toLocaleString()}`;

const getPointColor = (pricePerM2: number) => {
  if (pricePerM2 > 2500) return "hsl(var(--destructive))";
  if (pricePerM2 > 1500) return "hsl(var(--primary))";
  return "hsl(var(--accent))";
};

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;

  const d = payload[0].payload;

  return (
    <div className="min-w-[220px] rounded-2xl border bg-card p-4 shadow-xl">
      <p className="font-semibold">{d.name}</p>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Neto plača</span>
          <span className="font-medium">{formatEuro(d.x)}</span>
        </div>

        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Cena/m²</span>
          <span className="font-medium">{formatEuro(d.y)}</span>
        </div>

        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Transakcije</span>
          <span className="font-medium">{d.z}</span>
        </div>
      </div>
    </div>
  );
};

const SalaryVsPriceChart = () => {
  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 24, bottom: 20, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.35} />

          <XAxis
            type="number"
            dataKey="x"
            name="Neto plača"
            tickFormatter={(value) => formatEuro(Number(value))}
            tick={{ fontSize: 12 }}
            label={{
              value: "Povprečna neto plača",
              position: "insideBottom",
              offset: -8,
            }}
          />

          <YAxis
            type="number"
            dataKey="y"
            name="Cena/m²"
            tickFormatter={(value) => formatEuro(Number(value))}
            tick={{ fontSize: 12 }}
            label={{
              value: "Cena stanovanj / m²",
              angle: -90,
              position: "insideLeft",
            }}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />

          <ReferenceLine
            x={avgSalary}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            label={{
              value: "povpr. plača",
              position: "top",
              fontSize: 12,
            }}
          />

          <ReferenceLine
            y={avgPrice}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            label={{
              value: "povpr. cena",
              position: "right",
              fontSize: 12,
            }}
          />

          <Scatter data={data}>
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={getPointColor(entry.y)}
                fillOpacity={0.82}
                stroke="hsl(var(--background))"
                strokeWidth={1}
                r={Math.max(6, Math.min(16, entry.z / 30))}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalaryVsPriceChart;