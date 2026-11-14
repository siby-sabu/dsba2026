/**
 * Utility to load and merge split GeoJSON files
 *
 * The india_states.geojson file was split into two parts to stay under
 * Git's 50MB file size limit. This utility loads both parts and merges them.
 */

export async function loadIndiaStatesGeoJSON() {
  try {
    // Load both parts in parallel
    const [part1Response, part2Response] = await Promise.all([
      fetch('/india_states_part1.geojson'),
      fetch('/india_states_part2.geojson')
    ]);

    const [part1, part2] = await Promise.all([
      part1Response.json(),
      part2Response.json()
    ]);

    // Merge the features from both parts
    const mergedGeoJSON = {
      type: 'FeatureCollection',
      features: [...part1.features, ...part2.features]
    };

    console.log(`Loaded ${mergedGeoJSON.features.length} states from split GeoJSON files`);

    return mergedGeoJSON;
  } catch (error) {
    console.error('Error loading GeoJSON files:', error);
    throw error;
  }
}

/**
 * Get state distribution info
 */
export function getGeoJSONInfo(geojson) {
  const totalPoints = geojson.features.reduce(
    (sum, feature) => sum + (feature.properties.num_points || 0),
    0
  );

  return {
    stateCount: geojson.features.length,
    totalPoints: totalPoints,
    states: geojson.features.map(f => f.properties.name).sort()
  };
}
