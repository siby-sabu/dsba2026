# GeoJSON Files

## Why Split Files?

The original `india_states.geojson` file (55MB) exceeded Git's recommended 50MB limit. It has been split into two balanced parts:

- **india_states_part1.geojson** (7.4MB) - 18 states
- **india_states_part2.geojson** (7.4MB) - 17 states

## State Distribution

### Part 1 States (18 states, 392,232 points)
- Andaman and Nicobar
- Arunachal Pradesh
- Chandigarh
- Chhattisgarh
- Dadra and Nagar Haveli
- Delhi
- Goa
- Gujarat
- Haryana
- Jammu and Kashmir
- Lakshadweep
- Nagaland
- Orissa
- Punjab
- Rajasthan
- Tamil Nadu
- Tripura
- Uttar Pradesh

### Part 2 States (17 states, 392,274 points)
- Andhra Pradesh
- Assam
- Bihar
- Daman and Diu
- Himachal Pradesh
- Jharkhand
- Karnataka
- Kerala
- Madhya Pradesh
- Maharashtra
- Manipur
- Meghalaya
- Mizoram
- Puducherry
- Sikkim
- Uttaranchal
- West Bengal

## Usage in Code

Use the provided utility function to load and merge both parts:

```javascript
import { loadIndiaStatesGeoJSON } from '../utils/loadGeoJSON';

// Load merged GeoJSON
const indiaStates = await loadIndiaStatesGeoJSON();

// Use with Mapbox or Leaflet as normal
map.addSource('india-states', {
  type: 'geojson',
  data: indiaStates
});
```

## Original File

The original `india_states.geojson` is gitignored but remains in the local directory for reference. If you need to regenerate the split files, see the split script in the project history.
