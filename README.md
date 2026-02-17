# Starsoft Backend Challenge - Documentacao da Solucao

## Sumario
- [Visao Geral](#visao-geral)
- [Tecnologias Escolhidas](#tecnologias-escolhidas)
- [Arquitetura e Fluxos](#arquitetura-e-fluxos)
- [Como Executar](#como-executar)
- [Pre-requisitos](#pre-requisitos)
- [Subir com Docker](#subir-com-docker)
- [Execucao local sem Docker](#execucao-local-sem-docker)
- [Como Popular Dados Iniciais](#como-popular-dados-iniciais)
- [Estrategias Implementadas](#estrategias-implementadas)
- [Endpoints da API](#endpoints-da-api)
- [Decisoes Tecnicas](#decisoes-tecnicas)
- [Testes](#testes)
- [Gerais](#gerais)
- [E2E de 100 Usuarios](#e2e-de-100-usuarios)
- [Exemplo de Fluxo para Testar](#exemplo-de-fluxo-para-testar)
- [Limitacoes Conhecidas](#limitacoes-conhecidas)
- [Melhorias Futuras](#melhorias-futuras)

## Visao Geral
Este projeto implementa um sistema de venda de ingressos para uma rede de cinemas, com foco em alta concorrencia e consistencia. A solucao garante que um assento nao seja vendido duas vezes, suporta reservas com expiracao de 30 segundos, confirma pagamentos, publica eventos em mensageria e disponibiliza consultas de disponibilidade e historico de compras.

## Tecnologias Escolhidas
- Node.js 20 + NestJS 11 para API REST e modularidade.
- PostgreSQL 15 como banco relacional, com transacoes e constraints para controle de concorrencia.
- Redis 7 como cache de disponibilidade de assentos com TTL curto.
- RabbitMQ 3 (management) para eventos e fila de expiracao com dead-letter.
- TypeORM para mapeamento de entidades e migrations.
- Swagger/OpenAPI em `/api-docs`.

## Arquitetura e Fluxos
Componentes principais:
- API NestJS com modulos de `sessions`, `seats`, `reservations`, `payments`, `users` e `events`.
- PostgreSQL com tabelas de sessoes, assentos, reservas, vendas, locks e audit log de eventos.
- Redis para cache de status de assentos.
- RabbitMQ para eventos e para o mecanismo de expiracao atrasada.

Fluxo de reserva:
1. Cliente chama `POST /api/reservations` com `sessionId`, `userId` e `seatIds`.
2. A API valida dados, verifica status (vendido/reservado) e cria a reserva em transacao.
3. Para cada assento, um lock e gravado em `seat_locks` com constraint unica para garantir exclusividade.
4. Evento `reservation.created` e publicado.
5. Um consumidor agenda a expiracao usando uma fila delay com TTL e dead-letter para `reservation.expired`.

Fluxo de pagamento:
1. Cliente chama `POST /api/payments/confirm` com `reservationId`.
2. O sistema bloqueia a linha da reserva (lock pessimista) e valida expiracao.
3. Cria venda e associa assentos em transacao.
4. Atualiza a reserva para `CONFIRMED`.
5. Publica `payment.confirmed` e atualiza cache de assentos para `SOLD`.

Fluxo de expiracao:
1. Mensagem de expiracao chega via `reservation.expired`.
2. Reserva e marcada como `EXPIRED`.
3. Locks sao liberados (`released_at`).
4. Cache e atualizado para `AVAILABLE` e evento `seat.released` e publicado.

## Como Executar
### Pre-requisitos
- Docker e Docker Compose.
- Opcional para execucao local: Node.js 20+ e npm.

### Subir com Docker
1. `cp .env.example .env`
2. `docker compose up --build`
3. API em `http://localhost:3000/api`
4. Swagger em `http://localhost:3000/api-docs`

As migrations sao aplicadas automaticamente no startup (`migrationsRun: true`).

### Execucao local sem Docker
1. Suba PostgreSQL, Redis e RabbitMQ localmente.
2. Configure `.env` com as conexoes locais.
3. `npm ci`
4. `npm run start:dev`

### Como Popular Dados Iniciais
Crie usuarios e sessoes via API.

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana Silva","email":"ana@example.com"}'

curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "movieTitle":"Filme X",
    "startsAt":"2026-02-20T19:00:00.000Z",
    "room":"Sala 1",
    "price":25.0,
    "seatsCount":16
  }'
```

## Estrategias Implementadas
- Race condition: tabela `seat_locks` com indice unico parcial (`released_at IS NULL`) impede dois locks ativos no mesmo assento.
- Coordenacao entre instancias: constraints do PostgreSQL garantem exclusividade global; RabbitMQ propaga eventos entre componentes.
- Deadlocks: `seatIds` sao ordenados antes de inserir locks, mantendo ordem consistente entre transacoes concorrentes.
- Idempotencia: `Idempotency-Key` por usuario com indice unico evita duplicidade em reenvios.
- Expiracao confiavel: fila delay com TTL + dead-letter para `reservation.expired`, processada por consumidor dedicado.

## Endpoints da API
Base: `/api`

| Metodo | Endpoint | Descricao |
| --- | --- | --- |
| POST | `/sessions` | Cria sessao e assentos iniciais. |
| GET | `/sessions` | Lista sessoes (paginado). |
| GET | `/sessions/:id` | Detalhe da sessao. |
| GET | `/sessions/:id/availability` | Disponibilidade de assentos. |
| POST | `/seats` | Adiciona assento manualmente. |
| GET | `/seats` | Lista assentos (paginado). |
| POST | `/reservations` | Reserva assentos (header `Idempotency-Key` opcional). |
| GET | `/reservations` | Lista reservas (paginado). |
| GET | `/reservations/:id` | Detalhe da reserva. |
| POST | `/payments/confirm` | Confirma pagamento da reserva. |
| GET | `/payments/users/:id/sales` | Historico de compras do usuario. |
| POST | `/users` | Cria usuario. |
| GET | `/users` | Lista usuarios (paginado). |

Exemplo de reserva com idempotencia:

```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: idem-123" \
  -d '{
    "sessionId":"<session-id>",
    "userId":"<user-id>",
    "seatIds":["<seat-id-1>","<seat-id-2>"]
  }'
```

Exemplo de confirmacao de pagamento:

```bash
curl -X POST http://localhost:3000/api/payments/confirm \
  -H "Content-Type: application/json" \
  -d '{"reservationId":"<reservation-id>"}'
```

## Decisoes Tecnicas
- `seat_locks` garante exclusividade de reserva com constraint e evita dupla venda.
- `pessimistic_write` no pagamento elimina dupla confirmacao.
- Fila delay com TTL e dead-letter implementa expiracao sem cron dedicado.
- Redis reduz carga de leitura para disponibilidade de assentos com TTL curto.
- Event log (`event_logs`) preserva auditoria de eventos publicados.

## Testes
### Gerais
- Unitarios basicos de controllers em `src/modules/**/controllers/*.spec.ts`.
- E2E completo em `test/requirements.e2e-spec.ts`.

Comandos:
- `npm run test` (unitarios)
- `npm run test:e2e` (e2e)
- `npm run test:cov` (cobertura)

### E2E de 100 Usuarios
O cenario de stress cria 100 usuarios concorrendo por 20 pares de assentos (40 assentos no total). Cada usuario tenta reservar um par; o esperado e:
- 20 reservas com sucesso (`201`).
- 80 conflitos (`409`).
- 40 assentos reservados, todos unicos.

O teste garante que a exclusividade de assentos funciona mesmo sob alta concorrencia.

Requisitos para o e2e:
- API rodando em `http://localhost:3000`.
- RabbitMQ management disponivel em `http://localhost:15672`.
- PostgreSQL acessivel em `localhost:5432`.

Variaveis opcionais usadas no e2e:
- `E2E_BASE_URL`, `E2E_DB_HOST`, `E2E_DB_PORT`, `E2E_DB_USER`, `E2E_DB_PASSWORD`, `E2E_DB_NAME`
- `RABBITMQ_MANAGEMENT_URL`, `RABBITMQ_MANAGEMENT_USER`, `RABBITMQ_MANAGEMENT_PASSWORD`

## Exemplo de Fluxo para Testar
1. Criar sessao:

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "movieTitle":"Filme X",
    "startsAt":"2026-02-20T19:00:00.000Z",
    "room":"Sala 1",
    "price":25.0,
    "seatsCount":16
  }'
```

2. Buscar disponibilidade:

```bash
curl http://localhost:3000/api/sessions/<session-id>/availability
```

3. Criar usuario:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Usuario A","email":"user.a@example.com"}'
```

4. Reservar assentos concorrentes (simulacao com 2 usuarios em paralelo).
5. Confirmar pagamento:

```bash
curl -X POST http://localhost:3000/api/payments/confirm \
  -H "Content-Type: application/json" \
  -d '{"reservationId":"<reservation-id>"}'
```

6. Verificar historico:

```bash
curl "http://localhost:3000/api/payments/users/<user-id>/sales?page=1&limit=10"
```

## Limitacoes Conhecidas
- Sem autenticacao/authorization.
- Sem integracao real de gateway de pagamento.
- Logging padrao do NestJS, sem formato estruturado customizado.
- Cache pode ficar desatualizado por segundos (TTL curto).
- Nao ha rate limiting nativo.

## Melhorias Futuras
- Implementar outbox e retry/backoff para eventos.
- Adicionar DLQ dedicada para falhas de consumo.
- Observabilidade com OpenTelemetry e metricas.
- Rate limiting por IP/usuario.
- Autenticacao e permissao por perfil de usuario.
