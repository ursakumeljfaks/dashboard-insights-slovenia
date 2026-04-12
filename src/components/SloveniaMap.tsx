import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { municipalityData } from "@/data/realEstateData";
import { municipalityCoordinates } from "@/data/municipalityCoordinates";
import "leaflet/dist/leaflet.css";

const SLOVENIA_CENTER: [number, number] = [46.15, 14.95];
const SLOVENIA_ZOOM = 8;

type LayerType = "prices" | "affordable" | "expensive";

function priceToColor(price: number, min: number, max: number): string {
  const range = Math.max(1, max - min);
  const t = Math.max(0, Math.min(1, (price - min) / range));

  if (t < 0.5) {
    const s = t * 2;
    const r = Math.round(s * 255);
    const g = Math.round(s * 255);
    const b = Math.round((1 - s) * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  const s = (t - 0.5) * 2;
  return `rgb(255, ${Math.round((1 - s) * 255)}, 0)`;
}

const SloveniaMap = () => {
  const [activeLayer, setActiveLayer] = useState<LayerType>("prices");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const mapped = useMemo(
    () =>
      municipalityData
        .filter((d) => municipalityCoordinates[d.municipality])
        .map((d) => ({
          ...d,
          lat: municipalityCoordinates[d.municipality][0],
          lon: municipalityCoordinates[d.municipality][1],
        })),
    [],
  );

  const prices = mapped.map((d) => d.avgPricePerM2);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const sortedByRatio = useMemo(() => [...mapped].sort((a, b) => a.affordabilityRatio - b.affordabilityRatio), [mapped]);
  const top10 = useMemo(() => new Set(sortedByRatio.slice(0, 10).map((d) => d.municipality)), [sortedByRatio]);
  const bottom10 = useMemo(() => new Set(sortedByRatio.slice(-10).map((d) => d.municipality)), [sortedByRatio]);

  const visibleData = useMemo(() => {
    if (activeLayer === "affordable") return mapped.filter((d) => top10.has(d.municipality));
    if (activeLayer === "expensive") return mapped.filter((d) => bottom10.has(d.municipality));
    return mapped;
  }, [activeLayer, mapped, top10, bottom10]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: SLOVENIA_CENTER,
      zoom: SLOVENIA_ZOOM,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      markersLayerRef.current?.clearLayers();
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    visibleData.forEach((d) => {
      const color =
        activeLayer === "affordable"
          ? "hsl(var(--accent))"
          : activeLayer === "expensive"
            ? "hsl(var(--destructive))"
            : priceToColor(d.avgPricePerM2, minPrice, maxPrice);

      const radius = Math.max(5, Math.min(15, Math.sqrt(d.sampleCount) * 0.8));

      const marker = L.circleMarker([d.lat, d.lon], {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.75,
        weight: 1,
      });

      marker.bindPopup(`
        <div style="font-size:14px;line-height:1.5;min-width:200px;">
          <div style="font-weight:700;font-size:16px;margin-bottom:6px;">${d.municipality}</div>
          <div><strong>Cena/m²:</strong> €${d.avgPricePerM2.toLocaleString()}</div>
          <div><strong>Povpr. neto plača:</strong> €${d.avgNetSalary.toLocaleString()}</div>
          <div><strong>Povpr. bruto plača:</strong> €${d.avgGrossSalary.toLocaleString()}</div>
          <div><strong>Razmerje dostopnosti:</strong> ${d.affordabilityRatio.toFixed(2)}</div>
          <div><strong>Št. transakcij:</strong> ${d.sampleCount}</div>
        </div>
      `);

      marker.addTo(layer);
    });
  }, [activeLayer, bottom10, maxPrice, minPrice, top10, visibleData]);

  return (
    <div className="space-y-4">
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
              activeLayer === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>€{minPrice}</span>
        <div
          className="h-3 flex-1 rounded"
          style={{ background: "linear-gradient(to right, rgb(0,0,255), rgb(255,255,0), rgb(255,0,0))" }}
        />
        <span>€{maxPrice}</span>
        <span className="ml-2">Cena/m²</span>
      </div>

      <div ref={containerRef} className="h-[600px] w-full overflow-hidden rounded-lg border" />
    </div>
  );
};

export default SloveniaMap;
