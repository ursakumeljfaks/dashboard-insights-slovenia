import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getScatterData } from "@/data/realEstateData";

const data = getScatterData();

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border bg-card p-3 shadow-md">
        <p className="font-semibold text-card-foreground">{d.name}</p>
        <p className="text-sm text-muted-foreground">
          Neto plača: <span className="font-medium text-foreground">€{d.x.toLocaleString()}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Cena/m²: <span className="font-medium text-foreground">€{d.y.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

const SalaryVsPriceChart = () => {
  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            dataKey="x"
            name="Neto plača"
            unit="€"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            label={{
              value: "Povprečna neto plača (€)",
              position: "insideBottom",
              offset: -10,
              fill: "hsl(var(--muted-foreground))",
              fontSize: 13,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Cena/m²"
            unit="€"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            label={{
              value: "Cena stanovanja (€/m²)",
              angle: -90,
              position: "insideLeft",
              offset: 5,
              fill: "hsl(var(--muted-foreground))",
              fontSize: 13,
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={data} fill="hsl(var(--chart-scatter))">
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.y > 2500
                    ? "hsl(var(--destructive))"
                    : entry.y > 1500
                    ? "hsl(var(--primary))"
                    : "hsl(var(--accent))"
                }
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
