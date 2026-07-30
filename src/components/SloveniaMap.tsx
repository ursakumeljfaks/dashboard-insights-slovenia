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
type RegionProperties = {
  SR_UIME?: string;
  NAME_LATN?: string;
  NUTS_NAME?: string;
  name?: string;
  SR_ID?: string | number;
  SR_MID?: string | number;
  NUTS_ID?: string | number;
  ENOTA?: string;
};
type GeoJsonFeature = GeoJSON.Feature<GeoJSON.Geometry, RegionProperties>;
type GeoJsonFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, RegionProperties>;

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

type OverpassElement = {
  id: string | number;
  type?: string;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
};

type Transaction = {
  id: string;
  lat: number;
  lon: number;
  pricePerM2: number | null;
  municipality: string;
  saleYear: number | null;
  areaM2?: number | null;
  rooms?: number | null;
  propertyType?: string | null;
};

type ClusterClickEvent = L.LeafletEvent & {
  originalEvent: MouseEvent;
  layer: L.Layer & {
    getBounds?: () => L.LatLngBounds;
  };
};

type ClickProbe = {
  lat: number;
  lon: number;
};

type NearestPoiResult = LoadedPoi & {
  distanceM: number;
};

type AddressSearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

type AddressSearchFeedback = {
  kind: "status" | "error";
  message: string;
};

type RepresentativePoiRow = (typeof representativePoisLatest)[number];

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

function getRepresentativeTransactionKey(row: RepresentativePoiRow): string {
  if (row.repTxId != null) return `id-${row.repTxId}`;
  return `${normalizeMunicipalityKey(row.municipality)}-${row.repTxLat}-${row.repTxLon}`;
}

function priceToColor(price: number, min: number, max: number): string {
  const range = Math.max(1, max - min);
  const t = Math.max(0, Math.min(1, (price - min) / range));
  const lightness = 38 - t * 18;
  return `hsl(172 45% ${lightness}%)`;
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
  return `€${Math.round(value).toLocaleString("sl-SI")}`;
}

type SampleConfidence = {
  label: string;
  shortLabel: string;
  description: string;
  className: string;
};

function getSampleConfidence(sampleCount: number): SampleConfidence {
  if (sampleCount < 5) {
    return {
      label: "Nizka kakovost vzorca",
      shortLabel: "Nizka",
      description: "1–4 transakcije. Rezultat uporabljaj kot orientacijo, ne kot trden zaključek.",
      className: "border-amber-300 bg-amber-50 text-amber-900",
    };
  }

  if (sampleCount < 15) {
    return {
      label: "Srednja kakovost vzorca",
      shortLabel: "Srednja",
      description: "5–14 transakcij. Primerjava je uporabna, vendar jo beri previdno.",
      className: "border-sky-300 bg-sky-50 text-sky-900",
    };
  }

  return {
    label: "Višja kakovost vzorca",
    shortLabel: "Višja",
    description: "15 ali več transakcij. Vzorec je primernejši za primerjavo med občinami.",
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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function elementToLoadedPoi(el: OverpassElement, category: POICategory): LoadedPoi | null {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AddressSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<AddressSearchFeedback | null>(null);

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
  const maskLayerRef = useRef<L.Polygon | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const [filterRooms, setFilterRooms] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterYearMin, setFilterYearMin] = useState<number>(2020);
  const [filterYearMax, setFilterYearMax] = useState<number>(2025);
  const [filterPriceMin, setFilterPriceMin] = useState<number>(0);
  const [filterPriceMax, setFilterPriceMax] = useState<number>(15000);

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
    const map = mapRef.current;
    if (!map || !regionsGeoJson || maskLayerRef.current) return;

    const worldCoords: [number, number][] = [
      [-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]
    ];

    const holes: [number, number][][][] = regionsGeoJson.features.map((feature) => {
      const geom = feature.geometry;
      if (geom.type === "Polygon") {
        return (geom.coordinates as number[][][]).map(ring =>
          ring.map(([lon, lat]) => [lat, lon] as [number, number])
        );
      }
      if (geom.type === "MultiPolygon") {
        return (geom.coordinates as number[][][][]).flatMap(poly =>
          poly.map(ring => ring.map(([lon, lat]) => [lat, lon] as [number, number]))
        );
      }
      return [];
    });

    const mask = L.polygon([worldCoords, ...holes.flat()], {
      color: "none",
      fillColor: "#e8e8e8",
      fillOpacity: 0.75,
      interactive: false,
    }).addTo(map);

    maskLayerRef.current = mask;
  }, [regionsGeoJson]);

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

  const mapComparisonYear = useMemo(
    () => mapped.reduce((latest, row) => Math.max(latest, row.saleYear), 0),
    [mapped],
  );

  const comparableMunicipalities = useMemo(
    () => mapped.filter((row) => row.saleYear === mapComparisonYear),
    [mapComparisonYear, mapped],
  );

  const representativeByMunicipality = useMemo(() => {
    const grouped = new Map<string, (typeof representativePoisLatest)[number][]>();

    representativePoisLatest.forEach((row) => {
      if (row.saleYear !== mapComparisonYear) return;

      const key = normalizeMunicipalityKey(row.municipality);
      const existing = grouped.get(key) ?? [];
      existing.push(row);
      grouped.set(key, existing);
    });

    return grouped;
  }, [mapComparisonYear]);

  const validPriceRows = useMemo(
    () => comparableMunicipalities.filter((d) => d.avgPricePerM2 != null && Number.isFinite(d.avgPricePerM2)),
    [comparableMunicipalities],
  );

  const hasAffordabilityData = useMemo(
    () => comparableMunicipalities.some((d) => d.affordabilityRatio != null && Number.isFinite(d.affordabilityRatio)),
    [comparableMunicipalities],
  );

  const affordabilityRows = useMemo(
    () => comparableMunicipalities.filter((d) => d.affordabilityRatio != null && Number.isFinite(d.affordabilityRatio)),
    [comparableMunicipalities],
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
    if (!hasAffordabilityData || activeLayer === "prices") return comparableMunicipalities;
    if (activeLayer === "affordable") {
      return comparableMunicipalities.filter((d) => top10.has(d.municipalityKey));
    }
    return comparableMunicipalities.filter((d) => bottom10.has(d.municipalityKey));
  }, [activeLayer, comparableMunicipalities, hasAffordabilityData, top10, bottom10]);

  const nationalAvgPrice = useMemo(
    () => {
      const totals = validPriceRows.reduce(
        (result, row) => ({
          weightedPrice:
            result.weightedPrice + (row.avgPricePerM2 ?? 0) * Math.max(0, row.sampleCount),
          transactionCount: result.transactionCount + Math.max(0, row.sampleCount),
        }),
        { weightedPrice: 0, transactionCount: 0 },
      );

      return totals.transactionCount > 0 ? totals.weightedPrice / totals.transactionCount : null;
    },
    [validPriceRows],
  );

  const validSalaryRows = useMemo(
    () => comparableMunicipalities.filter((d) => d.avgNetSalary != null && Number.isFinite(d.avgNetSalary)),
    [comparableMunicipalities],
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

  const [uniqueTransactions, setUniqueTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    fetch("/data/transactions.json")
      .then((r) => r.json())
      .then((data) => setUniqueTransactions(data))
      .catch((e) => console.error("Transakcij ni bilo mogoče naložiti", e));
  }, []);

  const filteredTransactions = useMemo(() => {
    return uniqueTransactions.filter((tx) => {
      if (filterRooms !== "all" && tx.rooms !== parseFloat(filterRooms)) return false;
      if (filterType !== "all" && tx.propertyType !== filterType) return false;
      if (tx.saleYear != null && (tx.saleYear < filterYearMin || tx.saleYear > filterYearMax)) return false;
      if (tx.pricePerM2 != null && (tx.pricePerM2 < filterPriceMin || tx.pricePerM2 > filterPriceMax)) return false;
      return true;
    });
  }, [uniqueTransactions, filterRooms, filterType, filterYearMin, filterYearMax, filterPriceMin, filterPriceMax]);

  const displayedTransactions = useMemo(() => {
    if (!selectedRegionFeature) return filteredTransactions;

    return filteredTransactions.filter((tx) => pointInFeature(tx.lat, tx.lon, selectedRegionFeature));
  }, [filteredTransactions, selectedRegionFeature]);

  const selectedData = useMemo(() => {
    if (!selectedMunicipality) return null;

    const d = comparableMunicipalities.find((item) => item.municipalityKey === selectedMunicipality);
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
    comparableMunicipalities,
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
      .filter((row) => row.saleYear === mapComparisonYear)
      .filter((row) => activePoiCategories.has(row.category as POICategory))
      .filter((row) => row.repTxLat != null && row.repTxLon != null && row.poiLat != null && row.poiLon != null)
      .filter((row) => pointInFeature(row.repTxLat as number, row.repTxLon as number, selectedRegionFeature))
      .sort((a, b) => (a.repTxPricePerM2 ?? 0) - (b.repTxPricePerM2 ?? 0));
  }, [selectedRegionFeature, activePoiCategories, mapComparisonYear]);

  const selectedRegionRepresentativeTransactionCount = useMemo(
    () =>
      new Set(selectedRegionRepresentativePois.map((row) => getRepresentativeTransactionKey(row))).size,
    [selectedRegionRepresentativePois],
  );

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

    fullPoiLayersRef.current[category] = group;
    if (map.getZoom() >= 13) {
      group.addTo(map);
    }
  }, []);

  const loadPoisForCategory = useCallback(async (category: POICategory): Promise<LoadedPoi[]> => {
    const cached = poiCacheRef.current[category];
    if (cached) return cached;

    const storageKey = `poi_cache_${category}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        poiCacheRef.current[category] = parsed;
        return parsed;
      }
    } catch {
      // ignore
    }

    const cfg = POI_CONFIG[category];
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      body: `data=${encodeURIComponent(cfg.query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!response.ok) {
      throw new Error(`Overpass request failed for ${cfg.label}: ${response.status}`);
    }

    const json = (await response.json()) as { elements?: OverpassElement[] };
    const seen = new Set<string>();
    const pois = (json.elements ?? [])
      .map((el) => elementToLoadedPoi(el, category))
      .filter((poi): poi is LoadedPoi => poi !== null)
      .filter((poi) => {
        const key = `${poi.category}-${poi.id}-${poi.lat.toFixed(6)}-${poi.lon.toFixed(6)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    poiCacheRef.current[category] = pois;
    try {
      localStorage.setItem(`poi_cache_${category}`, JSON.stringify(pois));
    } catch {
      // ignore če je localStorage poln
    }
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

  markersLayerRef.current.on("clusterclick", (event: ClusterClickEvent) => {
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
    const zoom = map.getZoom();
    zoomRef.current = zoom;
    setCurrentZoom(zoom);
    map.fire("zoomchanged");

    Object.values(fullPoiLayersRef.current).forEach((layer) => {
      if (!layer) return;
      if (zoom >= 13) {
        if (!map.hasLayer(layer)) map.addLayer(layer);
      } else {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      }
    });
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

    const geoJsonLayer = L.geoJSON(regionsGeoJson, {
      style: {
        color: "#111827",
        weight: 1.5,
        fillColor: "#93c5fd",
        fillOpacity: 0.08,
      },
      onEachFeature: (feature, layer) => {
        const typedFeature = feature as GeoJsonFeature;
        const name = getFeatureName(typedFeature);
        const regionId = getFeatureRegionId(typedFeature);
        let pathElement: Element | null = null;

        const selectRegion = () => {
          setSelectedRegionId(regionId);
          setSelectedRegionName(name);
          setSelectedRegionFeature(typedFeature);
          setSelectedMunicipality(null);
          setClickProbe(null);

          if ("getBounds" in layer && map.getZoom() < 10) {
            map.fitBounds((layer as L.Polygon).getBounds(), { padding: [30, 30] });
          }
        };

        layer.bindTooltip(`${name} (${regionId})`);

        layer.on("click", (event: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(event.originalEvent);
          selectRegion();
        });

        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          selectRegion();
        };

        layer.on("add", () => {
          const element = "getElement" in layer ? (layer as L.Path).getElement() : undefined;
          if (!element) return;

          pathElement = element;
          element.setAttribute("tabindex", "0");
          element.setAttribute("role", "button");
          element.setAttribute("aria-label", `Izberi statistično regijo ${name}`);
          element.setAttribute("aria-pressed", "false");
          element.addEventListener("keydown", handleKeyDown);
        });

        layer.on("remove", () => {
          if (pathElement) {
            pathElement.removeEventListener("keydown", handleKeyDown);
            pathElement = null;
          }
        });
      },
    });

    geoJsonLayer.addTo(map);
    geoJsonLayer.bringToBack();
    regionsLayerRef.current = geoJsonLayer;
  }, [regionsGeoJson]);

  useEffect(() => {
    const regionsLayer = regionsLayerRef.current;
    if (!regionsLayer) return;

    regionsLayer.eachLayer((layer) => {
      const pathLayer = layer as L.Path & { feature?: GeoJsonFeature };
      if (!pathLayer.feature) return;

      const isSelected = getFeatureRegionId(pathLayer.feature) === selectedRegionId;
      pathLayer.setStyle({
        color: isSelected ? "#2563eb" : "#111827",
        weight: isSelected ? 3 : 1.5,
        fillColor: isSelected ? "#60a5fa" : "#93c5fd",
        fillOpacity: isSelected ? 0 : 0.08,
      });
      pathLayer.getElement()?.setAttribute("aria-pressed", String(isSelected));
    });
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
        title: `${d.displayMunicipality}: ${formatPricePerM2(d.avgPricePerM2)} na m², ${d.sampleCount} transakcij`,
      });

      marker.bindPopup(`
        <div style="font-size:14px;line-height:1.5;min-width:220px;">
          <div style="font-weight:700;font-size:16px;margin-bottom:6px;">${escapeHtml(d.displayMunicipality)}</div>
          <div><strong>Leto:</strong> ${d.saleYear}</div>
          <div><strong>Povpr. cena/m²:</strong> ${d.avgPricePerM2 != null ? `€${Math.round(d.avgPricePerM2).toLocaleString("sl-SI")}` : "Ni podatka"}</div>
          <div><strong>Mediana cena/m²:</strong> ${d.medianPricePerM2 != null ? `€${Math.round(d.medianPricePerM2).toLocaleString("sl-SI")}` : "Ni podatka"}</div>
          <div><strong>Št. transakcij:</strong> ${d.sampleCount}</div>
          <div><strong>Mediana trgovina:</strong> ${formatDistance(d.medianGroceryM)}</div>
          <div><strong>Mediana šola:</strong> ${formatDistance(d.medianSchoolM)}</div>
          <div><strong>Mediana lekarna:</strong> ${formatDistance(d.medianPharmacyM)}</div>
        </div>
      `);

      marker.on("click", (event: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(event.originalEvent);
        setSelectedMunicipality(d.municipalityKey);
        setSelectedRegionId(null);
        setSelectedRegionName(null);
        setSelectedRegionFeature(null);
        setClickProbe(null);
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

      displayedTransactions.forEach((tx) => {
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
              <div>Cena/m²: ${tx.pricePerM2 != null ? `€${Math.round(tx.pricePerM2).toLocaleString("sl-SI")}` : "Ni podatka"}</div>
              <div>Površina: ${tx.areaM2 != null ? `${tx.areaM2} m²` : "Ni podatka"}</div>
              <div>Leto: ${tx.saleYear ?? "Ni podatka"}</div>
            </div>
          `)
          .on("click", (event: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(event.originalEvent);
            setSelectedMunicipality(null);
            setClickProbe({ lat: tx.lat, lon: tx.lon });
          })
          .addTo(layer);
      });
    };

    map.on("zoomend moveend", updateTransactions);
    updateTransactions();

    return () => {
      map.off("zoomend moveend", updateTransactions);
      layer.clearLayers();
    };
  }, [displayedTransactions, minPrice, maxPrice]);

  useEffect(() => {
    const layer = representativeLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    const transactionGroups = new Map<string, RepresentativePoiRow[]>();
    mapRepresentativePois.forEach((poi) => {
      const key = getRepresentativeTransactionKey(poi);
      const rows = transactionGroups.get(key) ?? [];
      rows.push(poi);
      transactionGroups.set(key, rows);
    });

    transactionGroups.forEach((rows) => {
      const transaction = rows[0];
      const categorySummary = rows
        .map((row) => {
          const meta = representativePoiMeta[row.category as RepresentativePoiCategory];
          return meta
            ? `${meta.icon} ${escapeHtml(meta.label)}: ${formatDistance(row.repTxNearestDistanceM)}`
            : null;
        })
        .filter((summary): summary is string => summary !== null)
        .join("<br/>");

      L.circleMarker([transaction.repTxLat as number, transaction.repTxLon as number], {
        radius: selectedMunicipality ? 7 : 5,
        color: "#111827",
        fillColor: "#0f766e",
        fillOpacity: 0.9,
        weight: 2,
        bubblingMouseEvents: false,
      })
        .bindPopup(
          `<div style="font-size:13px;line-height:1.45;min-width:210px;">
            <strong>Reprezentativna transakcijska točka</strong><br/>
            Občina: ${escapeHtml(transaction.municipality)}<br/>
            Cena/m²: <strong>${formatPricePerM2(transaction.repTxPricePerM2)}</strong><br/>
            ${categorySummary}
          </div>`,
        )
        .addTo(layer);
    });

    mapRepresentativePois.forEach((poi) => {
      const meta = representativePoiMeta[poi.category as RepresentativePoiCategory];
      if (!meta) return;

      L.marker([poi.poiLat as number, poi.poiLon as number], {
        icon: getPoiIcon(poi.category as POICategory),
        bubblingMouseEvents: false,
        title: `${meta.label}: ${poi.poiName}`,
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
  }, [mapRepresentativePois, selectedMunicipality]);

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

  const searchAddress = useCallback(async (query: string) => {
    searchAbortRef.current?.abort();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      searchAbortRef.current = null;
      setSearchResults([]);
      setSearchLoading(false);
      setSearchFeedback(null);
      return;
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearchLoading(true);
    setSearchFeedback({ kind: "status", message: "Iskanje naslova poteka …" });

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmedQuery)}&countrycodes=si&format=json&limit=5`,
        {
          headers: { "Accept-Language": "sl", "User-Agent": "dashboard-insights-slovenia/1.0" },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`Nominatim request failed: ${response.status}`);
      }

      const data = (await response.json()) as AddressSearchResult[];
      if (searchAbortRef.current === controller) {
        setSearchResults(data);
        setSearchFeedback({
          kind: "status",
          message:
            data.length === 0
              ? `Za »${trimmedQuery}« ni zadetkov.`
              : data.length === 1
                ? "Najden je 1 zadetek."
                : `Najdenih je ${data.length} zadetkov.`,
        });
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError" && searchAbortRef.current === controller) {
        setSearchResults([]);
        setSearchFeedback({
          kind: "error",
          message: "Iskanje naslova trenutno ni uspelo. Preverite povezavo in poskusite znova.",
        });
      }
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
        setSearchLoading(false);
      }
    }
  }, []);

  useEffect(
    () => () => {
      searchAbortRef.current?.abort();
    },
    [],
  );

  const clearClickProbe = useCallback(() => {
    setClickProbe(null);
    setNearestResults([]);
    nearestLayerRef.current?.clearLayers();
  }, []);

  const poiEntries = Object.entries(POI_CONFIG) as [POICategory, PoiConfig][];

  return (
    <div className="space-y-5">
      <section className="overflow-visible rounded-2xl border bg-card shadow-sm">
        <div className="grid gap-5 border-b p-4 sm:p-5 lg:grid-cols-[minmax(220px,0.7fr)_minmax(360px,1.3fr)] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Raziskovalnik lokacij</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Poiščite naslov ali izberite območje</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Približajte zemljevid za posamezne transakcije, kliknite občino za podrobnosti.
            </p>
          </div>

          <div className="relative">
            <label htmlFor="map-address-search" className="sr-only">Naslov ali ulica v Sloveniji</label>
            <div className="flex gap-2">
              <input
                id="map-address-search"
                type="search"
                placeholder="Naslov ali ulica v Sloveniji"
                value={searchQuery}
                onChange={(event) => {
                  searchAbortRef.current?.abort();
                  searchAbortRef.current = null;
                  setSearchLoading(false);
                  setSearchResults([]);
                  setSearchFeedback(null);
                  setSearchQuery(event.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void searchAddress(searchQuery);
                }}
                aria-controls={searchResults.length > 0 ? "map-search-results" : undefined}
                className="min-h-11 min-w-0 flex-1 rounded-xl border bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <button
                type="button"
                onClick={() => void searchAddress(searchQuery)}
                disabled={searchLoading || !searchQuery.trim()}
                className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {searchLoading ? "Iščem …" : "Poišči"}
              </button>
            </div>

            {searchFeedback && (
              <p
                role={searchFeedback.kind === "error" ? "alert" : "status"}
                className={`mt-2 text-xs ${
                  searchFeedback.kind === "error" ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {searchFeedback.message}
              </p>
            )}

            {searchResults.length > 0 && (
              <div
                id="map-search-results"
                className="absolute z-[1000] mt-2 max-h-72 w-full overflow-y-auto rounded-xl border bg-card p-1 shadow-xl"
              >
                {searchResults.map((result, i) => (
                  <button
                    key={`${result.lat}-${result.lon}-${i}`}
                    type="button"
                    className="min-h-10 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      const lat = parseFloat(result.lat);
                      const lon = parseFloat(result.lon);
                      mapRef.current?.setView([lat, lon], 15, { animate: true });
                      setSearchQuery(result.display_name);
                      setSearchResults([]);
                      setSearchFeedback(null);
                      setClickProbe({ lat, lon });
                    }}
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Prikaz občin
              </legend>
              <div className="flex flex-wrap gap-2">
                {([
                  ["prices", "Cena na m²", false],
                ] as [LayerType, string, boolean][]).map(([key, label, disabled]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => !disabled && setActiveLayer(key)}
                    disabled={disabled}
                    aria-pressed={activeLayer === key}
                    className={`min-h-10 rounded-full border px-4 text-sm font-medium transition ${
                      activeLayer === key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted"
                    } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Legenda zemljevida">
              <div className="flex items-center gap-2">
                <span>€{Math.round(minPrice).toLocaleString("sl-SI")}</span>
                <div
                  className="h-2.5 w-28 rounded-full"
                  style={{ background: "linear-gradient(to right, hsl(172 45% 38%), hsl(172 45% 20%))" }}
                />
                <span>€{Math.round(maxPrice).toLocaleString("sl-SI")}</span>
                <span className="font-medium text-foreground">cena/m²</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full border-2 border-dashed border-stone-500 bg-stone-400/50" />
                <span>le 1 transakcija</span>
              </div>
            </div>
          </div>

          <details className="group rounded-xl border bg-muted/20">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold marker:content-none">
              <span>Filtri transakcij in bližnje storitve</span>
              <span aria-hidden="true" className="text-lg text-muted-foreground transition group-open:rotate-45">+</span>
            </summary>

            <div className="grid gap-5 border-t p-4 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-semibold">Filtri transakcijskih točk</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="map-property-type" className="text-xs font-medium text-muted-foreground">Tip nepremičnine</label>
                    <select
                      id="map-property-type"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="min-h-10 rounded-lg border bg-background px-3 text-sm"
                    >
                      <option value="all">Vsi tipi</option>
                      <option value="stanovanje">Stanovanje</option>
                      <option value="hisa">Hiša</option>
                      <option value="garaza">Garaža</option>
                      <option value="poslovni">Poslovni prostor</option>
                      <option value="klet_shramba">Klet ali shramba</option>
                      <option value="drugo">Drugo</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Leto prodaje</span>
                    <div className="flex items-center gap-2">
                      <label htmlFor="map-year-min" className="sr-only">Od leta</label>
                      <input id="map-year-min" type="number" value={filterYearMin} onChange={(e) => setFilterYearMin(Number(e.target.value))} className="min-h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm" min={2020} max={2025} />
                      <span aria-hidden="true" className="text-muted-foreground">–</span>
                      <label htmlFor="map-year-max" className="sr-only">Do leta</label>
                      <input id="map-year-max" type="number" value={filterYearMax} onChange={(e) => setFilterYearMax(Number(e.target.value))} className="min-h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm" min={2020} max={2025} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-xs font-medium text-muted-foreground">Cena na m²</span>
                    <div className="flex items-center gap-2">
                      <label htmlFor="map-price-min" className="sr-only">Najnižja cena na m²</label>
                      <input id="map-price-min" type="number" value={filterPriceMin} onChange={(e) => setFilterPriceMin(Number(e.target.value))} className="min-h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm" />
                      <span aria-hidden="true" className="text-muted-foreground">–</span>
                      <label htmlFor="map-price-max" className="sr-only">Najvišja cena na m²</label>
                      <input id="map-price-max" type="number" value={filterPriceMax} onChange={(e) => setFilterPriceMax(Number(e.target.value))} className="min-h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm" />
                      <span className="text-xs text-muted-foreground">€</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-md text-xs text-muted-foreground">
                    Filtri veljajo za transakcijske točke pri večji povečavi, ne za občinske agregate. Podatek o številu sob v viru trenutno manjka.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterRooms("all");
                      setFilterType("all");
                      setFilterYearMin(2020);
                      setFilterYearMax(2025);
                      setFilterPriceMin(0);
                      setFilterPriceMax(15000);
                    }}
                    className="min-h-10 rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted"
                  >
                    Ponastavi filtre
                  </button>
                </div>
              </div>

              <fieldset>
                <legend className="mb-1 text-sm font-semibold">Točke interesa</legend>
                <p className="mb-3 text-xs text-muted-foreground">
                  Izberite storitve, ki jih želite prikazati in vključiti v iskanje najbližje lokacije.
                </p>
                <div className="flex flex-wrap gap-2">
                  {poiEntries.map(([key, cfg]) => {
                    const isActive = activePoiCategories.has(key);
                    const isLoading = loadingPoiCategories.has(key);
                    const count = poiCacheRef.current[key]?.length;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => void togglePoiCategory(key)}
                        disabled={isLoading}
                        aria-pressed={isActive}
                        className={`min-h-10 rounded-full border px-3 text-xs font-medium transition ${
                          isActive
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted"
                        } ${isLoading ? "cursor-wait opacity-50" : ""}`}
                      >
                        {cfg.icon} {cfg.label}
                        {isLoading ? " …" : isActive && count != null ? ` (${count})` : ""}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </details>

          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950">
            Občinski krogi, barvna lestvica, povprečje in rang so izračunani samo za leto {mapComparisonYear} (
            {comparableMunicipalities.length} občin). Starejših občinskih agregatov ne mešamo v isto primerjavo;
            transakcijske točke imajo ločen letni filter. Povprečje cene je tehtano s številom transakcij.
          </div>

          {regionsError && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950">{regionsError}</div>}
          {poiError && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950">{poiError}</div>}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div
          ref={containerRef}
          role="region"
          aria-label="Interaktivni zemljevid nepremičninskih podatkov Slovenije"
          className="h-[58dvh] min-h-[440px] w-full overflow-hidden rounded-2xl border bg-muted shadow-sm lg:h-[680px]"
        />

        <Card className="h-fit rounded-2xl shadow-none xl:sticky xl:top-24">
          <CardHeader className="border-b">
            <CardTitle className="text-xl">Podrobnosti lokacije</CardTitle>
            <CardDescription>
              Izberite statistično regijo, občino ali poljubno točko na zemljevidu.
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
                      Na zemljevidu je prikazanih {selectedRegionRepresentativeTransactionCount} unikatnih
                      reprezentativnih transakcijskih točk in {selectedRegionRepresentativePois.length} kategorijskih
                      povezav za aktivne POI kategorije.
                    </div>
                    <button
                      onClick={() => {
                        setSelectedRegionId(null);
                        setSelectedRegionName(null);
                        setSelectedRegionFeature(null);
                        mapRef.current?.fitBounds(SLOVENIA_MAX_BOUNDS, { padding: [20, 20] });
                      }}
                      className="rounded-md border bg-card px-2 py-1 text-xs hover:bg-muted"
                    >
                      Počisti regijo
                    </button>
                  </div>
                ) : (
                  <div className="text-muted-foreground">Kliknite modro regijo na zemljevidu.</div>
                )}
              </div>

              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <div className="mb-2 font-medium">Najbližje storitve</div>
                <div className="mb-3 text-muted-foreground">
                  Kliknite poljubno točko na zemljevidu. Za aktivne kategorije bodo prikazane najbližje storitve in povezave.
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
                  <div className="font-medium">Podatki občine</div>
                  <div className="text-sm text-muted-foreground">
                    Kliknite občinski krog za cene, dostop do storitev in kakovost vzorca. Izbira regije prikaže transakcijske točke.
                  </div>
                </div>

                {!selectedData ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Trenutno ni izbrane občine. Kliknite enega od občinskih krogov na zemljevidu.
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
                        <div className="text-lg font-semibold">{selectedData.sampleCount.toLocaleString("sl-SI")}</div>
                        <div className="text-xs text-muted-foreground">kakovost vzorca</div>
                      </div>

                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">Razmerje dostopnosti</div>
                        <div className="text-lg font-semibold">
                          {selectedData.affordabilityRatio != null ? selectedData.affordabilityRatio.toFixed(2) : "V pripravi"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedData.avgNetSalary == null ? "podatek o plači še ni združen" : "mesečnih plač za 1 m²"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border p-3 text-sm">
                      <div>
                        <div className="font-medium">Dostop do storitev</div>
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
                        Izbrani primeri pomagajo pojasniti tipične razdalje v občini; ne predstavljajo vseh storitev.
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
                        <span>Dodatne podrobnosti</span>
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
                              <span className="text-muted-foreground">Rang po dostopnosti</span>
                              <span className="font-medium">{selectedData.affordabilityRank ? `#${selectedData.affordabilityRank}` : "Ni podatka"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Cena vs. tehtano povpr. {mapComparisonYear}
                              </span>
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
                              Občinske metrike so agregirane iz transakcij. Iskanje najbližje storitve uporablja širši nabor točk interesa kot izbrani občinski primeri.
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
