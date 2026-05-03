#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const OUTPUT_PATH = path.resolve(process.cwd(), "public/data/fullPoisLatest.json");
const PARTIAL_PATH = path.resolve(process.cwd(), "public/data/fullPoisLatest.partial.json");

// south, west, north, east
const SLOVENIA_BBOX = {
  south: 45.4,
  west: 13.3,
  north: 46.9,
  east: 16.6,
};

// Smaller tiles are gentler for Overpass.
// This makes more requests, but each request is much lighter.
const TILE_ROWS = 3;
const TILE_COLS = 4;

const REQUEST_DELAY_MS = 7000;
const RETRY_DELAY_MS = 30000;
const MAX_RETRIES_PER_TILE = 3;

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const POI_CONFIG = {
  school: {
    label: "Šole",
    queryForBbox: (bbox) => `[out:json][timeout:90];(
      node["amenity"="school"](${bbox});
      way["amenity"="school"](${bbox});
    );out center tags;`,
  },
  kindergarten: {
    label: "Vrtci",
    queryForBbox: (bbox) => `[out:json][timeout:90];(
      node["amenity"="kindergarten"](${bbox});
      way["amenity"="kindergarten"](${bbox});
    );out center tags;`,
  },
  grocery: {
    label: "Trgovine",
    queryForBbox: (bbox) => `[out:json][timeout:90];(
      node["shop"~"^(supermarket|convenience|grocery|greengrocer)$"](${bbox});
      way["shop"~"^(supermarket|convenience|grocery|greengrocer)$"](${bbox});
    );out center tags;`,
  },
  healthcare: {
    label: "Zdravstvo",
    queryForBbox: (bbox) => `[out:json][timeout:90];(
      node["amenity"~"^(hospital|clinic|doctors|dentist)$"](${bbox});
      way["amenity"~"^(hospital|clinic|doctors|dentist)$"](${bbox});
      node["healthcare"](${bbox});
      way["healthcare"](${bbox});
    );out center tags;`,
  },
  pharmacy: {
    label: "Lekarne",
    queryForBbox: (bbox) => `[out:json][timeout:90];(
      node["amenity"="pharmacy"](${bbox});
      way["amenity"="pharmacy"](${bbox});
    );out center tags;`,
  },
  park: {
    label: "Parki",
    queryForBbox: (bbox) => `[out:json][timeout:90];(
      node["leisure"="park"](${bbox});
      way["leisure"="park"](${bbox});
    );out center tags;`,
  },
  bus_stop: {
    label: "Bus postaje",
    queryForBbox: (bbox) => `[out:json][timeout:90];(
      node["highway"="bus_stop"](${bbox});
      node["public_transport"="platform"]["bus"="yes"](${bbox});
      way["public_transport"="platform"]["bus"="yes"](${bbox});
    );out center tags;`,
  },
  rail_stop: {
    label: "Železniške postaje",
    queryForBbox: (bbox) => `[out:json][timeout:90];(
      node["railway"~"^(station|halt|tram_stop)$"](${bbox});
      way["railway"~"^(station|halt|tram_stop)$"](${bbox});
    );out center tags;`,
  },
  motorway_junction: {
    label: "AC priključki",
    queryForBbox: (bbox) => `[out:json][timeout:90];(
      node["highway"="motorway_junction"](${bbox});
    );out center tags;`,
  },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeTiles() {
  const tiles = [];
  const latStep = (SLOVENIA_BBOX.north - SLOVENIA_BBOX.south) / TILE_ROWS;
  const lonStep = (SLOVENIA_BBOX.east - SLOVENIA_BBOX.west) / TILE_COLS;

  for (let row = 0; row < TILE_ROWS; row += 1) {
    for (let col = 0; col < TILE_COLS; col += 1) {
      const south = SLOVENIA_BBOX.south + row * latStep;
      const north = row === TILE_ROWS - 1 ? SLOVENIA_BBOX.north : south + latStep;
      const west = SLOVENIA_BBOX.west + col * lonStep;
      const east = col === TILE_COLS - 1 ? SLOVENIA_BBOX.east : west + lonStep;

      tiles.push({
        id: `r${row + 1}c${col + 1}`,
        bbox: [
          south.toFixed(6),
          west.toFixed(6),
          north.toFixed(6),
          east.toFixed(6),
        ].join(","),
      });
    }
  }

  return tiles;
}

function cleanTagValue(value) {
  if (value == null) return undefined;
  return String(value);
}

function elementToPoi(el, category) {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const rawTags = el.tags ?? {};
  const tags = Object.fromEntries(
    Object.entries(rawTags)
      .map(([key, value]) => [key, cleanTagValue(value)])
      .filter(([, value]) => value != null),
  );

  const name =
    tags.name ||
    tags["name:sl"] ||
    tags.operator ||
    tags.brand ||
    POI_CONFIG[category].label;

  return {
    id: `${category}-${el.type ?? "node"}-${el.id}`,
    osmType: el.type ?? null,
    osmId: String(el.id ?? ""),
    category,
    name,
    lat,
    lon,
    tags,
  };
}

async function postOverpass(endpoint, query) {
  const params = new URLSearchParams();
  params.set("data", query);

  const response = await fetch(endpoint, {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Accept": "*/*",
      "User-Agent": "dashboard-insights-slovenia-poi-builder/1.0",
    },
  });

  const text = await response.text();

  if (!response.ok) {
    const preview = text.slice(0, 800).replace(/\s+/g, " ").trim();
    throw new Error(`${response.status} ${response.statusText} — ${preview}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    const preview = text.slice(0, 800).replace(/\s+/g, " ").trim();
    throw new Error(`Response was not JSON — ${preview}`);
  }
}

async function fetchOverpass(query, category, tileId) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES_PER_TILE; attempt += 1) {
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        return await postOverpass(endpoint, query);
      } catch (error) {
        lastError = error;
        console.warn(
          `[WARN] ${category}/${tileId} attempt ${attempt}: ${endpoint} failed: ${error.message}`,
        );

        const isRateLimit =
          error.message.includes("429") ||
          error.message.toLowerCase().includes("too many requests");

        const isRejected =
          error.message.includes("406") ||
          error.message.toLowerCase().includes("not acceptable");

        if (isRateLimit || isRejected) {
          console.log(`[WAIT] ${Math.round(RETRY_DELAY_MS / 1000)}s before retry...`);
          await sleep(RETRY_DELAY_MS);
        } else {
          await sleep(REQUEST_DELAY_MS);
        }
      }
    }
  }

  throw lastError ?? new Error(`No Overpass endpoint available for ${category}/${tileId}`);
}

function loadExistingPartial() {
  if (!fs.existsSync(PARTIAL_PATH)) {
    return {
      meta: {
        generatedAt: null,
        source: "partial",
        bbox: SLOVENIA_BBOX,
      },
      pois: [],
      completedTiles: {},
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(PARTIAL_PATH, "utf8"));
    return {
      meta: parsed.meta ?? {},
      pois: Array.isArray(parsed.pois) ? parsed.pois : [],
      completedTiles: parsed.completedTiles ?? {},
    };
  } catch {
    return {
      meta: {
        generatedAt: null,
        source: "partial-corrupt-reset",
        bbox: SLOVENIA_BBOX,
      },
      pois: [],
      completedTiles: {},
    };
  }
}

function savePartial(state) {
  fs.mkdirSync(path.dirname(PARTIAL_PATH), { recursive: true });
  fs.writeFileSync(PARTIAL_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function dedupePois(pois) {
  const seen = new Set();

  return pois.filter((poi) => {
    const key = `${poi.category}-${poi.osmType}-${poi.osmId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const tiles = makeTiles();
  const state = loadExistingPartial();

  console.log(`[INFO] Tiles: ${tiles.length}`);
  console.log(`[INFO] Partial POIs already loaded: ${state.pois.length}`);

  for (const [category, cfg] of Object.entries(POI_CONFIG)) {
    console.log(`\n[CATEGORY] ${category} — ${cfg.label}`);

    for (const tile of tiles) {
      const doneKey = `${category}:${tile.id}`;

      if (state.completedTiles[doneKey]) {
        console.log(`[SKIP] ${doneKey}`);
        continue;
      }

      console.log(`[FETCH] ${doneKey} bbox=${tile.bbox}`);

      try {
        const query = cfg.queryForBbox(tile.bbox);
        const json = await fetchOverpass(query, category, tile.id);

        const pois = (json.elements ?? [])
          .map((el) => elementToPoi(el, category))
          .filter(Boolean);

        state.pois.push(...pois);
        state.pois = dedupePois(state.pois);
        state.completedTiles[doneKey] = {
          completedAt: new Date().toISOString(),
          countBeforeDedupe: pois.length,
        };
        state.meta.updatedAt = new Date().toISOString();

        savePartial(state);

        console.log(
          `[OK] ${doneKey}: +${pois.length.toLocaleString("sl-SI")} raw, total unique ${state.pois.length.toLocaleString("sl-SI")}`,
        );

        await sleep(REQUEST_DELAY_MS);
      } catch (error) {
        savePartial(state);
        console.error(`\n[ERROR] Failed at ${doneKey}`);
        console.error(error.message);
        console.error(`\nPartial progress saved to: ${PARTIAL_PATH}`);
        console.error("Run the script again later; it will continue from completed tiles.");
        process.exit(1);
      }
    }
  }

  const finalPois = dedupePois(state.pois).sort((a, b) => {
    const categoryCompare = a.category.localeCompare(b.category);
    if (categoryCompare !== 0) return categoryCompare;
    return a.name.localeCompare(b.name, "sl");
  });

  const countsByCategory = {};
  for (const poi of finalPois) {
    countsByCategory[poi.category] = (countsByCategory[poi.category] ?? 0) + 1;
  }

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      bbox: `${SLOVENIA_BBOX.south},${SLOVENIA_BBOX.west},${SLOVENIA_BBOX.north},${SLOVENIA_BBOX.east}`,
      source: "Overpass API / OpenStreetMap",
      count: finalPois.length,
      countsByCategory,
      tileRows: TILE_ROWS,
      tileCols: TILE_COLS,
    },
    pois: finalPois,
  };

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`\n[DONE] Wrote ${finalPois.length.toLocaleString("sl-SI")} POI-jev to ${OUTPUT_PATH}`);
  console.table(countsByCategory);
  console.log(`\n[NOTE] Partial cache kept at ${PARTIAL_PATH}`);
}

main().catch((error) => {
  console.error("\n[ERROR] Failed to build public/data/fullPoisLatest.json");
  console.error(error);
  process.exit(1);
});