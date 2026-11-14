"""
Create simplified, clean state boundaries from geography.csv
Uses GeoPandas to reduce complexity and create readable maps
"""
import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon, MultiPolygon
import json

print("Loading geography data...")
df = pd.read_csv('data/raw/geography/geography.csv')

print(f"Total rows: {len(df):,}")
print(f"States: {df['State'].nunique()}")

# Group by state and create geometries
states_geom = []

for state_name in sorted(df['State'].unique()):
    print(f"\nProcessing {state_name}...")
    state_df = df[df['State'] == state_name]

    # Group by district to create separate polygons
    district_polygons = []

    for district_name in state_df['District'].unique():
        district_df = state_df[state_df['District'] == district_name]

        # Get coordinates for this district
        coords = district_df[['Longitude', 'Latitude']].values.tolist()

        if len(coords) >= 3:
            # Close the polygon
            if coords[0] != coords[-1]:
                coords.append(coords[0])

            try:
                poly = Polygon(coords)
                if poly.is_valid:
                    district_polygons.append(poly)
            except Exception as e:
                print(f"  Warning: Skipping {district_name}: {e}")

    if district_polygons:
        # Combine all district polygons into one state geometry
        if len(district_polygons) == 1:
            state_geom = district_polygons[0]
        else:
            # Union all district polygons
            from shapely.ops import unary_union
            state_geom = unary_union(district_polygons)

        states_geom.append({
            'name': state_name,
            'geometry': state_geom
        })

        print(f"  ✓ Created geometry with {len(district_polygons)} districts")

# Create GeoDataFrame
print("\nCreating GeoDataFrame...")
gdf = gpd.GeoDataFrame(states_geom, crs='EPSG:4326')

# SIMPLIFY - This is the key to clean boundaries!
print("\nSimplifying geometries (tolerance=0.01)...")
gdf['geometry'] = gdf['geometry'].simplify(tolerance=0.01, preserve_topology=True)

# Convert to GeoJSON
print("\nConverting to GeoJSON...")
geojson = json.loads(gdf.to_json())

# Save simplified version
output_path = 'data/processed/india_states_simplified.geojson'
with open(output_path, 'w') as f:
    json.dump(geojson, f, indent=2)

print(f"\n✅ Created {output_path}")
print(f"   {len(geojson['features'])} states")

# Calculate size reduction
original_points = len(df)
simplified_points = sum(
    len(feature['geometry']['coordinates'][0])
    if feature['geometry']['type'] == 'Polygon'
    else sum(len(ring) for ring in feature['geometry']['coordinates'])
    for feature in geojson['features']
)

print(f"\n📊 Simplification Results:")
print(f"   Original points: {original_points:,}")
print(f"   Simplified points: {simplified_points:,}")
print(f"   Reduction: {(1 - simplified_points/original_points)*100:.1f}%")

# Show sample
print("\n✅ Sample states:")
for feature in geojson['features'][:5]:
    props = feature['properties']
    geom_type = feature['geometry']['type']
    if geom_type == 'Polygon':
        points = len(feature['geometry']['coordinates'][0])
    else:
        points = sum(len(ring) for ring in feature['geometry']['coordinates'])
    print(f"  - {props['name']}: {points} boundary points ({geom_type})")
