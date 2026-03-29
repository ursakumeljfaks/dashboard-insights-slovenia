import { MunicipalityData } from "@/data/realEstateData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AffordabilityTableProps {
  title: string;
  description: string;
  data: MunicipalityData[];
  variant: "affordable" | "expensive";
}

const AffordabilityTable = ({ title, description, data, variant }: AffordabilityTableProps) => {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold text-foreground">#</TableHead>
              <TableHead className="font-semibold text-foreground">Občina</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Cena/m²</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Povpr. plača</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Razmerje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={row.municipality} className="hover:bg-muted/30 transition-colors">
                <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                <TableCell className="font-medium">{row.municipality}</TableCell>
                <TableCell className="text-right tabular-nums">€{row.avgPricePerM2.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">€{row.avgNetSalary.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      variant === "affordable"
                        ? "bg-accent/15 text-accent"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {row.affordabilityRatio.toFixed(2)}x
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AffordabilityTable;
