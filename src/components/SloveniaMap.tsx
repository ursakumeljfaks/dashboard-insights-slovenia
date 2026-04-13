import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { municipalityData } from "@/data/realEstateData";
import { municipalityCoordinates } from "@/data/municipalityCoordinates";
import "leaflet/dist/leaflet.css";

const SLOVENIA_CENTER: [number, number] = [46.15, 14.95];
const SLOVENIA_ZOOM = 8;
const SLOVENIA_BBOX = "45.4,13.3,46.9,16.6";

type LayerType = "prices" | "affordable" | "expensive";

type POICategory = "post_offices" | "groceries" | "schools" | "pharmacies" | "fuel" | "banks" | "hospitals";

const POI_CONFIG: Record<POICategory, { label: string; query: string; icon: string; color: string }> = {
  post_offices: {
    label: "Pošte",
    query: `[out:json][timeout:25];node["amenity"="post_office"](${SLOVENIA_BBOX});out center;`,
    icon: "📮",
    color: "#e74c3c",
  },
  groceries: {
    label: "Trgovine",
    query: `[out:json][timeout:25];(node["shop"="supermarket"](${SLOVENIA_BBOX});node["shop"="convenience"](${SLOVENIA_BBOX}););out center;`,
    icon: "🛒",
    color: "#2ecc71",
  },
  schools: {
    label: "Šole",
    query: `[out:json][timeout:25];(node["amenity"="school"](${SLOVENIA_BBOX});way["amenity"="school"](${SLOVENIA_BBOX}););out center;`,
    icon: "🏫",
    color: "#3498db",
  },
  pharmacies: {
    label: "Lekarne",
    query: `[out:json][timeout:25];node["amenity"="pharmacy"](${SLOVENIA_BBOX});out center;`,
    icon: "💊",
    color: "#9b59b6",
  },
  fuel: {
    label: "Bencinske črpalke",
    query: `[out:json][timeout:25];node["amenity"="fuel"](${SLOVENIA_BBOX});out center;`,
    icon: "⛽",
    color: "#f39c12",
  },
  banks: {
    label: "Banke",
    query: `[out:json][timeout:25];node["amenity"="bank"](${SLOVENIA_BBOX});out center;`,
    icon: "🏦",
    color: "#1abc9c",
  },
  hospitals: {
    label: "Bolnišnice",
    query: `[out:json][timeout:25];(node["amenity"="hospital"](${SLOVENIA_BBOX});way["amenity"="hospital"](${SLOVENIA_BBOX}););out center;`,
    icon: "🏥",
    color: "#e91e63",
  },
};

function priceToColor(price: number, min: number, max: number): string {
  const range = Math.max(1, max - min);
  const t = Math.max(0, Math.min(1, (price - min) / range));
  if (t < 0.5) {
    const s = t * 2;
    return `rgb(${Math.round(s * 255)}, ${Math.round(s * 255)}, ${Math.round((1 - s) * 255)})`;
  }
  const s = (t - 0.5) * 2;
  return `rgb(255, ${Math.round((1 - s) * 255)}, 0)`;
}

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const SloveniaMap = () => {
  const [activeLayer, setActiveLayer] = useState<LayerType>("prices");
  const [activePOIs, setActivePOIs] = useState<Set<POICategory>>(new Set());
  const [loadingPOIs, setLoadingPOIs] = useState<Set<POICategory>>(new Set());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const poiLayersRef = useRef<Record<string, L.LayerGroup>>({});
  const poiCacheRef = useRef<Record<string, any[]>>({});

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
      Object.values(poiLayersRef.current).forEach((l) => l.clearLayers());
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      poiLayersRef.current = {};
    };
  }, []);

  // Municipality markers
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    visibleData.forEach((d) => {
      const isSingle = d.sampleCount === 1;

      const color =
        activeLayer === "affordable"
          ? "hsl(var(--accent))"
          : activeLayer === "expensive"
            ? "hsl(var(--destructive))"
            : isSingle
              ? "#999999"
              : priceToColor(d.avgPricePerM2, minPrice, maxPrice);

      const radius = Math.max(5, Math.min(15, Math.sqrt(d.sampleCount) * 0.8));

      const marker = L.circleMarker([d.lat, d.lon], {
        radius,
        color: isSingle ? "#666" : color,
        fillColor: color,
        fillOpacity: isSingle ? 0.4 : 0.75,
        weight: isSingle ? 2 : 1,
        dashArray: isSingle ? "4 3" : undefined,
      });

      marker.bindPopup(`
        <div style="font-size:14px;line-height:1.5;min-width:200px;">
          <div style="font-weight:700;font-size:16px;margin-bottom:6px;">${d.municipality}</div>
          ${isSingle ? '<div style="color:#e67e22;font-weight:600;margin-bottom:4px;">⚠️ Samo 1 transakcija – podatek morda ni reprezentativen</div>' : ''}
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

  // POI toggle
  const togglePOI = useCallback(async (category: POICategory) => {
    const map = mapRef.current;
    if (!map) return;

    if (activePOIs.has(category)) {
      // Remove
      poiLayersRef.current[category]?.clearLayers();
      map.removeLayer(poiLayersRef.current[category]);
      delete poiLayersRef.current[category];
      setActivePOIs((prev) => { const n = new Set(prev); n.delete(category); return n; });
      return;
    }

    // Add
    setLoadingPOIs((prev) => new Set(prev).add(category));

    try {
      let elements = poiCacheRef.current[category];
      if (!elements) {
        const res = await fetch(OVERPASS_URL, {
          method: "POST",
          body: `data=${encodeURIComponent(POI_CONFIG[category].query)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        const json = await res.json();
        elements = json.elements || [];
        poiCacheRef.current[category] = elements;
      }

      const cfg = POI_CONFIG[category];
      const group = L.layerGroup();

      elements.forEach((el: any) => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        if (!lat || !lon) return;

        const icon = L.divIcon({
          html: `<div style="font-size:18px;text-align:center;line-height:24px;">${cfg.icon}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          className: "poi-icon",
        });

        const m = L.marker([lat, lon], { icon });
        const name = el.tags?.name || cfg.label;
        m.bindPopup(`<div style="font-size:13px;"><strong>${name}</strong><br/><span style="color:${cfg.color};">${cfg.label}</span></div>`);
        m.addTo(group);
      });

      group.addTo(map);
      poiLayersRef.current[category] = group;
      setActivePOIs((prev) => new Set(prev).add(category));
    } catch (err) {
      console.error(`Failed to load ${category}:`, err);
    } finally {
      setLoadingPOIs((prev) => { const n = new Set(prev); n.delete(category); return n; });
    }
  }, [activePOIs]);

  return (
    <div className="space-y-4">
      {/* Municipality layer toggles */}
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

      {/* POI toggles */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Točke interesa (POI):</p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(POI_CONFIG) as [POICategory, typeof POI_CONFIG[POICategory]][]).map(([key, cfg]) => {
            const isActive = activePOIs.has(key);
            const isLoading = loadingPOIs.has(key);
            return (
              <button
                key={key}
                onClick={() => togglePOI(key)}
                disabled={isLoading}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                } ${isLoading ? "opacity-50 cursor-wait" : ""}`}
              >
                {cfg.icon} {cfg.label}
                {isLoading && " …"}
                {isActive && !isLoading && ` (${poiCacheRef.current[key]?.length ?? 0})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>€{minPrice}</span>
          <div
            className="h-3 w-32 rounded"
            style={{ background: "linear-gradient(to right, rgb(0,0,255), rgb(255,255,0), rgb(255,0,0))" }}
          />
          <span>€{maxPrice}</span>
          <span>Cena/m²</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full border-2 border-dashed" style={{ borderColor: "#666", backgroundColor: "#99999966" }} />
          <span>1 transakcija</span>
        </div>
      </div>

      <div ref={containerRef} className="h-[600px] w-full overflow-hidden rounded-lg border" />
    </div>
  );
};

export default SloveniaMap;
