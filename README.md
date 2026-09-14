# ping tool

API simples para realizar pings em hosts definidos em `settings.json`.

Versão Node.js (implementada em `src/index.js`)

Instalação:

```bash
npm install
```

Executar:

```bash
npm start
```

Modo desenvolvimento (recarregar automaticamente):

```bash
npm run dev
```

Exemplo `settings.json` (na raiz do projeto):

```json
[
	{"host": "8.8.8.8", "timeout": 3000, "delay": 5},
	{"host": "example.com", "timeout": 3000, "delay": 10}
]
```

Endpoints:

- `GET /` — retorna um array com objetos `{ "host": "...", "ping": <ms|null>, "last_checked": "<ISO timestamp>" }`.
- `POST /ping` — força um ping imediato; corpo JSON: `{ "host": "example.com" }`.

Observações:

- A implementação Node.js usa o pacote `ping` (invoca o utilitário `ping` do sistema).
- Em alguns sistemas, enviar pings pode precisar de permissões elevadas.
