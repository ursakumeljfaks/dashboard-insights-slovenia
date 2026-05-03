import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { municipalityData } from "@/data/municipalityAccessibilityLatest";
import { municipalityCoordinates } from "@/data/municipalityCoordinates";
import {
  representativePoiMeta,
  representativePoisLatest,
  type RepresentativePoiCategory,
} from "@/data/representativePoisLatest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "leaflet/dist/leaflet.css";

const SLOVENIA_CENTER: [number, number] = [46.15, 14.95];
const SLOVENIA_ZOOM = 8;

const DEFAULT_REP_CATEGORIES: RepresentativePoiCategory[] = ["grocery", "school", "pharmacy"];

type LayerType = "prices" | "affordable" | "expensive";

function normalizeMunicipalityKey(name: string): string {
  return name.normalize("NFC").trim().toUpperCase();
}

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

function formatDistance(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Ni podatka";
  if (value < 1000) return `${Math.round(value)} m`;
  return `${(value / 1000).toFixed(2)} km`;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Ni podatka";
  return `${(value * 100).toFixed(1)}%`;
}

const SloveniaMap = () => {
  const [activeLayer, setActiveLayer] = useState<LayerType>("prices");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
  const [selectedRepCategories, setSelectedRepCategories] = useState<Set<RepresentativePoiCategory>>(
    new Set(DEFAULT_REP_CATEGORIES),
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const representativeLayerRef = useRef<L.LayerGroup | null>(null);

  const coordinateLookup = useMemo(
    () =>
      new Map(
        Object.entries(municipalityCoordinates).map(([name, coords]) => [
          normalizeMunicipalityKey(name),
          { coords, displayName: name },
        ]),
      ),
    [],
  );

  const mapped = useMemo(
    () =>
      municipalityData
        .map((d) => {
          const lookup = coordinateLookup.get(normalizeMunicipalityKey(d.municipality));
          if (!lookup) return null;

          return {
            ...d,
            municipalityKey: normalizeMunicipalityKey(d.municipality),
            displayMunicipality: lookup.displayName,
            lat: lookup.coords[0],
            lon: lookup.coords[1],
          };
        })
        .filter((d): d is NonNullable<typeof d> => d !== null),
    [coordinateLookup],
  );

  const representativeByMunicipality = useMemo(() => {
    const grouped = new Map<string, (typeof representativePoisLatest)[number][]>();

    representativePoisLatest.forEach((row) => {
      const key = normalizeMunicipalityKey(row.municipality);
      const existing = grouped.get(key) ?? [];
      existing.push(row);
      grouped.set(key, existing);
    });

    return grouped;
  }, []);

  const validPriceRows = useMemo(
    () => mapped.filter((d) => d.avgPricePerM2 != null && Number.isFinite(d.avgPricePerM2)),
    [mapped],
  );

  const hasAffordabilityData = useMemo(
    () => mapped.some((d) => d.affordabilityRatio != null && Number.isFinite(d.affordabilityRatio)),
    [mapped],
  );

  const affordabilityRows = useMemo(
    () => mapped.filter((d) => d.affordabilityRatio != null && Number.isFinite(d.affordabilityRatio)),
    [mapped],
  );

  const minPrice = useMemo(
    () => (validPriceRows.length ? Math.min(...validPriceRows.map((d) => d.avgPricePerM2 ?? 0)) : 0),
    [validPriceRows],
  );

  const maxPrice = useMemo(
    () => (validPriceRows.length ? Math.max(...validPriceRows.map((d) => d.avgPricePerM2 ?? 0)) : 0),
    [validPriceRows],
  );

  const sortedByRatio = useMemo(
    () => [...affordabilityRows].sort((a, b) => (a.affordabilityRatio ?? Infinity) - (b.affordabilityRatio ?? Infinity)),
    [affordabilityRows],
  );

  const top10 = useMemo(
    () => new Set(sortedByRatio.slice(0, 10).map((d) => d.municipalityKey)),
    [sortedByRatio],
  );

  const bottom10 = useMemo(
    () => new Set(sortedByRatio.slice(-10).map((d) => d.municipalityKey)),
    [sortedByRatio],
  );

  const visibleData = useMemo(() => {
    if (!hasAffordabilityData || activeLayer === "prices") return mapped;
    if (activeLayer === "affordable") return mapped.filter((d) => top10.has(d.municipalityKey));
    return mapped.filter((d) => bottom10.has(d.municipalityKey));
  }, [activeLayer, hasAffordabilityData, mapped, top10, bottom10]);

  const nationalAvgPrice = useMemo(
    () =>
      validPriceRows.length
        ? validPriceRows.reduce((sum, d) => sum + (d.avgPricePerM2 ?? 0), 0) / validPriceRows.length
        : null,
    [validPriceRows],
  );

  const validSalaryRows = useMemo(
    () => mapped.filter((d) => d.avgNetSalary != null && Number.isFinite(d.avgNetSalary)),
    [mapped],
  );

  const nationalAvgNetSalary = useMemo(
    () =>
      validSalaryRows.length
        ? validSalaryRows.reduce((sum, d) => sum + (d.avgNetSalary ?? 0), 0) / validSalaryRows.length
        : null,
    [validSalaryRows],
  );

  const priceRankMap = useMemo(
    () =>
      new Map(
        [...validPriceRows]
          .sort((a, b) => (b.avgPricePerM2 ?? -Infinity) - (a.avgPricePerM2 ?? -Infinity))
          .map((d, idx) => [d.municipalityKey, idx + 1]),
      ),
    [validPriceRows],
  );

  const affordabilityRankMap = useMemo(
    () =>
      new Map(
        [...affordabilityRows]
          .sort((a, b) => (a.affordabilityRatio ?? Infinity) - (b.affordabilityRatio ?? Infinity))
          .map((d, idx) => [d.municipalityKey, idx + 1]),
      ),
    [affordabilityRows],
  );

  const selectedData = useMemo(() => {
    if (!selectedMunicipality) return null;

    const d = mapped.find((item) => item.municipalityKey === selectedMunicipality);
    if (!d) return null;

    const priceDeltaPct =
      nationalAvgPrice != null && d.avgPricePerM2 != null
        ? ((d.avgPricePerM2 - nationalAvgPrice) / nationalAvgPrice) * 100
        : null;

    const salaryDeltaPct =
      nationalAvgNetSalary != null && d.avgNetSalary != null
        ? ((d.avgNetSalary - nationalAvgNetSalary) / nationalAvgNetSalary) * 100
        : null;

    let affordabilityStatus: string | null = null;
    if (d.affordabilityRatio != null) {
      if (d.affordabilityRatio <= 1.0) affordabilityStatus = "Zelo dostopna";
      else if (d.affordabilityRatio <= 1.3) affordabilityStatus = "Nadpovprečno dostopna";
      else if (d.affordabilityRatio >= 2.0) affordabilityStatus = "Slabo dostopna";
      else affordabilityStatus = "Srednja dostopnost";
    }

    return {
      ...d,
      priceRank: priceRankMap.get(d.municipalityKey) ?? null,
      affordabilityRank: affordabilityRankMap.get(d.municipalityKey) ?? null,
      priceDeltaPct,
      salaryDeltaPct,
      isSingle: d.sampleCount === 1,
      lowSample: d.sampleCount < 5,
      affordabilityStatus,
    };
  }, [
    selectedMunicipality,
    mapped,
    priceRankMap,
    affordabilityRankMap,
    nationalAvgPrice,
    nationalAvgNetSalary,
  ]);

  const selectedRepresentativePois = useMemo(() => {
    if (!selectedMunicipality) return [];

    return (representativeByMunicipality.get(selectedMunicipality) ?? [])
      .filter((row) => selectedRepCategories.has(row.category))
      .filter(
        (row) =>
          row.repTxLat != null && row.repTxLon != null && row.poiLat != null && row.poiLon != null,
      )
      .sort(
        (a, b) =>
          (a.municipalityMedianDistanceM ?? Number.POSITIVE_INFINITY) -
          (b.municipalityMedianDistanceM ?? Number.POSITIVE_INFINITY),
      );
  }, [selectedMunicipality, representativeByMunicipality, selectedRepCategories]);

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
    representativeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      markersLayerRef.current?.clearLayers();
      representativeLayerRef.current?.clearLayers();
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      representativeLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    visibleData.forEach((d) => {
      const isSingle = d.sampleCount === 1;
      const isSelected = d.municipalityKey === selectedMunicipality;

      const markerColor =
        activeLayer === "affordable" && hasAffordabilityData
          ? "hsl(var(--accent))"
          : activeLayer === "expensive" && hasAffordabilityData
            ? "hsl(var(--destructive))"
            : isSingle
              ? "#999999"
              : priceToColor(d.avgPricePerM2 ?? minPrice, minPrice, maxPrice);

      const radius = Math.max(5, Math.min(15, Math.sqrt(d.sampleCount) * 0.8));

      const marker = L.circleMarker([d.lat, d.lon], {
        radius: isSelected ? radius + 2 : radius,
        color: isSelected ? "#111827" : isSingle ? "#666" : markerColor,
        fillColor: markerColor,
        fillOpacity: isSingle ? 0.4 : 0.75,
        weight: isSelected ? 3 : isSingle ? 2 : 1,
        dashArray: isSingle ? "4 3" : undefined,
      });

      marker.bindPopup(`
        <div style="font-size:14px;line-height:1.5;min-width:220px;">
          <div style="font-weight:700;font-size:16px;margin-bottom:6px;">${d.displayMunicipality}</div>
          <div><strong>Leto:</strong> ${d.saleYear}</div>
          <div><strong>Povpr. cena/m²:</strong> €${(d.avgPricePerM2 ?? 0).toLocaleString()}</div>
          <div><strong>Mediana cena/m²:</strong> ${d.medianPricePerM2 != null ? `€${d.medianPricePerM2.toLocaleString()}` : "Ni podatka"}</div>
          <div><strong>Št. transakcij:</strong> ${d.sampleCount}</div>
          <div><strong>Mediana trgovina:</strong> ${formatDistance(d.medianGroceryM)}</div>
          <div><strong>Mediana šola:</strong> ${formatDistance(d.medianSchoolM)}</div>
          <div><strong>Mediana lekarna:</strong> ${formatDistance(d.medianPharmacyM)}</div>
        </div>
      `);

      marker.on("click", () => {
        setSelectedMunicipality(d.municipalityKey);
      });

      marker.addTo(layer);
    });
  }, [activeLayer, hasAffordabilityData, maxPrice, minPrice, selectedMunicipality, visibleData]);

  useEffect(() => {
    const layer = representativeLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    selectedRepresentativePois.forEach((poi) => {
      const meta = representativePoiMeta[poi.category];

      L.polyline(
        [
          [poi.repTxLat as number, poi.repTxLon as number],
          [poi.poiLat as number, poi.poiLon as number],
        ],
        {
          color: meta.color,
          weight: 2,
          opacity: 0.9,
          dashArray: "6 4",
        },
      )
        .bindPopup(
          `<div style="font-size:13px;line-height:1.45;">
            <strong>${meta.icon} ${meta.label}</strong><br/>
            ${poi.poiName}<br/>
            Razdalja reprezentativne transakcije: <strong>${formatDistance(poi.repTxNearestDistanceM)}</strong>
          </div>`,
        )
        .addTo(layer);

      L.circleMarker([poi.repTxLat as number, poi.repTxLon as number], {
        radius: 5,
        color: meta.color,
        fillColor: "#ffffff",
        fillOpacity: 1,
        weight: 2,
      })
        .bindPopup(
          `<div style="font-size:13px;line-height:1.45;">
            <strong>Reprezentativna transakcija</strong><br/>
            ${meta.label}<br/>
            Cena/m²: ${poi.repTxPricePerM2 != null ? `€${poi.repTxPricePerM2.toLocaleString()}` : "Ni podatka"}<br/>
            Nearest distance: <strong>${formatDistance(poi.repTxNearestDistanceM)}</strong>
          </div>`,
        )
        .addTo(layer);

      const icon = L.divIcon({
        html: `
          <div style="
            width:28px;
            height:28px;
            border-radius:9999px;
            background:#fff;
            border:2px solid ${meta.color};
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:16px;
            box-shadow:0 2px 8px rgba(0,0,0,0.18);
          ">
            ${meta.icon}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        className: "rep-poi-icon",
      });

      L.marker([poi.poiLat as number, poi.poiLon as number], { icon })
        .bindPopup(
          `<div style="font-size:13px;line-height:1.45;">
            <strong>${poi.poiName}</strong><br/>
            <span style="color:${meta.color};">${meta.label}</span><br/>
            Mediana občine: <strong>${formatDistance(poi.municipalityMedianDistanceM)}</strong><br/>
            Razdalja te transakcije: <strong>${formatDistance(poi.repTxNearestDistanceM)}</strong>
            ${poi.repTxDriveDistanceM != null ? `<br/>Drive do AC: <strong>${formatDistance(poi.repTxDriveDistanceM)}</strong>` : ""}
          </div>`,
        )
        .addTo(layer);
    });
  }, [selectedRepresentativePois]);

  const toggleRepresentativeCategory = useCallback((category: RepresentativePoiCategory) => {
    setSelectedRepCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {([
          ["prices", "Vse občine (cena/m²)", false],
          ["affordable", "Najbolj dostopne (top 10)", !hasAffordabilityData],
          ["expensive", "Najmanj dostopne (top 10)", !hasAffordabilityData],
        ] as [LayerType, string, boolean][]).map(([key, label, disabled]) => (
          <button
            key={key}
            onClick={() => !disabled && setActiveLayer(key)}
            disabled={disabled}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeLayer === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {!hasAffordabilityData && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Affordability layer je trenutno izklopljen, ker v novi datoteki še ni salary podatkov.
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Reprezentativne točke interesa za izbrano občino:
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(representativePoiMeta) as [RepresentativePoiCategory, (typeof representativePoiMeta)[RepresentativePoiCategory]][]).map(
            ([key, meta]) => {
              const isActive = selectedRepCategories.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleRepresentativeCategory(key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {meta.icon} {meta.label}
                </button>
              );
            },
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>€{Math.round(minPrice)}</span>
          <div
            className="h-3 w-32 rounded"
            style={{
              background: "linear-gradient(to right, rgb(0,0,255), rgb(255,255,0), rgb(255,0,0))",
            }}
          />
          <span>€{Math.round(maxPrice)}</span>
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div ref={containerRef} className="h-[640px] w-full overflow-hidden rounded-lg border" />

        <Card className="h-fit xl:sticky xl:top-4">
          <CardHeader>
            <CardTitle>Podrobnosti občine</CardTitle>
            <CardDescription>Klikni na krog na zemljevidu za občinske metrike in reprezentativne POI.</CardDescription>
          </CardHeader>

          <CardContent>
            {!selectedData ? (
              <div className="text-sm text-muted-foreground">
                Trenutno ni izbrane občine. Izberi eno občino na zemljevidu.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xl font-semibold">{selectedData.displayMunicipality}</div>
                  <div className="text-sm text-muted-foreground">Leto podatkov: {selectedData.saleYear}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedData.affordabilityStatus ?? "Affordability še ni na voljo v tej verziji podatkov."}
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
                    <div className="text-xs text-muted-foreground">Povpr. cena / m²</div>
                    <div className="text-lg font-semibold">
                      {selectedData.avgPricePerM2 != null ? `€${selectedData.avgPricePerM2.toLocaleString()}` : "Ni podatka"}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Mediana cena / m²</div>
                    <div className="text-lg font-semibold">
                      {selectedData.medianPricePerM2 != null ? `€${selectedData.medianPricePerM2.toLocaleString()}` : "Ni podatka"}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Affordability ratio</div>
                    <div className="text-lg font-semibold">
                      {selectedData.affordabilityRatio != null
                        ? selectedData.affordabilityRatio.toFixed(2)
                        : "Ni podatka"}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Št. transakcij</div>
                    <div className="text-lg font-semibold">{selectedData.sampleCount.toLocaleString()}</div>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border p-3 text-sm">
                  <div className="font-medium">Glavne accessibility metrike</div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mediana trgovina</span>
                    <span className="font-medium">{formatDistance(selectedData.medianGroceryM)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mediana šola</span>
                    <span className="font-medium">{formatDistance(selectedData.medianSchoolM)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mediana lekarna</span>
                    <span className="font-medium">{formatDistance(selectedData.medianPharmacyM)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mediana zdravstvo</span>
                    <span className="font-medium">{formatDistance(selectedData.medianHealthcareM)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mediana AC drive</span>
                    <span className="font-medium">{formatDistance(selectedData.medianMotorwayJunctionDriveM)}</span>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border p-3 text-sm">
                  <div className="font-medium">Deleži bližine</div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Šola znotraj 500 m</span>
                    <span className="font-medium">{formatPercent(selectedData.shareSchoolWithin500m)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Šola znotraj 1000 m</span>
                    <span className="font-medium">{formatPercent(selectedData.shareSchoolWithin1000m)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trgovina znotraj 500 m</span>
                    <span className="font-medium">{formatPercent(selectedData.shareGroceryWithin500m)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trgovina znotraj 1000 m</span>
                    <span className="font-medium">{formatPercent(selectedData.shareGroceryWithin1000m)}</span>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border p-3 text-sm">
                  <div className="font-medium">Rangi in odstopanja</div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Rang po ceni</span>
                    <span className="font-medium">{selectedData.priceRank ? `#${selectedData.priceRank}` : "Ni podatka"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Rang po dostopnosti</span>
                    <span className="font-medium">
                      {selectedData.affordabilityRank ? `#${selectedData.affordabilityRank}` : "Ni podatka"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cena vs. povpr. SLO</span>
                    <span
                      className={`font-medium ${
                        selectedData.priceDeltaPct == null
                          ? "text-muted-foreground"
                          : selectedData.priceDeltaPct >= 0
                            ? "text-red-600"
                            : "text-emerald-600"
                      }`}
                    >
                      {selectedData.priceDeltaPct == null
                        ? "Ni podatka"
                        : `${selectedData.priceDeltaPct >= 0 ? "+" : ""}${selectedData.priceDeltaPct.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Neto plača vs. povpr. SLO</span>
                    <span
                      className={`font-medium ${
                        selectedData.salaryDeltaPct == null
                          ? "text-muted-foreground"
                          : selectedData.salaryDeltaPct >= 0
                            ? "text-emerald-600"
                            : "text-red-600"
                      }`}
                    >
                      {selectedData.salaryDeltaPct == null
                        ? "Ni podatka"
                        : `${selectedData.salaryDeltaPct >= 0 ? "+" : ""}${selectedData.salaryDeltaPct.toFixed(1)}%`}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border p-3 text-sm">
                  <div className="font-medium">Reprezentativne izbrane točke</div>

                  {selectedRepresentativePois.length === 0 ? (
                    <div className="text-muted-foreground">
                      Za to občino ni izbranih reprezentativnih POI vrst ali pa še ni podatkov za izbrane kategorije.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedRepresentativePois.map((poi) => {
                        const meta = representativePoiMeta[poi.category];
                        return (
                          <div
                            key={`${poi.municipality}-${poi.category}`}
                            className="rounded-md border p-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-medium">
                                  {meta.icon} {meta.label}
                                </div>
                                <div className="text-muted-foreground">{poi.poiName}</div>
                              </div>
                              <div className="shrink-0 text-right font-medium">
                                {formatDistance(poi.repTxNearestDistanceM)}
                              </div>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Mediana občine: {formatDistance(poi.municipalityMedianDistanceM)}
                              {poi.repTxDriveDistanceM != null
                                ? ` · Drive do AC: ${formatDistance(poi.repTxDriveDistanceM)}`
                                : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
