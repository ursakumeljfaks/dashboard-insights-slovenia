import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl } from "react-leaflet";
import { municipalityData } from "@/data/realEstateData";
import { municipalityCoordinates } from "@/data/municipalityCoordinates";
import "leaflet/dist/leaflet.css";

const SLOVENIA_CENTER: [number, number] = [46.15, 14.95];
const SLOVENIA_ZOOM = 8;

function priceToColor(price: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (price - min) / (max - min)));
  // blue -> yellow -> red
  if (t < 0.5) {
    const s = t * 2;
    const r = Math.round(s * 255);
    const g = Math.round(s * 255);
    const b = Math.round((1 - s) * 255);
    return `rgb(${r},${g},${b})`;
  } else {
    const s = (t - 0.5) * 2;
    const r = 255;
    const g = Math.round((1 - s) * 255);
    const b = 0;
    return `rgb(${r},${g},${b})`;
  }
}

type LayerType = "prices" | "affordable" | "expensive";

const SloveniaMap = () => {
  const [activeLayer, setActiveLayer] = useState<LayerType>("prices");

  const mapped = useMemo(() => {
    return municipalityData
      .filter((d) => municipalityCoordinates[d.municipality])
      .map((d) => ({
        ...d,
        lat: municipalityCoordinates[d.municipality][0],
        lon: municipalityCoordinates[d.municipality][1],
      }));
  }, []);

  const prices = mapped.map((d) => d.avgPricePerM2);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const sortedByRatio = useMemo(() => [...mapped].sort((a, b) => a.affordabilityRatio - b.affordabilityRatio), [mapped]);
  const top10 = new Set(sortedByRatio.slice(0, 10).map((d) => d.municipality));
  const bottom10 = new Set(sortedByRatio.slice(-10).map((d) => d.municipality));

  const visibleData = useMemo(() => {
    if (activeLayer === "affordable") return mapped.filter((d) => top10.has(d.municipality));
    if (activeLayer === "expensive") return mapped.filter((d) => bottom10.has(d.municipality));
    return mapped;
  }, [activeLayer, mapped, top10, bottom10]);

  return (
    <div className="space-y-4">
      {/* Layer toggle */}
      <div className="flex flex-wrap gap-2">
        {([
          ["prices", "Vse občine (cena/m²)"],
          ["affordable", "Najbolj dostopne (top 10)"],
          ["expensive", "Najmanj dostopne (top 10)"],
        ] as [LayerType, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveLayer(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeLayer === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>€{minPrice}</span>
        <div
          className="h-3 flex-1 rounded"
          style={{
            background: "linear-gradient(to right, rgb(0,0,255), rgb(255,255,0), rgb(255,0,0))",
          }}
        />
        <span>€{maxPrice}</span>
        <span className="ml-2">Cena/m²</span>
      </div>

      {/* Map */}
      <div className="h-[600px] w-full overflow-hidden rounded-lg border">
        <MapContainer
          center={SLOVENIA_CENTER}
          zoom={SLOVENIA_ZOOM}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {visibleData.map((d) => {
            const color = activeLayer === "affordable"
              ? "hsl(154, 60%, 45%)"
              : activeLayer === "expensive"
              ? "hsl(0, 72%, 51%)"
              : priceToColor(d.avgPricePerM2, minPrice, maxPrice);

            const radius = Math.max(5, Math.min(15, Math.sqrt(d.sampleCount) * 0.8));

            return (
              <CircleMarker
                key={d.municipality}
                center={[d.lat, d.lon]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.75,
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold text-base">{d.municipality}</p>
                    <hr className="my-1" />
                    <p><b>Cena/m²:</b> €{d.avgPricePerM2.toLocaleString()}</p>
                    <p><b>Povpr. neto plača:</b> €{d.avgNetSalary.toLocaleString()}</p>
                    <p><b>Povpr. bruto plača:</b> €{d.avgGrossSalary.toLocaleString()}</p>
                    <p><b>Razmerje dostopnosti:</b> {d.affordabilityRatio.toFixed(2)}</p>
                    <p><b>Št. transakcij:</b> {d.sampleCount}</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default SloveniaMap;
