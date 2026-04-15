import { getCachedWeather, setCachedWeather } from "./cache/weatherCache.js";

export async function getWeatherByCity(city) {
  const cachedWeather = getCachedWeather(city);

  if (cachedWeather) {
    return cachedWeather;
  }

  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
  const geoResponse = await fetch(geoUrl);
  const geoData = await geoResponse.json();

  if (!geoData.results || geoData.results.length === 0) {
    throw new Error("Cidade não encontrada");
  }

  const { latitude, longitude, name, country } = geoData.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
  const weatherResponse = await fetch(weatherUrl);
  const weatherData = await weatherResponse.json();

  if (!weatherData.current_weather) {
    throw new Error("Dados de clima indisponíveis");
  } 

  const weather = {
    city: name,
    country,
    temperature: weatherData.current_weather.temperature,
  };

  setCachedWeather(city, weather);

  return weather;
}

export async function getWeatherByCities(cities) {
  const results = [];

  for (const rawCity of cities) {
    const city = rawCity.trim();

    if (!city) {
      continue;
    }

    try {
      const weather = await getWeatherByCity(city);
      results.push(weather);
    } catch (error) {
      results.push({
        city,
        error: error.message,
      });
    }
  }

  return results;
}
export { clearWeatherCache } from "./cache/weatherCache.js";
