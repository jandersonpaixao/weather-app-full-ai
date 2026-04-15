const CACHE_TTL_MS = 30 * 60 * 1000;
const weatherCache = new Map();

function normalizeCity(city) {
  return city.trim().toLowerCase();
}

export function getCachedWeather(city) {
  const cacheKey = normalizeCity(city);
  const cachedEntry = weatherCache.get(cacheKey);

  if (!cachedEntry) {
    return null;
  }

  if (Date.now() >= cachedEntry.expiresAt) {
    weatherCache.delete(cacheKey);
    return null;
  }

  return cachedEntry.data;
}

export function setCachedWeather(city, data) {
  const cacheKey = normalizeCity(city);

  weatherCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearWeatherCache() {
  weatherCache.clear();
}
