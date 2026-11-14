"""
Convert geography.csv to state-level GeoJSON for clickable state boundaries
"""
import pandas as pd
import json
from collections import defaultdict

# Read geography data
print("Loading geography data...")
df = pd.read_csv('data/raw/geography/geography.csv')

print(f"Total rows: {len(df):,}")
print(f"States: {df['State'].nunique()}")
print(f"Districts: {df['District'].nunique()}")

# Group by state and collect all coordinates
state_boundaries = defaultdict(list)

for state in df['State'].unique():
    state_df = df[df['State'] == state]

    # Get all unique lat/lon pairs for this state, preserving order
    coords = state_df[['Latitude', 'Longitude', 'point_order']].drop_duplicates()
    coords = coords.sort_values('point_order')

    # Convert to [lon, lat] format (GeoJSON standard)
    coordinates = [[row['Longitude'], row['Latitude']] for _, row in coords.iterrows()]

    state_boundaries[state] = coordinates

# Create GeoJSON FeatureCollection
features = []
for state, coords in state_boundaries.items():
    # Close the polygon if not already closed
    if coords[0] != coords[-1]:
        coords.append(coords[0])

    feature = {
        "type": "Feature",
        "properties": {
            "name": state,
            "num_points": len(coords)
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [coords]  # Array of linear rings
        }
    }
    features.append(feature)

geojson = {
    "type": "FeatureCollection",
    "features": features
}

# Save to file
output_path = 'frontend/public/india_states.geojson'
with open(output_path, 'w') as f:
    json.dump(geojson, f, indent=2)

print(f"\n✅ Created {output_path}")
print(f"   {len(features)} states")
print(f"   Total coordinates: {sum(len(f['geometry']['coordinates'][0]) for f in features):,}")

# Print sample for verification
print("\nSample states:")
for feature in features[:5]:
    props = feature['properties']
    print(f"  - {props['name']}: {props['num_points']} boundary points")
