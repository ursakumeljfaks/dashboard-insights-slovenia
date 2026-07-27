type NutsRegionProperties = {
  ENOTA?: string;
};

export async function loadSloveniaNuts3() {
  const response = await fetch("/data/SR.geojson");

  if (!response.ok) {
    throw new Error("Failed to load SR.geojson");
  }

  const geojson = (await response.json()) as GeoJSON.FeatureCollection<GeoJSON.Geometry, NutsRegionProperties>;

  return {
    ...geojson,
    features: geojson.features.filter((feature) => feature.properties?.ENOTA === "SR"),
  };
}

export async function loadSloveniaStatisticalRegions() {
  return loadSloveniaNuts3();
}
