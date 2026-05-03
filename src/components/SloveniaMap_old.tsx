import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { municipalityData } from "@/data/realEstateData";
import { municipalityCoordinates } from "@/data/municipalityCoordinates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "leaflet/dist/leaflet.css";

const SLOVENIA_CENTER: [number, number] = [46.15, 14.95];
const SLOVENIA_ZOOM = 8;
const SLOVENIA_BBOX = "45.4,13.3,46.9,16.6";

type LayerType = "prices" | "affordable" | "expensive";

type POICategory =
  | "post_offices"
  | "groceries"
  | "schools"
  | "pharmacies"
  | "fuel"
  | "banks"
  | "hospitals"
  | "telecom_towers";

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
  telecom_towers: {
    label: "Telekom. stolpi",
    query: `[out:json][timeout:25];(node["man_made"="mast"]["tower:type"="communication"](${SLOVENIA_BBOX});node["man_made"="tower"]["tower:type"="communication"](${SLOVENIA_BBOX}););out center;`,
    icon: "📡",
    color: "#607d8b",
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

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SloveniaMap = () => {
  const [activeLayer, setActiveLayer] = useState<LayerType>("prices");
  const [activePOIs, setActivePOIs] = useState<Set<POICategory>>(new Set());
  const [loadingPOIs, setLoadingPOIs] = useState<Set<POICategory>>(new Set());
  const [towerDistances, setTowerDistances] = useState<Record<string, number>>({});
  const [towersLoading, setTowersLoading] = useState(true);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);

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

  const sortedByRatio = useMemo(
    () => [...mapped].sort((a, b) => a.affordabilityRatio - b.affordabilityRatio),
    [mapped],
  );

  const top10 = useMemo(
    () => new Set(sortedByRatio.slice(0, 10).map((d) => d.municipality)),
    [sortedByRatio],
  );

  const bottom10 = useMemo(
    () => new Set(sortedByRatio.slice(-10).map((d) => d.municipality)),
    [sortedByRatio],
  );

  const visibleData = useMemo(() => {
    if (activeLayer === "affordable") return mapped.filter((d) => top10.has(d.municipality));
    if (activeLayer === "expensive") return mapped.filter((d) => bottom10.has(d.municipality));
    return mapped;
  }, [activeLayer, mapped, top10, bottom10]);

  const nationalAvgPrice = useMemo(
    () => Math.round(mapped.reduce((sum, d) => sum + d.avgPricePerM2, 0) / mapped.length),
    [mapped],
  );

  const nationalAvgNetSalary = useMemo(
    () => Math.round(mapped.reduce((sum, d) => sum + d.avgNetSalary, 0) / mapped.length),
    [mapped],
  );

  const priceRankMap = useMemo(
    () =>
      new Map(
        [...mapped]
          .sort((a, b) => b.avgPricePerM2 - a.avgPricePerM2)
          .map((d, idx) => [d.municipality, idx + 1]),
      ),
    [mapped],
  );

  const affordabilityRankMap = useMemo(
    () =>
      new Map(
        [...mapped]
          .sort((a, b) => a.affordabilityRatio - b.affordabilityRatio)
          .map((d, idx) => [d.municipality, idx + 1]),
      ),
    [mapped],
  );

  const selectedData = useMemo(() => {
    if (!selectedMunicipality) return null;

    const d = mapped.find((item) => item.municipality === selectedMunicipality);
    if (!d) return null;

    const towerDist = towerDistances[d.municipality];
    const towerDistText = towersLoading
      ? "Nalaganje…"
      : towerDist == null || towerDist < 0
        ? "Ni podatka"
        : towerDist < 1
          ? `${Math.round(towerDist * 1000)} m`
          : `${towerDist.toFixed(1)} km`;

    const priceDeltaPct = ((d.avgPricePerM2 - nationalAvgPrice) / nationalAvgPrice) * 100;
    const salaryDeltaPct = ((d.avgNetSalary - nationalAvgNetSalary) / nationalAvgNetSalary) * 100;

    let affordabilityStatus = "Srednja dostopnost";
    if (d.affordabilityRatio <= 1.0) affordabilityStatus = "Zelo dostopna";
    else if (d.affordabilityRatio <= 1.3) affordabilityStatus = "Nadpovprečno dostopna";
    else if (d.affordabilityRatio >= 2.0) affordabilityStatus = "Slabo dostopna";

    return {
      ...d,
      priceRank: priceRankMap.get(d.municipality) ?? null,
      affordabilityRank: affordabilityRankMap.get(d.municipality) ?? null,
      priceDeltaPct,
      salaryDeltaPct,
      towerDistText,
      isSingle: d.sampleCount === 1,
      lowSample: d.sampleCount < 5,
      affordabilityStatus,
    };
  }, [
    selectedMunicipality,
    mapped,
    priceRankMap,
    affordabilityRankMap,
    towerDistances,
    towersLoading,
    nationalAvgPrice,
    nationalAvgNetSalary,
  ]);

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

  useEffect(() => {
    const fetchTowers = async () => {
      try {
        const query = POI_CONFIG.telecom_towers.query;
        const res = await fetch(OVERPASS_URL, {
          method: "POST",
          body: `data=${encodeURIComponent(query)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        const json = await res.json();

        const towers = (json.elements || [])
          .map((el: any) => ({ lat: el.lat ?? el.center?.lat, lon: el.lon ?? el.center?.lon }))
          .filter((t: any) => t.lat && t.lon);

        poiCacheRef.current.telecom_towers = json.elements || [];

        const distances: Record<string, number> = {};
        mapped.forEach((d) => {
          let minDist = Infinity;
          towers.forEach((t: { lat: number; lon: number }) => {
            const dist = haversineKm(d.lat, d.lon, t.lat, t.lon);
            if (dist < minDist) minDist = dist;
          });
          distances[d.municipality] = minDist === Infinity ? -1 : minDist;
        });

        setTowerDistances(distances);
      } catch (err) {
        console.error("Failed to preload telecom towers:", err);
      } finally {
        setTowersLoading(false);
      }
    };

    fetchTowers();
  }, [mapped]);

  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    visibleData.forEach((d) => {
      const isSingle = d.sampleCount === 1;
      const isSelected = d.municipality === selectedMunicipality;

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
        radius: isSelected ? radius + 2 : radius,
        color: isSelected ? "#111827" : isSingle ? "#666" : color,
        fillColor: color,
        fillOpacity: isSingle ? 0.4 : 0.75,
        weight: isSelected ? 3 : isSingle ? 2 : 1,
        dashArray: isSingle ? "4 3" : undefined,
      });

      const towerDist = towerDistances[d.municipality];
      const towerDistText = towersLoading
        ? "Nalaganje…"
        : towerDist == null || towerDist < 0
          ? "Ni podatka"
          : towerDist < 1
            ? `${Math.round(towerDist * 1000)} m`
            : `${towerDist.toFixed(1)} km`;

      marker.bindPopup(`
        <div style="font-size:14px;line-height:1.5;min-width:200px;">
          <div style="font-weight:700;font-size:16px;margin-bottom:6px;">${d.municipality}</div>
          ${
            isSingle
              ? '<div style="color:#e67e22;font-weight:600;margin-bottom:4px;">⚠️ Samo 1 transakcija – podatek morda ni reprezentativen</div>'
              : ""
          }
          <div><strong>Cena/m²:</strong> €${d.avgPricePerM2.toLocaleString()}</div>
          <div><strong>Povpr. neto plača:</strong> €${d.avgNetSalary.toLocaleString()}</div>
          <div><strong>Povpr. bruto plača:</strong> €${d.avgGrossSalary.toLocaleString()}</div>
          <div><strong>Razmerje dostopnosti:</strong> ${d.affordabilityRatio.toFixed(2)}</div>
          <div><strong>Št. transakcij:</strong> ${d.sampleCount}</div>
          <div><strong>📡 Najbližji telekom. stolp:</strong> ${towerDistText}</div>
        </div>
      `);

      marker.on("click", () => {
        setSelectedMunicipality(d.municipality);
      });

      marker.addTo(layer);
    });
  }, [
    activeLayer,
    bottom10,
    maxPrice,
    minPrice,
    top10,
    visibleData,
    towerDistances,
    towersLoading,
    selectedMunicipality,
  ]);

  const togglePOI = useCallback(
    async (category: POICategory) => {
      const map = mapRef.current;
      if (!map) return;

      if (activePOIs.has(category)) {
        poiLayersRef.current[category]?.clearLayers();
        map.removeLayer(poiLayersRef.current[category]);
        delete poiLayersRef.current[category];

        setActivePOIs((prev) => {
          const n = new Set(prev);
          n.delete(category);
          return n;
        });
        return;
      }

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

          m.bindPopup(
            `<div style="font-size:13px;"><strong>${name}</strong><br/><span style="color:${cfg.color};">${cfg.label}</span></div>`,
          );

          m.addTo(group);
        });

        group.addTo(map);
        poiLayersRef.current[category] = group;

        setActivePOIs((prev) => new Set(prev).add(category));
      } catch (err) {
        console.error(`Failed to load ${category}:`, err);
      } finally {
        setLoadingPOIs((prev) => {
          const n = new Set(prev);
          n.delete(category);
          return n;
        });
      }
    },
    [activePOIs],
  );

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
              activeLayer === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Točke interesa (POI):</p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(POI_CONFIG) as [POICategory, (typeof POI_CONFIG)[POICategory]][]).map(([key, cfg]) => {
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>€{minPrice}</span>
          <div
            className="h-3 w-32 rounded"
            style={{
              background:
                "linear-gradient(to right, rgb(0,0,255), rgb(255,255,0), rgb(255,0,0))",
            }}
          />
          <span>€{maxPrice}</span>
          <span>Cena/m²</span>
        </div>

        <div className="flex items-center gap-1">
          <div
            className="h-3 w-3 rounded-full border-2 border-dashed"
            style={{ borderColor: "#666", backgroundColor: "#99999966" }}
          />
          <span>1 transakcija</span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div ref={containerRef} className="h-[600px] w-full overflow-hidden rounded-lg border" />

        <Card className="h-fit xl:sticky xl:top-4">
          <CardHeader>
            <CardTitle>Podrobnosti občine</CardTitle>
            <CardDescription>
              Klikni na krog na zemljevidu za podrobnejši vpogled.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!selectedData ? (
              <div className="text-sm text-muted-foreground">
                Trenutno ni izbrane občine. Izberi eno občino na zemljevidu.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xl font-semibold">{selectedData.municipality}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedData.affordabilityStatus}
                  </div>
                </div>

                {(selectedData.isSingle || selectedData.lowSample) && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    {selectedData.isSingle
                      ? "Samo 1 transakcija – ta občina ni zelo reprezentativna."
                      : "Malo transakcij – interpretacija naj bo previdna."}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Cena / m²</div>
                    <div className="text-lg font-semibold">
                      €{selectedData.avgPricePerM2.toLocaleString()}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Neto plača</div>
                    <div className="text-lg font-semibold">
                      €{selectedData.avgNetSalary.toLocaleString()}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Affordability ratio</div>
                    <div className="text-lg font-semibold">
                      {selectedData.affordabilityRatio.toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Št. transakcij</div>
                    <div className="text-lg font-semibold">
                      {selectedData.sampleCount.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Rang po ceni</span>
                    <span className="font-medium">#{selectedData.priceRank}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Rang po dostopnosti</span>
                    <span className="font-medium">#{selectedData.affordabilityRank}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Najbližji telekom stolp</span>
                    <span className="font-medium">{selectedData.towerDistText}</span>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cena vs. povpr. SLO</span>
                    <span
                      className={`font-medium ${
                        selectedData.priceDeltaPct >= 0 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {selectedData.priceDeltaPct >= 0 ? "+" : ""}
                      {selectedData.priceDeltaPct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Neto plača vs. povpr. SLO</span>
                    <span
                      className={`font-medium ${
                        selectedData.salaryDeltaPct >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {selectedData.salaryDeltaPct >= 0 ? "+" : ""}
                      {selectedData.salaryDeltaPct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMunicipality(null)}
                  className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  Počisti izbor
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SloveniaMap;