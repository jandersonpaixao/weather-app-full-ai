# Weather App

## Visão Geral
API simples de clima feita com Node.js que recebe uma ou várias cidades, converte para coordenadas via Open-Meteo Geocoding e retorna a temperatura atual.

Fluxo:
1. Recebe `city` (uma cidade) ou `cities` (várias cidades) pela rota HTTP.
2. Busca latitude/longitude na API de geocodificação.
3. Busca o clima atual com essas coordenadas.
4. Retorna um JSON enxuto para o cliente.

## Funcionalidades
- Rota única com dois modos:
  - `GET /weather?city=<nome-da-cidade>`
  - `GET /weather?cities=<cidade1,cidade2,cidade3>`
- Retorno para uma cidade:
  - `city`
  - `country`
  - `temperature`
- Retorno para várias cidades:
  - `results` (array com sucesso/erro por cidade)
- Cache em memória por cidade com TTL de 30 minutos
  - dentro de 30 minutos retorna do cache
  - após 30 minutos faz nova consulta na API externa
- Tratamento básico de erros HTTP:
  - `400` quando `city` e `cities` não são informados
  - `404` quando cidade não é encontrada
  - `405` para método não permitido na rota
  - `404` para rota inexistente
- Testes automatizados com `node:test`

## Instalação
### Pré-requisitos
- Node.js 18+ (necessário por causa do `fetch` nativo)
- npm

### Passos
```bash
git clone <url-do-seu-repositorio>
cd weather-app
npm install
cp src/config/.env.example src/config/.env
```

## Guia de Uso
### Executar em desenvolvimento
```bash
npm run dev
```

### Executar em modo normal
```bash
npm start
```

Servidor padrão:
- `http://127.0.0.1:3000`

Você pode configurar:
- `PORT` (padrão: `3000`)
- `HOST` (padrão: `127.0.0.1`)

Arquivo `src/config/.env`:
```bash
HOST=127.0.0.1
PORT=3000
```

Exemplo sobrescrevendo via terminal:
```bash
HOST=127.0.0.1 PORT=4000 npm start
```

### Chamar a API
Uma cidade:
```bash
curl "http://127.0.0.1:3000/weather?city=Recife"
```

Várias cidades:
```bash
curl "http://127.0.0.1:3000/weather?cities=Recife,Natal,Fortaleza"
```

## Exemplo de Resultado
### Sucesso (`200`)
```json
{
  "city": "Recife",
  "country": "Brazil",
  "temperature": 31.2
}
```

### Sucesso com várias cidades (`200`)
```json
{
  "results": [
    {
      "city": "Recife",
      "country": "Brazil",
      "temperature": 30.4
    },
    {
      "city": "Reciasq",
      "error": "Cidade não encontrada"
    }
  ]
}
```

### Erro cidade não encontrada (`404`)
```json
{
  "error": "Cidade não encontrada"
}
```

### Erro de validação (`400`)
```json
{
  "error": "Query param 'city' ou 'cities' é obrigatório"
}
```

## Testes
Rodar suíte de testes:
```bash
npm test
```

Arquivo de testes:
- `test/weather.test.js`

## Melhorias Futuras
- Melhorar classificação de erros para diferenciar:
  - cidade inválida (`404`)
  - falha externa/rede (`502` ou `503`)
  - erro interno (`500`)
- Validar respostas da API externa com mais rigor
- Evoluir cache em memória para Redis (compartilhado entre instâncias)
- Incluir testes de integração com servidor HTTP real
- Adicionar documentação OpenAPI/Swagger
- Adicionar rate limiting e observabilidade (logs estruturados)
