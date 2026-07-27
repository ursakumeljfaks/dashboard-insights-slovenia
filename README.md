# Nepremičninski trg Slovenije

Interaktivna nadzorna plošča za raziskovanje cen stanovanj, lokalnih plač,
dostopnosti in nepremičninskih transakcij po slovenskih občinah.

## Lokalni zagon

Potrebujete Node.js 20.19+ ali 22.12+ in npm.

```bash
npm ci
npm run dev
```

Razvojni strežnik je nato dostopen na
[http://localhost:8080](http://localhost:8080).

## Razpoložljivi ukazi

```bash
npm run dev        # razvojni strežnik
npm run build      # produkcijski build v dist/
npm run preview    # lokalni predogled produkcijskega builda
npm run lint       # ESLint
npm test           # enkraten zagon testov Vitest
npm run test:watch # Vitest v načinu watch
```

Ukaz `npm run build:pois` ponovno pridobi podatke iz Overpass API-ja in
prepiše generirano datoteko `public/data/fullPoisLatest.json`. Za običajen
zagon aplikacije ni potreben.

## Arhitektura

- `src/pages/Index.tsx` vsebuje povzetek trga, graf in lestvice dostopnosti.
- `src/pages/ComparePage.tsx` primerja dve občini po petih ločenih dimenzijah.
- `src/pages/MapPage.tsx` odpre interaktivni zemljevid.
- `src/pages/MethodologyPage.tsx` dokumentira formule, pragove in omejitve.
- `src/components/SloveniaMap.tsx` povezuje Leaflet, občinske in
  transakcijske podatke ter POI-je.
- `src/components/ui/` vsebuje ponovno uporabljene gradnike shadcn/Radix.
- `src/data/` vsebuje statične agregate, `public/data/` pa večje JSON in
  GeoJSON datoteke, ki se naložijo ob uporabi.

Aplikacija je odjemalska Vite/React aplikacija. Zemljevid uporablja
OpenStreetMap, iskanje Nominatim, izbrane POI-poizvedbe pa Overpass API, zato
te funkcije potrebujejo dostop do interneta.

## Metodološko opozorilo

Trenutno obstajata dva občinska podatkovna vira. Povzetek na začetni strani
uporablja `src/data/realEstateData.ts`, zemljevid pa ločeni, časovno označeni
`src/data/municipalityAccessibilityLatest.ts`. V slednjem plače in razmerje
dostopnosti še niso združeni, leta cen pa niso enaka za vse občine. Zato
zemljevid občinske kroge, barvno lestvico in razvrstitve omeji na najnovejše
leto v naboru ter starejših občinskih agregatov ne meša v isti presek.

Vrednosti iz obeh virov zato niso neposredno primerljive. Pred občinsko
primerjavo ali izračunom dostopnosti je treba preveriti obdobje, vir,
manjkajoče vrednosti in število transakcij; majhen vzorec je treba obravnavati
kot orientacijski rezultat.
