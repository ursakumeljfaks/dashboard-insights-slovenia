import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

const SLOVENIA_CENTER: [number, number] = [46.15, 14.95];
const SLOVENIA_ZOOM = 8;
const SLOVENIA_MIN_ZOOM = 8;
const SLOVENIA_MAX_ZOOM = 18;
const SLOVENIA_MAX_BOUNDS: L.LatLngBoundsExpression = [
  [45.35, 13.2],
  [46.95, 16.75],
];
const SLOVENIA_BBOX = "45.4,13.3,46.9,16.6";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

type LayerType = "prices" | "affordable" | "expensive";
type GeoJsonFeature = GeoJSON.Feature<GeoJSON.Geometry, Record<string, any>>;
type GeoJsonFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, Record<string, any>>;

type POICategory =
  | "school"
  | "kindergarten"
  | "grocery"
  | "healthcare"
  | "pharmacy"
  | "park"
  | "bus_stop"
  | "rail_stop"
  | "motorway_junction";

type PoiConfig = {
  label: string;
  icon: string;
  color: string;
  query: string;
};

type LoadedPoi = {
  id: string;
  category: POICategory;
  name: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
};

type ClickProbe = {
  lat: number;
  lon: number;
};

type NearestPoiResult = LoadedPoi & {
  distanceM: number;
};

const DEFAULT_POI_CATEGORIES: POICategory[] = /*["grocery", "school", "pharmacy", "healthcare"]*/ [];

const POI_CONFIG: Record<POICategory, PoiConfig> = {
  school: {
    label: "Šole",
    icon: "🏫",
    color: "#3498db",
    query: `[out:json][timeout:35];(
      node["amenity"="school"](${SLOVENIA_BBOX});
      way["amenity"="school"](${SLOVENIA_BBOX});
      relation["amenity"="school"](${SLOVENIA_BBOX});
    );out center;`,
  },
  kindergarten: {
    label: "Vrtci",
    icon: "🧒",
    color: "#f39c12",
    query: `[out:json][timeout:35];(
      node["amenity"="kindergarten"](${SLOVENIA_BBOX});
      way["amenity"="kindergarten"](${SLOVENIA_BBOX});
      relation["amenity"="kindergarten"](${SLOVENIA_BBOX});
    );out center;`,
  },
  grocery: {
    label: "Trgovine",
    icon: "🛒",
    color: "#2ecc71",
    query: `[out:json][timeout:35];(
      node["shop"~"^(supermarket|convenience|grocery|greengrocer)$"](${SLOVENIA_BBOX});
      way["shop"~"^(supermarket|convenience|grocery|greengrocer)$"](${SLOVENIA_BBOX});
      relation["shop"~"^(supermarket|convenience|grocery|greengrocer)$"](${SLOVENIA_BBOX});
    );out center;`,
  },
  healthcare: {
    label: "Zdravstvo",
    icon: "🏥",
    color: "#e91e63",
    query: `[out:json][timeout:35];(
      node["amenity"~"^(hospital|clinic|doctors|dentist)$"](${SLOVENIA_BBOX});
      way["amenity"~"^(hospital|clinic|doctors|dentist)$"](${SLOVENIA_BBOX});
      relation["amenity"~"^(hospital|clinic|doctors|dentist)$"](${SLOVENIA_BBOX});
      node["healthcare"](${SLOVENIA_BBOX});
      way["healthcare"](${SLOVENIA_BBOX});
      relation["healthcare"](${SLOVENIA_BBOX});
    );out center;`,
  },
  pharmacy: {
    label: "Lekarne",
    icon: "💊",
    color: "#9b59b6",
    query: `[out:json][timeout:35];(
      node["amenity"="pharmacy"](${SLOVENIA_BBOX});
      way["amenity"="pharmacy"](${SLOVENIA_BBOX});
      relation["amenity"="pharmacy"](${SLOVENIA_BBOX});
    );out center;`,
  },
  park: {
    label: "Parki",
    icon: "🌳",
    color: "#27ae60",
    query: `[out:json][timeout:35];(
      node["leisure"="park"](${SLOVENIA_BBOX});
      way["leisure"="park"](${SLOVENIA_BBOX});
      relation["leisure"="park"](${SLOVENIA_BBOX});
    );out center;`,
  },
  bus_stop: {
    label: "Bus postaje",
    icon: "🚌",
    color: "#16a085",
    query: `[out:json][timeout:35];(
      node["highway"="bus_stop"](${SLOVENIA_BBOX});
      node["public_transport"="platform"]["bus"="yes"](${SLOVENIA_BBOX});
      way["public_transport"="platform"]["bus"="yes"](${SLOVENIA_BBOX});
    );out center;`,
  },
  rail_stop: {
    label: "Železniške postaje",
    icon: "🚆",
    color: "#34495e",
    query: `[out:json][timeout:35];(
      node["railway"~"^(station|halt|tram_stop)$"](${SLOVENIA_BBOX});
      way["railway"~"^(station|halt|tram_stop)$"](${SLOVENIA_BBOX});
      relation["railway"~"^(station|halt|tram_stop)$"](${SLOVENIA_BBOX});
    );out center;`,
  },
  motorway_junction: {
    label: "AC priključki",
    icon: "🛣️",
    color: "#7f8c8d",
    query: `[out:json][timeout:35];(
      node["highway"="motorway_junction"](${SLOVENIA_BBOX});
    );out center;`,
  },
};


function getFeatureName(feature: GeoJsonFeature): string {
  return feature.properties?.SR_UIME ?? feature.properties?.NAME_LATN ?? feature.properties?.NUTS_NAME ?? feature.properties?.name ?? "Regija";
}

function getFeatureRegionId(feature: GeoJsonFeature): string {
  return String(feature.properties?.SR_ID ?? feature.properties?.SR_MID ?? feature.properties?.NUTS_ID ?? getFeatureName(feature));
}

function pointInRing(lat: number, lon: number, ring: number[][]): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInPolygon(lat: number, lon: number, polygon: number[][][]): boolean {
  if (!polygon.length) return false;
  if (!pointInRing(lat, lon, polygon[0])) return false;

  for (let i = 1; i < polygon.length; i += 1) {
    if (pointInRing(lat, lon, polygon[i])) return false;
  }

  return true;
}

function pointInFeature(lat: number, lon: number, feature: GeoJsonFeature): boolean {
  const geometry = feature.geometry;
  if (!geometry) return false;

  if (geometry.type === "Polygon") {
    return pointInPolygon(lat, lon, geometry.coordinates as number[][][]);
  }

  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as number[][][][]).some((polygon) => pointInPolygon(lat, lon, polygon));
  }

  return false;
}

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

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radiusM = 6_371_000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return radiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

function formatPricePerM2(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Ni podatka";
  return `€${Math.round(value).toLocaleString()}`;
}

type SampleConfidence = {
  label: string;
  shortLabel: string;
  description: string;
  className: string;
};

function getSampleConfidence(sampleCount: number): SampleConfidence {
  if (sampleCount <= 4) {
    return {
      label: "Nizka zanesljivost",
      shortLabel: "Nizka",
      description: "1–4 transakcije. Občino uporabljaj predvsem kot orientacijo, ne kot trden zaključek.",
      className: "border-amber-300 bg-amber-50 text-amber-900",
    };
  }

  if (sampleCount <= 15) {
    return {
      label: "Srednja zanesljivost",
      shortLabel: "Srednja",
      description: "5–15 transakcij. Primerjava je uporabna, ampak jo je treba brati z nekaj previdnosti.",
      className: "border-sky-300 bg-sky-50 text-sky-900",
    };
  }

  return {
    label: "Bolj zanesljivo",
    shortLabel: "Višja",
    description: "15+ transakcij. Vzorec je bolj uporaben za primerjavo med občinami.",
    className: "border-emerald-300 bg-emerald-50 text-emerald-900",
  };
}

function getDistanceQualityLabel(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Ni podatka";
  if (value <= 500) return "Zelo blizu";
  if (value <= 1000) return "Blizu";
  if (value <= 2500) return "Srednje";
  return "Daleč";
}

function getDistanceQualityClass(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "text-muted-foreground";
  if (value <= 500) return "text-emerald-700";
  if (value <= 1000) return "text-lime-700";
  if (value <= 2500) return "text-amber-700";
  return "text-red-700";
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function elementToLoadedPoi(el: any, category: POICategory): LoadedPoi | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const tags = (el.tags ?? {}) as Record<string, string>;
  const name = tags.name || tags["name:sl"] || tags.operator || POI_CONFIG[category].label;

  return {
    id: `${el.type ?? "node"}-${el.id}`,
    category,
    name,
    lat,
    lon,
    tags,
  };
}

function getPoiIcon(category: POICategory): L.DivIcon {
  const cfg = POI_CONFIG[category];

  return L.divIcon({
    html: `
      <div style="
        width:26px;
        height:26px;
        border-radius:9999px;
        background:#fff;
        border:2px solid ${cfg.color};
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:15px;
        box-shadow:0 2px 8px rgba(0,0,0,0.18);
      ">
        ${cfg.icon}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    className: "poi-icon",
  });
}

function getProbeIcon(): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="
        width:24px;
        height:24px;
        border-radius:9999px;
        background:#111827;
        border:3px solid #fff;
        box-shadow:0 2px 10px rgba(0,0,0,0.28);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    className: "probe-icon",
  });
}

const SloveniaMap = () => {
  const [activeLayer, setActiveLayer] = useState<LayerType>("prices");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
  const [regionsGeoJson, setRegionsGeoJson] = useState<GeoJsonFeatureCollection | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedRegionName, setSelectedRegionName] = useState<string | null>(null);
  const [selectedRegionFeature, setSelectedRegionFeature] = useState<GeoJsonFeature | null>(null);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [activePoiCategories, setActivePoiCategories] = useState<Set<POICategory>>(
    new Set(DEFAULT_POI_CATEGORIES),
  );
  const [loadingPoiCategories, setLoadingPoiCategories] = useState<Set<POICategory>>(new Set());
  const [clickProbe, setClickProbe] = useState<ClickProbe | null>(null);
  const [nearestResults, setNearestResults] = useState<NearestPoiResult[]>([]);
  const [poiError, setPoiError] = useState<string | null>(null);
  const [advancedMunicipalityOpen, setAdvancedMunicipalityOpen] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(SLOVENIA_ZOOM);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const regionsLayerRef = useRef<L.GeoJSON | null>(null);
  const markersLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const fullPoiLayersRef = useRef<Partial<Record<POICategory, L.LayerGroup>>>({});
  const representativeLayerRef = useRef<L.LayerGroup | null>(null);
  const nearestLayerRef = useRef<L.LayerGroup | null>(null);
  const transactionLayerRef = useRef<L.LayerGroup | null>(null);
  const zoomRef = useRef<number>(SLOVENIA_ZOOM);
  const poiCacheRef = useRef<Partial<Record<POICategory, LoadedPoi[]>>>({});
  const activePoiCategoriesRef = useRef(activePoiCategories);

  useEffect(() => {
    let cancelled = false;

    fetch("/data/SR.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`SR.geojson request failed: ${response.status}`);
        }

        return response.json();
      })
      .then((geojson: GeoJsonFeatureCollection) => {
        if (cancelled) return;

        setRegionsGeoJson({
          ...geojson,
          features: geojson.features.filter((feature) => feature.properties?.ENOTA === "SR"),
        });
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setRegionsError("Statističnih regij Slovenije ni bilo mogoče naložiti.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    activePoiCategoriesRef.current = activePoiCategories;
  }, [activePoiCategories]);

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

  const top10 = useMemo(() => new Set(sortedByRatio.slice(0, 10).map((d) => d.municipalityKey)), [sortedByRatio]);

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

  const [uniqueTransactions, setUniqueTransactions] = useState<{
    id: string;
    lat: number;
    lon: number;
    pricePerM2: number | null;
    municipality: string;
    saleYear: number | null;
  }[]>([]);

  useEffect(() => {
    fetch("/data/transactions.json")
      .then((r) => r.json())
      .then((data) => setUniqueTransactions(data))
      .catch((e) => console.error("Transakcij ni bilo mogoče naložiti", e));
  }, []);

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
      sampleConfidence: getSampleConfidence(d.sampleCount),
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
      .filter((row) => activePoiCategories.has(row.category as POICategory))
      .filter(
        (row) => row.repTxLat != null && row.repTxLon != null && row.poiLat != null && row.poiLon != null,
      )
      .sort(
        (a, b) =>
          (a.municipalityMedianDistanceM ?? Number.POSITIVE_INFINITY) -
          (b.municipalityMedianDistanceM ?? Number.POSITIVE_INFINITY),
      );
  }, [selectedMunicipality, representativeByMunicipality, activePoiCategories]);

  const selectedRegionRepresentativePois = useMemo(() => {
    if (!selectedRegionFeature) return [];

    return representativePoisLatest
      .filter((row) => activePoiCategories.has(row.category as POICategory))
      .filter((row) => row.repTxLat != null && row.repTxLon != null && row.poiLat != null && row.poiLon != null)
      .filter((row) => pointInFeature(row.repTxLat as number, row.repTxLon as number, selectedRegionFeature))
      .sort((a, b) => (a.repTxPricePerM2 ?? 0) - (b.repTxPricePerM2 ?? 0));
  }, [selectedRegionFeature, activePoiCategories]);

  const mapRepresentativePois = selectedMunicipality ? selectedRepresentativePois : selectedRegionRepresentativePois;

  useEffect(() => {
    setAdvancedMunicipalityOpen(false);
  }, [selectedMunicipality]);

  const drawFullPoiLayer = useCallback((category: POICategory, pois: LoadedPoi[]) => {
    const map = mapRef.current;
    if (!map) return;

    fullPoiLayersRef.current[category]?.clearLayers();
    if (fullPoiLayersRef.current[category]) {
      map.removeLayer(fullPoiLayersRef.current[category] as L.LayerGroup);
    }

    const cfg = POI_CONFIG[category];
    const group = L.layerGroup();

    pois.forEach((poi) => {
      const marker = L.marker([poi.lat, poi.lon], {
        icon: getPoiIcon(category),
        bubblingMouseEvents: false,
      }).bindPopup(
        `<div style="font-size:13px;line-height:1.45;">
          <strong>${escapeHtml(poi.name)}</strong><br/>
          <span style="color:${cfg.color};">${cfg.icon} ${escapeHtml(cfg.label)}</span>
        </div>`,
      );

      marker.addTo(group);
    });

    group.addTo(map);
    fullPoiLayersRef.current[category] = group;
  }, []);

  const loadPoisForCategory = useCallback(async (category: POICategory): Promise<LoadedPoi[]> => {
    const cached = poiCacheRef.current[category];
    if (cached) return cached;

    const cfg = POI_CONFIG[category];
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      body: `data=${encodeURIComponent(cfg.query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!response.ok) {
      throw new Error(`Overpass request failed for ${cfg.label}: ${response.status}`);
    }

    const json = await response.json();
    const seen = new Set<string>();
    const pois = ((json.elements ?? []) as any[])
      .map((el) => elementToLoadedPoi(el, category))
      .filter((poi): poi is LoadedPoi => poi !== null)
      .filter((poi) => {
        const key = `${poi.category}-${poi.id}-${poi.lat.toFixed(6)}-${poi.lon.toFixed(6)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    poiCacheRef.current[category] = pois;
    return pois;
  }, []);

  const togglePoiCategory = useCallback(
    async (category: POICategory) => {
      const map = mapRef.current;
      if (!map) return;

      if (activePoiCategoriesRef.current.has(category)) {
        fullPoiLayersRef.current[category]?.clearLayers();
        if (fullPoiLayersRef.current[category]) map.removeLayer(fullPoiLayersRef.current[category] as L.LayerGroup);
        delete fullPoiLayersRef.current[category];

        setActivePoiCategories((prev) => {
          const next = new Set(prev);
          next.delete(category);
          return next;
        });
        return;
      }

      setPoiError(null);
      setLoadingPoiCategories((prev) => new Set(prev).add(category));

      try {
        const pois = await loadPoisForCategory(category);
        drawFullPoiLayer(category, pois);
        setActivePoiCategories((prev) => new Set(prev).add(category));
      } catch (error) {
        console.error(error);
        setPoiError(`POI podatkov za kategorijo "${POI_CONFIG[category].label}" ni bilo mogoče naložiti.`);
      } finally {
        setLoadingPoiCategories((prev) => {
          const next = new Set(prev);
          next.delete(category);
          return next;
        });
      }
    },
    [drawFullPoiLayer, loadPoisForCategory],
  );

useEffect(() => {
  if (!containerRef.current || mapRef.current) return;

  const sloveniaBounds = L.latLngBounds(
    [45.4, 13.3],
    [46.9, 16.6]
  );

  const map = L.map(containerRef.current, {
    center: SLOVENIA_CENTER,
    zoom: SLOVENIA_ZOOM,
    minZoom: 8,
    maxZoom: SLOVENIA_MAX_ZOOM,
    maxBounds: sloveniaBounds.pad(0.8),
    maxBoundsViscosity: 1.0,
    scrollWheelZoom: true,
    worldCopyJump: false,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    noWrap: false,
  }).addTo(map);

  map.fitBounds(sloveniaBounds, {
    padding: [20, 20],
  });

  markersLayerRef.current = L.markerClusterGroup({
    chunkedLoading: true,
    showCoverageOnHover: false,
    disableClusteringAtZoom: 10,
    maxClusterRadius: 60,
    spiderfyOnMaxZoom: false,
    spiderfyDistanceMultiplier: 0,
    zoomToBoundsOnClick: false,
  }).addTo(map);

  markersLayerRef.current.on("clusterclick", (event: any) => {
    L.DomEvent.stopPropagation(event.originalEvent);

    const currentZoom = map.getZoom();
    const cluster = event.layer;
    const clusterBounds = cluster?.getBounds?.();
    const boundsZoom = clusterBounds ? map.getBoundsZoom(clusterBounds, false) : currentZoom + 1;
    const nextZoom = Math.min(
      SLOVENIA_MAX_ZOOM,
      Math.max(currentZoom + 1, boundsZoom, currentZoom),
    );

    map.setView(cluster.getLatLng(), nextZoom, { animate: true });
  });
  representativeLayerRef.current = L.layerGroup().addTo(map);
  nearestLayerRef.current = L.layerGroup().addTo(map);
  transactionLayerRef.current = L.layerGroup().addTo(map);

  map.on("zoomend", () => {
    zoomRef.current = map.getZoom();
    setCurrentZoom(map.getZoom());
    map.fire("zoomchanged");
  });

  map.on("click", (event: L.LeafletMouseEvent) => {
    setClickProbe({ lat: event.latlng.lat, lon: event.latlng.lng });
  });

  mapRef.current = map;

  return () => {
    map.off("click");
    map.off("zoomend");
    markersLayerRef.current?.off("clusterclick");
    regionsLayerRef.current?.remove();
    markersLayerRef.current?.clearLayers();
    representativeLayerRef.current?.clearLayers();
    nearestLayerRef.current?.clearLayers();
    transactionLayerRef.current?.clearLayers();
    (Object.values(fullPoiLayersRef.current) as L.LayerGroup[]).forEach((layer) => layer.clearLayers());
    map.remove();
    mapRef.current = null;
    regionsLayerRef.current = null;
    markersLayerRef.current = null;
    representativeLayerRef.current = null;
    nearestLayerRef.current = null;
    transactionLayerRef.current = null;
    fullPoiLayersRef.current = {};
  };
}, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !regionsGeoJson) return;

    if (regionsLayerRef.current) {
      regionsLayerRef.current.remove();
      regionsLayerRef.current = null;
    }

    const geoJsonLayer = L.geoJSON(regionsGeoJson as any, {
      style: (feature) => {
        const typedFeature = feature as GeoJsonFeature;
        const regionId = getFeatureRegionId(typedFeature);
        const isSelected = selectedRegionId === regionId;

        return {
          color: isSelected ? "#111827" : "#2563eb",
          weight: isSelected ? 3 : 1.5,
          fillColor: isSelected ? "#60a5fa" : "#93c5fd",
          fillOpacity: isSelected ? 0.32 : 0.16,
        };
      },
      onEachFeature: (feature, layer) => {
        const typedFeature = feature as GeoJsonFeature;
        const name = getFeatureName(typedFeature);
        const regionId = getFeatureRegionId(typedFeature);

        layer.bindTooltip(`${name} (${regionId})`);

        layer.on("click", (event: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(event.originalEvent);
          setSelectedRegionId(regionId);
          setSelectedRegionName(name);
          setSelectedRegionFeature(typedFeature);
          setSelectedMunicipality(null);
          setClickProbe(null);

          if ("getBounds" in layer) {
            map.fitBounds((layer as L.Polygon).getBounds(), { padding: [30, 30] });
          }
        });
      },
    });

    geoJsonLayer.addTo(map);
    geoJsonLayer.bringToBack();
    regionsLayerRef.current = geoJsonLayer;

    if (!selectedRegionId) {
      map.fitBounds(SLOVENIA_MAX_BOUNDS, { padding: [20, 20] });
    }
  }, [regionsGeoJson, selectedRegionId]);

  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    const zoom = mapRef.current?.getZoom() ?? zoomRef.current;
    if (zoom >= 13) return;

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

      const radius = Math.max(12, Math.min(15, Math.sqrt(d.sampleCount) * 2));
      const size = Math.round(radius * 2) + 10;

      const marker = L.marker([d.lat, d.lon], {
        icon: L.divIcon({
          html: `<div style="
            width:${size}px;
            height:${size}px;
            border-radius:9999px;
            background:${markerColor};
            border:${isSelected ? "4px solid #111827" : "3px solid rgba(255,255,255,0.9)"};
            opacity:${isSingle ? 0.6 : 0.9};
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:${Math.max(8, size / 3)}px;
            font-weight:700;
            color:white;
            text-shadow:0 1px 2px rgba(0,0,0,0.5);
          ">${d.sampleCount}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          className: "",
        }),
        bubblingMouseEvents: false,
      });

      marker.bindPopup(`
        <div style="font-size:14px;line-height:1.5;min-width:220px;">
          <div style="font-weight:700;font-size:16px;margin-bottom:6px;">${escapeHtml(d.displayMunicipality)}</div>
          <div><strong>Leto:</strong> ${d.saleYear}</div>
          <div><strong>Povpr. cena/m²:</strong> ${d.avgPricePerM2 != null ? `€${Math.round(d.avgPricePerM2).toLocaleString()}` : "Ni podatka"}</div>
          <div><strong>Mediana cena/m²:</strong> ${d.medianPricePerM2 != null ? `€${Math.round(d.medianPricePerM2).toLocaleString()}` : "Ni podatka"}</div>
          <div><strong>Št. transakcij:</strong> ${d.sampleCount}</div>
          <div><strong>Mediana trgovina:</strong> ${formatDistance(d.medianGroceryM)}</div>
          <div><strong>Mediana šola:</strong> ${formatDistance(d.medianSchoolM)}</div>
          <div><strong>Mediana lekarna:</strong> ${formatDistance(d.medianPharmacyM)}</div>
        </div>
      `);

      marker.on("click", (event: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(event.originalEvent);
        setSelectedMunicipality(d.municipalityKey);
        mapRef.current?.setView([d.lat, d.lon], 13, { animate: true });
      });

      marker.addTo(layer);
    });
  }, [activeLayer, currentZoom, hasAffordabilityData, maxPrice, minPrice, selectedMunicipality, visibleData]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = transactionLayerRef.current;
    if (!map || !layer) return;

    const updateTransactions = () => {
      layer.clearLayers();
      const zoom = map.getZoom();

      if (zoom < 13) return;

      const bounds = map.getBounds();

      uniqueTransactions.forEach((tx) => {
        if (!bounds.contains([tx.lat, tx.lon])) return;

        const color = tx.pricePerM2 != null
          ? priceToColor(tx.pricePerM2, minPrice, maxPrice)
          : "#999999";

        L.circleMarker([tx.lat, tx.lon], {
          radius: 6,
          color: "#fff",
          fillColor: color,
          fillOpacity: 0.9,
          weight: 1.5,
          bubblingMouseEvents: false,
        })
          .bindPopup(`
            <div style="font-size:13px;line-height:1.5;">
              <div style="font-weight:700;">${escapeHtml(tx.municipality)}</div>
              <div>Cena/m²: ${tx.pricePerM2 != null ? `€${Math.round(tx.pricePerM2).toLocaleString()}` : "Ni podatka"}</div>
              <div>Površina: ${(tx as any).areaM2 != null ? `${(tx as any).areaM2} m²` : "Ni podatka"}</div>
              <div>Leto: ${tx.saleYear ?? "Ni podatka"}</div>
            </div>
          `)
          .addTo(layer);
      });
    };

    map.on("zoomchanged moveend", updateTransactions);
    updateTransactions();

    return () => {
      map.off("zoomchanged moveend", updateTransactions);
      layer.clearLayers();
    };
  }, [uniqueTransactions, minPrice, maxPrice]);

  useEffect(() => {
    const layer = representativeLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    mapRepresentativePois.forEach((poi) => {
      const meta = representativePoiMeta[poi.category as RepresentativePoiCategory];
      if (!meta) return;

      L.circleMarker([poi.repTxLat as number, poi.repTxLon as number], {
        radius: selectedMunicipality ? 7 : 5,
        color: "#111827",
        fillColor: meta.color,
        fillOpacity: 0.9,
        weight: 2,
        bubblingMouseEvents: false,
      })
        .bindPopup(
          `<div style="font-size:13px;line-height:1.45;min-width:210px;">
            <strong>Transakcijska točka</strong><br/>
            Občina: ${escapeHtml(poi.municipality)}<br/>
            Cena/m²: <strong>${formatPricePerM2(poi.repTxPricePerM2)}</strong><br/>
            ${meta.icon} ${escapeHtml(meta.label)}: ${formatDistance(poi.repTxNearestDistanceM)}
          </div>`,
        )
        .addTo(layer);

      L.marker([poi.poiLat as number, poi.poiLon as number], {
        icon: getPoiIcon(poi.category as POICategory),
        bubblingMouseEvents: false,
      })
        .bindPopup(
          `<div style="font-size:13px;line-height:1.45;">
            <strong>${escapeHtml(poi.poiName)}</strong><br/>
            <span style="color:${meta.color};">${meta.icon} ${escapeHtml(meta.label)}</span>
          </div>`,
        )
        .addTo(layer);

      L.polyline(
        [
          [poi.repTxLat as number, poi.repTxLon as number],
          [poi.poiLat as number, poi.poiLon as number],
        ],
        {
          color: meta.color,
          weight: 2,
          opacity: 0.8,
          dashArray: "6 4",
          interactive: true,
        },
      )
        .bindPopup(
          `<div style="font-size:13px;line-height:1.45;">
            <strong>${meta.icon} ${escapeHtml(meta.label)}</strong><br/>
            ${escapeHtml(poi.poiName)}<br/>
            Reprezentativna razdalja: <strong>${formatDistance(poi.repTxNearestDistanceM)}</strong>
          </div>`,
        )
        .addTo(layer);
    });
  }, [mapRepresentativePois]);

  useEffect(() => {
    const layer = nearestLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    if (!clickProbe) {
      setNearestResults([]);
      return;
    }

    const results: NearestPoiResult[] = [];

    activePoiCategories.forEach((category) => {
      const pois = poiCacheRef.current[category] ?? [];
      let best: NearestPoiResult | null = null;

      pois.forEach((poi) => {
        const distanceM = haversineM(clickProbe.lat, clickProbe.lon, poi.lat, poi.lon);
        if (!best || distanceM < best.distanceM) {
          best = { ...poi, distanceM };
        }
      });

      if (best) results.push(best);
    });

    results.sort((a, b) => a.distanceM - b.distanceM);
    setNearestResults(results);

    L.marker([clickProbe.lat, clickProbe.lon], {
      icon: getProbeIcon(),
      bubblingMouseEvents: false,
    })
      .bindPopup(
        `<div style="font-size:13px;line-height:1.45;">
          <strong>Izbrana točka</strong><br/>
          ${clickProbe.lat.toFixed(5)}, ${clickProbe.lon.toFixed(5)}
        </div>`,
      )
      .addTo(layer);

    results.forEach((poi) => {
      const cfg = POI_CONFIG[poi.category];

      L.polyline(
        [
          [clickProbe.lat, clickProbe.lon],
          [poi.lat, poi.lon],
        ],
        {
          color: cfg.color,
          weight: 3,
          opacity: 0.9,
        },
      )
        .bindPopup(
          `<div style="font-size:13px;line-height:1.45;">
            <strong>${cfg.icon} ${escapeHtml(cfg.label)}</strong><br/>
            ${escapeHtml(poi.name)}<br/>
            Razdalja: <strong>${formatDistance(poi.distanceM)}</strong>
          </div>`,
        )
        .addTo(layer);

      L.marker([poi.lat, poi.lon], {
        icon: getPoiIcon(poi.category),
        bubblingMouseEvents: false,
      })
        .bindPopup(
          `<div style="font-size:13px;line-height:1.45;">
            <strong>${escapeHtml(poi.name)}</strong><br/>
            <span style="color:${cfg.color};">${cfg.icon} ${escapeHtml(cfg.label)}</span><br/>
            Najbližji od kliknjene točke: <strong>${formatDistance(poi.distanceM)}</strong>
          </div>`,
        )
        .addTo(layer);
    });
  }, [activePoiCategories, clickProbe]);

  useEffect(() => {
    DEFAULT_POI_CATEGORIES.forEach((category) => {
      void (async () => {
        if (poiCacheRef.current[category] || loadingPoiCategories.has(category)) return;
        setLoadingPoiCategories((prev) => new Set(prev).add(category));
        try {
          const pois = await loadPoisForCategory(category);
          drawFullPoiLayer(category, pois);
        } catch (error) {
          console.error(error);
          setPoiError("Privzetih POI kategorij ni bilo mogoče naložiti iz Overpass API-ja.");
        } finally {
          setLoadingPoiCategories((prev) => {
            const next = new Set(prev);
            next.delete(category);
            return next;
          });
        }
      })();
    });
    // Run once after map/helper refs exist. The defaults are already active in state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawFullPoiLayer, loadPoisForCategory]);

  const clearClickProbe = useCallback(() => {
    setClickProbe(null);
    setNearestResults([]);
    nearestLayerRef.current?.clearLayers();
  }, []);

  const poiEntries = Object.entries(POI_CONFIG) as [POICategory, PoiConfig][];

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
          Affordability layer je trenutno izklopljen, ker v novi datoteki še ni salary/affordability podatkov.
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Full POI layerji + click-anywhere nearest explorer:
        </p>
        <div className="flex flex-wrap gap-2">
          {poiEntries.map(([key, cfg]) => {
            const isActive = activePoiCategories.has(key);
            const isLoading = loadingPoiCategories.has(key);
            const count = poiCacheRef.current[key]?.length;

            return (
              <button
                key={key}
                onClick={() => void togglePoiCategory(key)}
                disabled={isLoading}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                } ${isLoading ? "cursor-wait opacity-50" : ""}`}
              >
                {cfg.icon} {cfg.label}
                {isLoading ? " …" : isActive && count != null ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {regionsError && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{regionsError}</div>}

      {poiError && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{poiError}</div>}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>€{Math.round(minPrice)}</span>
          <div
            className="h-3 w-32 rounded"
            style={{ background: "linear-gradient(to right, rgb(0,0,255), rgb(255,255,0), rgb(255,0,0))" }}
          />
          <span>€{Math.round(maxPrice)}</span>
          <span>Cena/m²</span>
        </div>

        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full border-2 border-dashed" style={{ borderColor: "#666", backgroundColor: "#99999966" }} />
          <span>1 transakcija</span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div ref={containerRef} className="h-[680px] w-full overflow-hidden rounded-lg border" />

        <Card className="h-fit xl:sticky xl:top-4">
          <CardHeader>
            <CardTitle>Pomočnik za oceno lokacije</CardTitle>
            <CardDescription>
              Klik na modro statistično regijo približa regijo in pokaže reprezentativne transakcijske točke. Klik na občinski krog odpre občinsko analitiko.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <div className="mb-2 font-medium">Izbrana regija</div>
                {selectedRegionName ? (
                  <div className="space-y-2">
                    <div>
                      <div className="text-lg font-semibold">{selectedRegionName}</div>
                      <div className="text-xs text-muted-foreground">{selectedRegionId}</div>
                    </div>
                    <div className="text-muted-foreground">
                      Na zemljevidu je prikazanih {selectedRegionRepresentativePois.length} reprezentativnih transakcijskih točk za aktivne POI kategorije.
                    </div>
                    <button
                      onClick={() => {
                        setSelectedRegionId(null);
                        setSelectedRegionName(null);
                        setSelectedRegionFeature(null);
                      }}
                      className="rounded-md border bg-card px-2 py-1 text-xs hover:bg-muted"
                    >
                      Počisti regijo
                    </button>
                  </div>
                ) : (
                  <div className="text-muted-foreground">Klikni modro regijo na zemljevidu.</div>
                )}
              </div>

              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <div className="mb-2 font-medium">1. Lokalni explorer</div>
                <div className="mb-3 text-muted-foreground">
                  Klikni kamorkoli na zemljevid. App bo za trenutno aktivne POI kategorije poiskal najbližje točke in narisal linije.
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    {clickProbe ? `Izbrana točka: ${clickProbe.lat.toFixed(5)}, ${clickProbe.lon.toFixed(5)}` : "Ni izbrane točke."}
                  </div>
                  {clickProbe && (
                    <button onClick={clearClickProbe} className="rounded-md border bg-card px-2 py-1 text-xs hover:bg-muted">
                      Počisti
                    </button>
                  )}
                </div>

                {clickProbe && (
                  <div className="mt-3 space-y-2">
                    {nearestResults.length === 0 ? (
                      <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900">
                        Za aktivne kategorije še ni naloženih POI podatkov. Počakaj, da se kategorije naložijo, ali vklopi dodatno kategorijo.
                      </div>
                    ) : (
                      nearestResults.map((poi) => {
                        const cfg = POI_CONFIG[poi.category];
                        return (
                          <div key={`${poi.category}-${poi.id}`} className="rounded-md border bg-card p-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium">
                                  {cfg.icon} {cfg.label}
                                </div>
                                <div className="truncate text-muted-foreground">{poi.name}</div>
                              </div>
                              <div className="shrink-0 text-right font-semibold">{formatDistance(poi.distanceM)}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="mb-3">
                  <div className="font-medium">2. Občinska analitika</div>
                  <div className="text-sm text-muted-foreground">
                    Klikni občinski krog za cene, accessibility metrike, sample confidence in representative examples. Klik regije ne odpre te občinske analitike, ampak prikaže transakcijske točke na zemljevidu.
                  </div>
                </div>

                {!selectedData ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Trenutno ni izbrane občine. Klikni enega od občinskih krogov na zemljevidu.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xl font-semibold">{selectedData.displayMunicipality}</div>
                          <div className="text-sm text-muted-foreground">Leto podatkov: {selectedData.saleYear}</div>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-1 text-xs font-medium ${selectedData.sampleConfidence.className}`}>
                          {selectedData.sampleConfidence.shortLabel}
                        </span>
                      </div>

                      <div className={`rounded-md border p-3 text-sm ${selectedData.sampleConfidence.className}`}>
                        <div className="font-medium">{selectedData.sampleConfidence.label}</div>
                        <div>{selectedData.sampleConfidence.description}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">Povpr. cena / m²</div>
                        <div className="text-lg font-semibold">{formatPricePerM2(selectedData.avgPricePerM2)}</div>
                      </div>

                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">Mediana cena / m²</div>
                        <div className="text-lg font-semibold">{formatPricePerM2(selectedData.medianPricePerM2)}</div>
                      </div>

                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">Št. transakcij</div>
                        <div className="text-lg font-semibold">{selectedData.sampleCount.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">sample confidence</div>
                      </div>

                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">Affordability</div>
                        <div className="text-lg font-semibold">
                          {selectedData.affordabilityRatio != null ? selectedData.affordabilityRatio.toFixed(2) : "V pripravi"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedData.avgNetSalary == null ? "salary merge še manjka" : "price-to-income"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border p-3 text-sm">
                      <div>
                        <div className="font-medium">Accessibility summary</div>
                        <div className="text-xs text-muted-foreground">
                          Median distance pove tipično oddaljenost transakcij v občini do kategorije.
                        </div>
                      </div>

                      {[
                        {
                          icon: "🛒",
                          label: "Trgovina",
                          distance: selectedData.medianGroceryM,
                          share: selectedData.shareGroceryWithin500m,
                          shareLabel: "≤ 500 m",
                        },
                        {
                          icon: "🏫",
                          label: "Šola",
                          distance: selectedData.medianSchoolM,
                          share: selectedData.shareSchoolWithin1000m,
                          shareLabel: "≤ 1000 m",
                        },
                        {
                          icon: "💊",
                          label: "Lekarna",
                          distance: selectedData.medianPharmacyM,
                          share: selectedData.sharePharmacyWithin1000m,
                          shareLabel: "≤ 1000 m",
                        },
                        {
                          icon: "🏥",
                          label: "Zdravstvo",
                          distance: selectedData.medianHealthcareM,
                          share: null,
                          shareLabel: null,
                        },
                        {
                          icon: "🌳",
                          label: "Park",
                          distance: selectedData.medianParkM,
                          share: null,
                          shareLabel: null,
                        },
                        {
                          icon: "🚌",
                          label: "Bus / javni prevoz",
                          distance: selectedData.medianBusStopM,
                          share: null,
                          shareLabel: null,
                        },
                        {
                          icon: "🚆",
                          label: "Železnica",
                          distance: selectedData.medianRailStopM,
                          share: null,
                          shareLabel: null,
                        },
                        {
                          icon: "🛣️",
                          label: "AC priključek, drive",
                          distance: selectedData.medianMotorwayJunctionDriveM,
                          share: null,
                          shareLabel: null,
                        },
                      ].map((item) => (
                        <div key={item.label} className="rounded-md border p-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">
                                {item.icon} {item.label}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.shareLabel ? `${formatPercent(item.share)} ${item.shareLabel}` : "mediana občinskih transakcij"}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="font-semibold">{formatDistance(item.distance)}</div>
                              <div className={`text-xs font-medium ${getDistanceQualityClass(item.distance)}`}>
                                {getDistanceQualityLabel(item.distance)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 rounded-lg border p-3 text-sm">
                      <div className="font-medium">Reprezentativni občinski primeri</div>
                      <div className="text-xs text-muted-foreground">
                        To niso vsi POI-ji. To so samo primeri iz representativePoisLatest.ts za razlago izbrane občine.
                      </div>

                      {selectedRepresentativePois.length === 0 ? (
                        <div className="text-muted-foreground">
                          Za to občino ni reprezentativnih primerov za trenutno aktivne POI kategorije.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedRepresentativePois.slice(0, 6).map((poi) => {
                            const meta = representativePoiMeta[poi.category as RepresentativePoiCategory];
                            return (
                              <div key={`${poi.municipality}-${poi.category}`} className="rounded-md border p-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-medium">
                                      {meta.icon} {meta.label}
                                    </div>
                                    <div className="truncate text-muted-foreground">{poi.poiName}</div>
                                  </div>
                                  <div className="shrink-0 text-right font-medium">{formatDistance(poi.repTxNearestDistanceM)}</div>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Mediana občine: {formatDistance(poi.municipalityMedianDistanceM)}
                                  {poi.repTxDriveDistanceM != null ? ` · Drive do AC: ${formatDistance(poi.repTxDriveDistanceM)}` : ""}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border text-sm">
                      <button
                        type="button"
                        onClick={() => setAdvancedMunicipalityOpen((open) => !open)}
                        className="flex w-full items-center justify-between px-3 py-2 font-medium hover:bg-muted"
                        aria-expanded={advancedMunicipalityOpen}
                      >
                        <span>Advanced details</span>
                        <span>{advancedMunicipalityOpen ? "−" : "+"}</span>
                      </button>

                      {advancedMunicipalityOpen && (
                        <div className="space-y-3 border-t p-3">
                          <div className="space-y-2">
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
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Lekarna znotraj 1000 m</span>
                              <span className="font-medium">{formatPercent(selectedData.sharePharmacyWithin1000m)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Lekarna znotraj 2000 m</span>
                              <span className="font-medium">{formatPercent(selectedData.sharePharmacyWithin2000m)}</span>
                            </div>
                          </div>

                          <div className="space-y-2 border-t pt-3">
                            <div className="font-medium">Rangi in odstopanja</div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Rang po ceni</span>
                              <span className="font-medium">{selectedData.priceRank ? `#${selectedData.priceRank}` : "Ni podatka"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Rang po affordability</span>
                              <span className="font-medium">{selectedData.affordabilityRank ? `#${selectedData.affordabilityRank}` : "Ni podatka"}</span>
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

                          <div className="space-y-2 border-t pt-3">
                            <div className="font-medium">Opomba o metodologiji</div>
                            <div className="text-muted-foreground">
                              Občinske metrike so agregirane iz transakcij. Click-anywhere nearest explorer pa uporablja full POI layerje, ne representative POI primerov.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedMunicipality(null)}
                      className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      Počisti izbor občine
                    </button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SloveniaMap;
