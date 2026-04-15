import { getWeatherByCity, getWeatherByCities } from "./services/weatherService.js";

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

export async function app(req, res) {
  const baseUrl = `http://${req.headers.host || "localhost"}`;
  const url = new URL(req.url, baseUrl);

  if (url.pathname === "/weather") {
    if (req.method !== "GET") {
      return sendJson(res, 405, { error: "Método não permitido" });
    }

    const city = url.searchParams.get("city")?.trim();
    const citiesParam = url.searchParams.get("cities");

    if (!city && citiesParam === null) {
      return sendJson(res, 400, { error: "Query param 'city' ou 'cities' é obrigatório" });
    }

    if (citiesParam !== null) {
      const cities = citiesParam
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (cities.length === 0) {
        return sendJson(res, 400, {
          error: "Query param 'cities' precisa ter ao menos uma cidade válida",
        });
      }

      const weatherByCities = await getWeatherByCities(cities);
      return sendJson(res, 200, { results: weatherByCities });
    }

    if (!city) {
      return sendJson(res, 400, { error: "Query param 'city' é obrigatório" });
    }

    try {
      const weather = await getWeatherByCity(city);
      return sendJson(res, 200, weather);
    } catch (error) {
      if (error.message === "Cidade não encontrada") {
        return sendJson(res, 404, { error: error.message });
      }

      return sendJson(res, 500, { error: "Erro interno ao buscar clima" });
    }
  }

  return sendJson(res, 404, { error: "Rota não encontrada" });
}
