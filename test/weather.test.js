import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { app } from "../src/app.js";
import {
  clearWeatherCache,
  getWeatherByCity,
  getWeatherByCities,
} from "../src/services/weatherService.js";

const originalFetch = global.fetch;
const originalDateNow = Date.now;

function mockFetch(responses) {
  let index = 0;

  global.fetch = async (url) => {
    if (index >= responses.length) {
      throw new Error(`Unexpected fetch call: ${url}`);
    }

    const current = responses[index];
    index += 1;

    if (current.error) {
      throw current.error;
    }

    return {
      async json() {
        return current.body;
      },
    };
  };
}

function restoreFetch() {
  global.fetch = originalFetch;
}

beforeEach(() => {
  clearWeatherCache();
  restoreFetch();
  Date.now = originalDateNow;
});

afterEach(() => {
  clearWeatherCache();
  restoreFetch();
  Date.now = originalDateNow;
});

async function callApp(url, method = "GET") {
  let statusCode;
  let headers;
  let payload = "";

  const req = {
    method,
    url,
    headers: { host: "127.0.0.1:3000" },
  };

  const res = {
    writeHead(code, head) {
      statusCode = code;
      headers = head;
    },
    end(body) {
      payload = body;
    },
  };

  await app(req, res);

  return {
    statusCode,
    headers,
    body: payload ? JSON.parse(payload) : null,
  };
}

test("getWeatherByCity retorna cidade, país e temperatura", async () => {
  try {
    mockFetch([
      {
        body: {
          results: [
            {
              latitude: -8.05,
              longitude: -34.9,
              name: "Recife",
              country: "Brazil",
            },
          ],
        },
      },
      {
        body: {
          current_weather: {
            temperature: 29.1,
          },
        },
      },
    ]);

    const result = await getWeatherByCity("Recife");

    assert.deepEqual(result, {
      city: "Recife",
      country: "Brazil",
      temperature: 29.1,
    });
  } finally {
    restoreFetch();
  }
});

test("getWeatherByCity lança erro quando cidade não é encontrada", async () => {
  try {
    mockFetch([
      {
        body: {
          results: [],
        },
      },
    ]);

    await assert.rejects(
      async () => getWeatherByCity("Reciasq"),
      (error) => error.message === "Cidade não encontrada",
    );
  } finally {
    restoreFetch();
  }
});

test("getWeatherByCity usa cache por 30 minutos para a mesma cidade", async () => {
  try {
    mockFetch([
      {
        body: {
          results: [
            {
              latitude: -8.05,
              longitude: -34.9,
              name: "Recife",
              country: "Brazil",
            },
          ],
        },
      },
      {
        body: {
          current_weather: {
            temperature: 31.2,
          },
        },
      },
    ]);

    const first = await getWeatherByCity("Recife");
    const second = await getWeatherByCity("Recife");

    assert.deepEqual(first, second);
  } finally {
    restoreFetch();
  }
});

test("getWeatherByCity busca novamente na API quando cache expira em 30 minutos", async () => {
  const baseTime = 1_000_000;
  let now = baseTime;
  Date.now = () => now;

  try {
    mockFetch([
      {
        body: {
          results: [
            {
              latitude: -8.05,
              longitude: -34.9,
              name: "Recife",
              country: "Brazil",
            },
          ],
        },
      },
      {
        body: {
          current_weather: {
            temperature: 31.2,
          },
        },
      },
      {
        body: {
          results: [
            {
              latitude: -8.05,
              longitude: -34.9,
              name: "Recife",
              country: "Brazil",
            },
          ],
        },
      },
      {
        body: {
          current_weather: {
            temperature: 25.4,
          },
        },
      },
    ]);

    const first = await getWeatherByCity("Recife");

    now += 30 * 60 * 1000 - 1;
    const stillCached = await getWeatherByCity("Recife");

    now += 1;
    const afterExpiration = await getWeatherByCity("Recife");

    assert.deepEqual(stillCached, first);
    assert.equal(afterExpiration.temperature, 25.4);
  } finally {
    restoreFetch();
    Date.now = originalDateNow;
  }
});

test("getWeatherByCities retorna lista com sucesso e erro por cidade", async () => {
  try {
    mockFetch([
      {
        body: {
          results: [
            {
              latitude: -8.05,
              longitude: -34.9,
              name: "Recife",
              country: "Brazil",
            },
          ],
        },
      },
      {
        body: {
          current_weather: {
            temperature: 31.2,
          },
        },
      },
      {
        body: {
          results: [],
        },
      },
    ]);

    const result = await getWeatherByCities(["Recife", "Reciasq"]);

    assert.deepEqual(result, [
      {
        city: "Recife",
        country: "Brazil",
        temperature: 31.2,
      },
      {
        city: "Reciasq",
        error: "Cidade não encontrada",
      },
    ]);
  } finally {
    restoreFetch();
  }
});

test("GET /weather sem parâmetros retorna 400", async () => {
  const result = await callApp("/weather");

  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.body, { error: "Query param 'city' ou 'cities' é obrigatório" });
  assert.equal(result.headers["Content-Type"], "application/json; charset=utf-8");
});

test("GET /weather retorna 200 com dados para uma cidade", async () => {
  try {
    mockFetch([
      {
        body: {
          results: [
            {
              latitude: -8.05,
              longitude: -34.9,
              name: "Recife",
              country: "Brazil",
            },
          ],
        },
      },
      {
        body: {
          current_weather: {
            temperature: 30.4,
          },
        },
      },
    ]);

    const result = await callApp("/weather?city=Recife");

    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body, {
      city: "Recife",
      country: "Brazil",
      temperature: 30.4,
    });
  } finally {
    restoreFetch();
  }
});

test("GET /weather com cidade inválida retorna 404", async () => {
  try {
    mockFetch([
      {
        body: {
          results: [],
        },
      },
    ]);

    const result = await callApp("/weather?city=Reciasq");

    assert.equal(result.statusCode, 404);
    assert.deepEqual(result.body, { error: "Cidade não encontrada" });
  } finally {
    restoreFetch();
  }
});

test("GET /weather com cities retorna lista de climas", async () => {
  try {
    mockFetch([
      {
        body: {
          results: [
            {
              latitude: -8.05,
              longitude: -34.9,
              name: "Recife",
              country: "Brazil",
            },
          ],
        },
      },
      {
        body: {
          current_weather: {
            temperature: 30.4,
          },
        },
      },
      {
        body: {
          results: [
            {
              latitude: -5.79,
              longitude: -35.21,
              name: "Natal",
              country: "Brazil",
            },
          ],
        },
      },
      {
        body: {
          current_weather: {
            temperature: 28.9,
          },
        },
      },
    ]);

    const result = await callApp("/weather?cities=Recife,Natal");

    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body, {
      results: [
        {
          city: "Recife",
          country: "Brazil",
          temperature: 30.4,
        },
        {
          city: "Natal",
          country: "Brazil",
          temperature: 28.9,
        },
      ],
    });
  } finally {
    restoreFetch();
  }
});

test("GET /weather com cities inválido retorna erro por item e status 200", async () => {
  try {
    mockFetch([
      {
        body: {
          results: [
            {
              latitude: -8.05,
              longitude: -34.9,
              name: "Recife",
              country: "Brazil",
            },
          ],
        },
      },
      {
        body: {
          current_weather: {
            temperature: 30.4,
          },
        },
      },
      {
        body: {
          results: [],
        },
      },
    ]);

    const result = await callApp("/weather?cities=Recife,Reciasq");

    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body, {
      results: [
        {
          city: "Recife",
          country: "Brazil",
          temperature: 30.4,
        },
        {
          city: "Reciasq",
          error: "Cidade não encontrada",
        },
      ],
    });
  } finally {
    restoreFetch();
  }
});

test("GET /weather com cities vazio retorna 400", async () => {
  const result = await callApp("/weather?cities= , , ");

  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.body, {
    error: "Query param 'cities' precisa ter ao menos uma cidade válida",
  });
});

test("POST /weather retorna 405", async () => {
  const result = await callApp("/weather?city=Recife", "POST");

  assert.equal(result.statusCode, 405);
  assert.deepEqual(result.body, { error: "Método não permitido" });
});

test("rota inexistente retorna 404", async () => {
  const result = await callApp("/nao-existe");

  assert.equal(result.statusCode, 404);
  assert.deepEqual(result.body, { error: "Rota não encontrada" });
});
