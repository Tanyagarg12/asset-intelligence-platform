// Coordinates for the cities that appear in this fleet's live station data
// (each station's `location` field, e.g. "Bengaluru, Karnataka"). These are
// public, verifiable city coordinates — not platform data — used only to
// position a real station on the map, since the platform's own /stations
// response does not yet include per-station latitude/longitude.

export interface CityCoord {
  lat: number;
  lng: number;
}

export const INDIA_CITY_COORDS: Record<string, CityCoord> = {
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Delhi: { lat: 28.7041, lng: 77.1025 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Lucknow: { lat: 26.8467, lng: 80.9462 },
  Chandigarh: { lat: 30.7333, lng: 76.7794 },
  Kochi: { lat: 9.9312, lng: 76.2673 },
  Indore: { lat: 22.7196, lng: 75.8577 },
  Nagpur: { lat: 21.1458, lng: 79.0882 },
  Coimbatore: { lat: 11.0168, lng: 76.9558 },
  Surat: { lat: 21.1702, lng: 72.8311 },
  Bhopal: { lat: 23.2599, lng: 77.4126 },
  Visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  Patna: { lat: 25.5941, lng: 85.1376 },
  Vadodara: { lat: 22.3072, lng: 73.1812 },
  Nashik: { lat: 19.9975, lng: 73.7898 },
  Guwahati: { lat: 26.1445, lng: 91.7362 },
  Thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
  Bhubaneswar: { lat: 20.2961, lng: 85.8245 },
  Mysuru: { lat: 12.2958, lng: 76.6394 },
};

/** A station's `location` is "City, State" — this reads just the city and
 * looks it up, falling back to null (caller decides how to handle an
 * unrecognised city) rather than guessing a coordinate. */
export function cityCoordFromLocation(location: string): CityCoord | null {
  const city = location.split(",")[0]?.trim();
  return city ? (INDIA_CITY_COORDS[city] ?? null) : null;
}

/** Deterministic jitter so multiple stations in the same city don't stack
 * exactly on top of each other — seeded from the station id, so a given
 * station always lands in the same spot rather than moving on every render. */
export function jitterCoord(coord: CityCoord, seed: string): CityCoord {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const a = ((hash % 1000) / 1000 - 0.5) * 0.3;
  const b = (((hash >> 8) % 1000) / 1000 - 0.5) * 0.3;
  return { lat: coord.lat + a, lng: coord.lng + b };
}
