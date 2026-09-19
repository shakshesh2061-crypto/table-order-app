# TableOrder — QR Restaurant Ordering App

A mobile-first restaurant ordering app with three role-gated experiences — **Customer**, **Staff**, and **Admin** — built as a single responsive web app. Customers scan a table's QR code, browse the menu, customize and place orders, and track status in real time. Staff manage a live order queue. Admins manage the menu, staff accounts, tables/QR codes, and view sales analytics.

**Live deployment**: [https://d2k3v3lord2yqa.cloudfront.net](https://d2k3v3lord2yqa.cloudfront.net) — running on real AWS infrastructure (Lambda, API Gateway, RDS Postgres, DynamoDB, S3, CloudFront), fully within the AWS free tier. Demo accounts below.

## Stack (deployed)

- **Frontend**: React + TypeScript + Vite, Tailwind CSS, `react-router-dom`, `@tanstack/react-query` — served from **S3 + CloudFront** (Origin Access Control, bucket never publicly reachable directly).
- **Backend**: Node.js + Express + TypeScript, wrapped for Lambda via `serverless-http`, behind an **API Gateway HTTP API**. JWT auth (`jsonwebtoken` + `bcryptjs`), Zod request validation, `multer` + S3 for uploads.
- **Database**: **RDS Postgres** (`db.t4g.micro`, free tier) via Knex migrations/queries — schema is relational (see below), chosen because orders/order-items/tables involve joins, transactions, and aggregate analytics queries that don't fit DynamoDB's single-table model well.
- **Real-time**: **API Gateway WebSocket API** + **DynamoDB** (connection tracking + an event queue with Streams triggering a broadcaster Lambda) — see "Real-time architecture" below.
- **Infrastructure as code**: AWS CDK v2 (TypeScript), `infra/` workspace — six independently-deployable stacks.

## Architecture

```
Browser (CloudFront/S3)
   │
   ├─ HTTPS ──▶ API Gateway HTTP API ──▶ Lambda (Express via serverless-http) ──▶ RDS Postgres (VPC, private)
   │                                                    │
   │                                                    └─▶ S3 (menu photos, public-read on menu-photos/* only)
   │
   └─ WSS ────▶ API Gateway WebSocket API ──▶ $connect/$disconnect Lambdas ──▶ DynamoDB (ws-connections)
                                                                                       ▲
                                              DynamoDB Streams ──▶ broadcaster Lambda ─┘
                                                     ▲
                              REST Lambda writes ────┘ (ws-events table, on order/availability changes)
```

Every backend layer was deliberately built behind an interface (`AuthProvider`, `StorageProvider`, `EventPublisher`, the `repositories/` layer) specifically so it could be pointed at a real AWS service later without touching route or business logic — that's what made the AWS migration a config/wiring change rather than a rewrite.

| Local-first piece | Interface / seam | AWS target (deployed) |
|---|---|---|
| `backend/src/auth/localJwtAuthProvider.ts` | `AuthProvider` | **Not wired live** — see "Cognito" below. `cognitoAuthProvider.ts` exists and is fully implemented/verified. |
| `backend/src/repositories/*.ts` (Knex) | Repository methods | **RDS Postgres** — `knexfile.ts` switches client via `DB_CLIENT=pg` |
| `backend/src/storage/localDiskStorageProvider.ts` | `StorageProvider` | **S3** — `s3StorageProvider.ts`, `STORAGE_PROVIDER=s3` |
| `backend/src/realtime/broadcaster.ts` (in-memory) | `EventPublisher` | **DynamoDB** — `dynamoEventPublisher.ts`, `REALTIME_PUBLISHER=dynamodb` |
| Express route handlers | Thin `(req, res) => {}` functions | **Lambda** behind API Gateway, via `serverless-http` (`backend/src/lambda.ts`) |
| Vite build output | Static assets | **S3 + CloudFront** |

Local dev (`npm run dev`) still runs the original all-local path (SQLite, local disk, in-memory WS) — the same codebase serves both, switched entirely by environment variables.

## Cognito: deployed, verified, not live

Amazon Cognito (user pool, `customer`/`staff`/`admin` groups, app client) is fully provisioned and was verified end-to-end via CLI — user creation, login, and group-claim propagation all confirmed working. It is **not** wired into the live deployment, for a concrete cost reason: the REST API Lambda must stay VPC-attached for private RDS access, and a VPC-attached Lambda has no internet egress unless you pay for a NAT Gateway (~$32/mo) or a VPC interface endpoint (~$7.30/mo) — neither free. Rather than spend either, the deployed Lambda uses `AUTH_PROVIDER=local` (the same RDS-backed JWT approach as local dev, which only needs same-VPC RDS access, not internet). This was a deliberate, informed tradeoff, not an oversight — `cognitoAuthProvider.ts` is a complete, working `AuthProvider` implementation ready to swap in the moment that cost is worth paying (e.g. moving the REST Lambda out of the VPC via RDS Data API/Aurora Serverless, or accepting the endpoint cost).

## Real-time architecture (the hard part)

The in-memory `Set<Subscriber>` broadcaster that works for a single long-running local process cannot survive stateless Lambda invocations, so this was redesigned rather than lifted-and-shifted:

- **`table-order-ws-connections`** (DynamoDB, provisioned capacity — free tier): maps `connectionId` → role/customerId/tableSessionId, written by `$connect`, deleted by `$disconnect`.
- **`table-order-ws-events`** (DynamoDB, Streams enabled, TTL auto-cleanup): the REST Lambda writes an event row here instead of pushing to sockets directly (it has no open connections of its own).
- **Broadcaster Lambda**: triggered by the Streams, deliberately **outside the VPC** (no RDS dependency, so no internet-access problem) — scans connections, matches (staff/admin get everything, customers/guests get matches on `customerId`/`tableSessionId`), calls `postToConnection`, prunes stale connections on `GoneException`.
- **`$connect`** verifies a JWT (`?token=`) or a guest table-session token (`?sessionToken=`) exactly like the local `ws` server did — it's VPC-attached for the guest-session RDS lookup, but never calls `postToConnection`, so it never needs internet either.

Verified with real WebSocket clients (not just deployed): staff-role broadcast, guest-session-scoped delivery, and stale-connection cleanup on disconnect were all independently confirmed against the live stack.

## Project structure

```
table-order-app/
├── backend/     Express API — src/{auth,storage,realtime,repositories,routes,services,schemas,db}/
├── frontend/    React SPA, role-gated routes — src/{auth,api,realtime,pages/{customer,staff,admin,auth},components}/
├── shared/      Role/OrderStatus enums shared by both, to prevent drift
└── infra/       AWS CDK v2 (TypeScript) — bin/infra.ts, lib/{network,data,auth,api,realtime,web}-stack.ts
```

## Local setup

Requires Node.js (v20+; this was built and tested on v26).

```bash
npm install                 # installs all workspaces (backend, frontend, shared, infra)
npm run migrate             # creates backend/data/dev.sqlite3 and runs schema migrations
npm run seed                # loads demo data: 3 users, 4 categories, 7 menu items, 3 tables
npm run dev                 # runs backend (:4000) and frontend (:5173) concurrently
```

Open **http://localhost:5173**.

### Demo accounts (password `password123` for all — seeded both locally and on the live deployment's RDS)

| Role | Email |
|---|---|
| Admin | admin@demo.com |
| Staff | staff@demo.com |
| Customer | customer@demo.com |

Customers can also browse/order as a **guest** with no account — scan a table's QR (or open `/order?table=<qr_token>` — get a table's token from Admin → Tables) and order directly; guest orders are scoped to that table session.

## Deploying / redeploying

```bash
cd infra
npx cdk deploy TableOrderNetworkStack   # VPC, 0 NAT gateways, free S3/DynamoDB gateway endpoints
npx cdk deploy TableOrderDataStack      # RDS Postgres, S3 uploads bucket, DynamoDB tables
npx cdk deploy TableOrderAuthStack      # Cognito (provisioned, not wired live — see above)
npx cdk deploy TableOrderApiStack       # REST Lambda + HTTP API
npx cdk deploy TableOrderRealtimeStack  # WebSocket API + 4 Lambdas
npx cdk deploy TableOrderWebStack       # S3 + CloudFront (run `npx vite build` in frontend/ first)
```

Each stack is independently deployable/destroyable. RDS migrations run from a developer machine against a **temporarily** public-accessible instance (security group opened to your current IP only, then immediately closed) — see the deploy history for the exact `aws rds modify-db-instance` / `authorize-security-group-ingress` / `revoke-security-group-ingress` sequence; there's no bastion or NAT in this design.

## Design decisions worth knowing for a walkthrough

1. **Real-time**: WebSockets as the primary channel for order-status updates, not polling — see "Real-time architecture" above for the full DynamoDB-backed redesign. Polling is kept as a low-frequency fallback (`refetchInterval` in React Query) so a dropped socket self-heals within seconds.
2. **QR-to-table linking**: each physical table gets one static, permanent QR code (`tables.qr_token`). Scanning it opens `/order?table=<token>`, which creates or reuses a `table_sessions` row — a separate, ephemeral "dining occasion" concept decoupled from the table's permanent identity. This lets guests order with no login while still scoping their order visibility to just that session.
3. **Order line-item snapshotting**: `order_items` stores `name_snapshot`/`price_cents_snapshot` rather than only a foreign key to `menu_items`. Menu prices and names change over time; historical orders and analytics must reflect what was actually charged at order time, not the current menu.
4. **RBAC enforcement**: every route declares `requireRole(...)` explicitly, even inside an already-prefixed router (e.g. `/admin/*`), rather than relying on prefix-based grouping alone.
5. **Lambda in a public subnet ≠ internet access**: a real correction made mid-build — EC2 auto-assigns a public IP in a public subnet; Lambda ENIs never do, regardless of subnet type. A VPC-attached Lambda needs a NAT gateway or a paid interface endpoint for any internet call, full stop. This directly drove the Cognito decision above and is worth knowing cold for an interview.
6. **Secrets never touch a template or runtime SSM call**: the RDS password and JWT secret live in SSM Parameter Store (SecureString, free) but CloudFormation doesn't actually support SSM-secure dynamic references inside Lambda environment variables (a real gap, confirmed via `cdk synth` validation) — so they're fetched once at `cdk deploy` time from the deploying machine's own AWS credentials and embedded directly, rather than either hardcoding them or having the Lambda fetch them itself at runtime (which would've needed the same paid internet path as Cognito).

## What's built

- Auth: register (customer self-serve), login, JWT, role-gated routing (`/customer`, `/staff`, `/admin`)
- Customer: menu browsing with categories/photos/add-ons, cart, QR-linked or guest ordering, live order tracking, order history + reorder
- Staff: live order queue grouped by status with one-tap status advance, out-of-stock toggle, active table overview
- Admin: menu CRUD + photo upload, category management, staff account management, table/QR management (generate printable QR per table), analytics (daily orders, revenue, popular items)
- Real-time order-status propagation over WebSockets, verified end-to-end against the live deployment
- Full AWS deployment: VPC, RDS Postgres, S3 (×2, different access policies), DynamoDB (×2), Lambda (×5), API Gateway (HTTP + WebSocket), CloudFront, Cognito (provisioned) — all via CDK, all within free tier

## Not yet built (explicit future work)

- Cognito wired into the live deployment (currently local JWT for the reasons above) — would need either accepting the VPC endpoint cost or moving the REST Lambda off a direct RDS connection (e.g. RDS Data API / Aurora Serverless) so it can drop out of the VPC entirely
- Automated test suite (manual + scripted smoke-testing was used throughout instead, including real browser automation against the live stack)
- Normalized add-on tables (currently JSON on `menu_items.addon_groups` — fine for MVP, would need normalizing for "most popular add-on" style analytics)
- CloudWatch log retention / IAM policy audit pass, custom domain (Route 53 + ACM) — noted as a deliberate stopping point, not forgotten
