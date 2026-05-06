export async function loadSloveniaNuts3() {
  const res = await fetch(
    "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_60M_2024_4326_LEVL_3.geojson"
  );

  const geojson = await res.json();

  return {
    ...geojson,
    features: geojson.features.filter((f: any) =>
      f.properties.NUTS_ID.startsWith("SI")
    ),
  };
}