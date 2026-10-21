# Architecture Overview

## PKSPL IPB — Coastal & Marine Ecosystem Economic Valuation System

### Aligned with Redesign v2

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```mermaid
flowchart TD
    subgraph Client["Client (Browser)"]
        SPA["React 18 SPA"]
        Echo["Laravel Echo Client"]
    end

    subgraph Docker["Docker Compose Environment"]
        subgraph WebTier["Web Tier"]
            Nginx["Nginx Reverse Proxy\n:8000"]
            Vite["Vite Dev Server\n:5173 (dev only)"]
        end

        subgraph AppTier["Application Tier"]
            PHP["PHP 8.3-FPM\nLaravel 13"]
            Reverb["Laravel Reverb\nWebSocket :8085"]
            Queue["Queue Worker\nDatabase Driver"]
        end

        subgraph DataTier["Data Tier"]
            PG["PostgreSQL 16\n+ PostGIS 3.4\n:5433"]
        end

        subgraph DevTools["Development Tools"]
            Mailpit["Mailpit\n:8025 / :1025"]
            Adminer["Adminer\n:8081"]
            Tunnel["Cloudflare Tunnel\n(optional)"]
        end
    end

    SPA -->|"HTTP /api/v1/*"| Nginx
    SPA -->|"HTTP / (SPA)"| Nginx
    Echo -->|"WS Protocol"| Reverb
    Nginx -->|"FastCGI"| PHP
    PHP -->|"SQL + PostGIS"| PG
    PHP -->|"Dispatch Jobs"| Queue
    Queue -->|"Process Jobs"| PG
    PHP -->|"Broadcast Events"| Reverb
    PHP -->|"Send Email"| Mailpit
    Tunnel -->|"Proxy"| Nginx
```

### 1.2 Request Flow

| Request Type | Flow |
|-------------|------|
| **API Request** | Browser → Nginx (:8000) → `/api/*` → PHP-FPM → Laravel Router → Controller → Response |
| **SPA Page** | Browser → Nginx (:8000) → `/` → Serve `index.html` → React hydration |
| **WebSocket** | Browser → Echo/Pusher → Reverb (:8085) → Laravel Broadcasting → Event dispatch |
| **Dev Mode** | Browser → Vite (:5173) → HMR + React components |
| **Email** | Laravel → SMTP → Mailpit (:1025) → View at :8025 |
| **Background Job** | Controller → Queue dispatch → Queue Worker → Process → DB update |

---

## 2. Docker Container Architecture

### 2.1 Container Topology

```mermaid
flowchart LR
    subgraph Network["Docker Network: pkspl-network"]
        app["app\nPHP 8.3-FPM\nLaravel 13"]
        nginx["nginx\nReverse Proxy\n:8000"]
        postgres["postgres\nPostgreSQL 16\n+ PostGIS 3.4\n:5433"]
        reverb["reverb\nLaravel Reverb\n:8085"]
        queue["queue\nQueue Worker"]
        mailpit["mailpit\n:8025 / :1025"]
        adminer["adminer\n:8081"]
        tunnel["tunnel\nCloudflare\n(optional)"]
    end

    nginx -->|"FastCGI :9000"| app
    app -->|"TCP :5432"| postgres
    queue -->|"TCP :5432"| postgres
    reverb -->|"TCP :5432"| postgres
    adminer -->|"TCP :5432"| postgres
    app -->|"SMTP :1025"| mailpit
    tunnel -->|"HTTP :8000"| nginx
```

### 2.2 Container Details

| Container | Base Image | Purpose | Ports | Depends On |
|-----------|-----------|---------|-------|------------|
| **app** | `php:8.3-fpm` | Laravel application server | Internal :9000 | postgres |
| **nginx** | `nginx:latest` | Reverse proxy, static files | :8000 → host | app |
| **postgres** | `postgis/postgis:16-3.4` | Database with spatial support | :5433 → host | — |
| **reverb** | (same as app) | WebSocket server | :8085 → host | postgres |
| **queue** | (same as app) | Background job processor | — | postgres |
| **mailpit** | `axllent/mailpit:latest` | Development email catcher | :8025, :1025 → host | — |
| **adminer** | `adminer:latest` | Database admin UI | :8081 → host | postgres |
| **tunnel** | `cloudflare/cloudflared` | Temporary public URL | — | nginx |

### 2.3 Volume Mounts

| Volume | Container | Mount Point | Purpose |
|--------|-----------|-------------|---------|
| `./src` | app, queue, reverb | `/var/www/html` | Laravel source code |
| `./docker/nginx` | nginx | `/etc/nginx/conf.d` | Nginx configuration |
| `./docker/postgres/initdb` | postgres | `/docker-entrypoint-initdb.d` | PostGIS initialization SQL |
| `pg_data` | postgres | `/var/lib/postgresql/data` | Persistent database storage |

---

## 3. Backend Architecture (Laravel 13)

### 3.1 Directory Structure

```
src/app/
├── Console/Commands/          # Artisan commands (ImportBoundaries, EncryptChat)
├── Events/                    # Broadcast events
│   ├── ChatMessageSent
│   ├── ChatMessageUpdated
│   ├── ChatMessageDeleted
│   ├── MessagesRead
│   ├── UserTyping
│   └── Review/               # Review module events
│       ├── CommentCreated
│       ├── CommentReplied
│       ├── DatasetSubmitted
│       ├── ReviewDecisionMade
│       ├── ReviewClosed
│       ├── ReviewReopened
│       ├── ReviewResolved
│       └── UserMentioned
├── Http/
│   ├── Controllers/Api/V1/   # REST API controllers (modular)
│   │   ├── Admin/             # AdminAnalytics, AdminReferenceData, AdminActivityLog
│   │   ├── Auth/              # Auth, Test
│   │   ├── Chat/              # ChatDirectory, ChatMessage, Conversation, NotificationPreference
│   │   ├── Geography/         # BoundaryLookup, Provinsi, KabupatenKota, Kecamatan, DesaKelurahan
│   │   ├── Project/           # Proyek, UnitAnalisis, TutupanLahan, ProjectReference, Dashboard, Statistics, Histori
│   │   ├── Reference/         # RefEcosystemType, RefValuationMethod, RefMarketPrice, RefCoefficient, RefLandCoverCatalog
│   │   ├── Review/            # Review, ReviewComment, CommentReply, CommentAttachment, Notification, ActivityLog, DatasetSubmission
│   │   ├── User/              # Profile, Role, User
│   │   └── Valuation/         # ServiceMethodAssignment, ValuationData, MethodAnalysis, MethodResult, Benefit, Cost
│   ├── Middleware/            # RoleMiddleware (RBAC)
│   ├── Requests/              # Form Request validation classes
│   └── Resources/             # API Resource transformers
├── Models/                    # ~40 Eloquent models
└── Policies/                  # Authorization policies
```

### 3.2 Model Layer — ~40 Eloquent Models

```mermaid
flowchart TD
    subgraph Core["Core Models"]
        User
        Role
        Proyek
    end

    subgraph Geo["Geography"]
        Provinsi
        KabupatenKota
        Kecamatan
        DesaKelurahan
        AdminBoundary["AdministrativeBoundary"]
    end

    subgraph Eco["Ecosystem & Land Cover"]
        UnitAnalisis
        TutupanLahan
    end

    subgraph Ref["Reference Data"]
        RefEcosystemType
        RefValuationMethod
        RefMarketPrice
        RefCoefficient
        RefLandCoverCatalog
    end

    subgraph Val["Valuation"]
        ServiceMethodAssignment
        ValuationRow
        MethodAnalysis
        MethodResult
        ValuationCustomColumn
        ProjectMarketPrice
        ProjectCoefficient
        Benefit
        Cost
    end

    subgraph Chat["Communication"]
        Conversation
        ConversationParticipant
        ChatMessage
        MessageAttachment
    end

    subgraph Rev["Review"]
        Review
        ReviewComment
        CommentMention
        CommentAttachment
    end

    Role -->|"1:N"| User
    User -->|"1:N"| Proyek
    Proyek -->|"1:N"| UnitAnalisis
    UnitAnalisis -->|"1:N"| TutupanLahan
    TutupanLahan -->|"1:N"| ServiceMethodAssignment
    ServiceMethodAssignment -->|"1:N"| ValuationRow
    ServiceMethodAssignment -->|"0:1"| MethodAnalysis
    ServiceMethodAssignment -->|"0:1"| MethodResult
    Proyek -->|"1:N"| Review
    Conversation -->|"1:N"| ChatMessage
```

### 3.3 Event Broadcasting System

| Event | Channel Type | Trigger |
|-------|-------------|---------|
| `ChatMessageSent` | Private | New chat message sent |
| `ChatMessageUpdated` | Private | Message edited |
| `ChatMessageDeleted` | Private | Message deleted |
| `MessagesRead` | Private | Conversation marked as read |
| `UserTyping` | Presence | User starts/stops typing |
| `CommentCreated` | Private | New review comment |
| `CommentReplied` | Private | Reply to comment |
| `DatasetSubmitted` | Private | Project submitted for review |
| `ReviewDecisionMade` | Private | Analyst makes decision |
| `UserMentioned` | Private | User mentioned in comment |

---

## 4. Frontend Architecture (React 18)

### 4.1 Application Structure

```mermaid
flowchart TD
    main["main.jsx"] --> App["App.jsx\nBrowserRouter"]

    App --> AuthProvider["AuthProvider\n(Global Auth State)"]
    AuthProvider --> ProjectProvider["ProjectProvider\n(Active Project State)"]
    ProjectProvider --> SpreadsheetProvider["SpreadsheetProvider\n(Valuation Grid State)"]
    SpreadsheetProvider --> ChatProvider["ChatProvider\n(Chat State + WebSocket)"]
    ChatProvider --> Routes["React Router Routes"]

    Routes --> Public["Public Routes\n/, /login, /register"]
    Routes --> Peneliti["Peneliti Routes\n/peneliti/*"]
    Routes --> Admin["Admin Routes\n/admin/*"]

    Peneliti --> PenelitiShell["PenelitiShell (AppShell)\nTopbar + Sidebar + Outlet"]
    Admin --> AdminShell["AdminShell\nTopbar + Sidebar + Outlet"]
```

### 4.2 Module Organization

```
src/
├── main.jsx                    # React entry point
├── App.jsx                     # Router + Context provider chain
├── contexts/
│   └── AuthContext.jsx         # Global auth state (user, token, login/logout)
├── pages/                      # Auth pages
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── ForgotPasswordPage.jsx
│   ├── ResetPasswordPage.jsx
│   ├── GoogleCallbackPage.jsx
│   └── EmailVerifyCallbackPage.jsx
├── components/                 # Shared components
│   ├── Navbar.jsx              # Public landing navbar
│   ├── Footer.jsx
│   ├── HeroSection.jsx
│   ├── AboutSection.jsx
│   ├── MapSection.jsx          # Public project distribution map
│   ├── StatsSection.jsx
│   ├── WorkflowSection.jsx
│   ├── ProtectedRoute.jsx      # RBAC route guard
│   ├── chat/                   # Global chat notification
│   ├── dashboard/              # Public dashboard components
│   ├── loading/                # Loading states (Skeleton, Spinner, etc.)
│   ├── map/                    # Shared map components
│   └── profile/                # Profile components
├── peneliti/                   # Researcher module
│   ├── components/
│   │   ├── layout/             # AppShell, Sidebar, Topbar, AutosaveIndicator
│   │   ├── map/                # MapView, LayerControl, Legend, PolygonDrawer
│   │   ├── spreadsheet/        # ExcelGrid, FormattedNumberInput, CustomColumnModal
│   │   ├── chat/               # ChatWindowPanel, ConversationListPanel
│   │   └── notifications/      # EmailPreview, UnifiedNotificationToast
│   ├── pages/                  # 8 workflow pages + messages
│   └── context/                # ProjectContext, SpreadsheetContext, ChatContext
├── admin/                      # Admin module
│   ├── layouts/                # AdminShell
│   ├── components/             # AdminSidebar, AdminTopbar, chat components
│   ├── pages/                  # Admin pages (dashboard, reference data, users, etc.)
│   ├── services/               # Admin API services
│   └── utils/                  # Formatters
├── services/                   # API client layer (Axios)
├── lib/                        # Library init (Echo, Reverb, Axios)
└── i18n/                       # Localization dictionaries (ID/EN)
```

### 4.3 Context Provider Chain

| Context | Scope | State Managed |
|---------|-------|--------------|
| `AuthContext` | Global | Current user, auth token, login/logout/register, role |
| `ProjectContext` | Researcher module | Active project, project list, CRUD operations |
| `SpreadsheetContext` | Researcher module | Valuation rows, custom columns, autosave state |
| `ChatContext` | Global | Conversations, messages, unread counts, WebSocket subscriptions |

---

## 5. API Architecture

### 5.1 Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Style** | RESTful API v1 |
| **Base URL** | `/api/v1/` |
| **Auth** | Bearer token (Laravel Sanctum) |
| **Format** | JSON request/response |
| **Naming** | Kebab-case plural nouns (`/service-method-assignments`, `/valuation-rows`) |
| **Response** | Laravel API Resources (JSON transformers) |
| **Validation** | Form Request classes for all inputs |
| **Versioning** | URL path versioning (`/v1/`) |

### 5.2 Route Module Organization

```mermaid
flowchart LR
    API["API Gateway\n/api/v1/"] --> Core["api.php\nAuth, Project, Reference\nGeography, Admin"]
    API --> Chat["api_chat.php\nConversations\nMessages\nPreferences"]
    API --> Review["api_review.php\nReviews, Comments\nNotifications\nActivity Logs"]
    API --> Valuation["api_valuation.php\nMethod Assignments\nValuation Data\nAnalyses, Results\nBenefits, Costs"]
```

### 5.3 Key Endpoint Groups

| Module | Endpoints | Auth Required | Role Restriction |
|--------|----------|:-------------:|:----------------:|
| Public Statistics | `GET /statistics`, `GET /public/projects/*` | ❌ | — |
| Auth | `POST /auth/login`, `POST /auth/register`, Google OAuth | ❌ | — |
| Profile | `GET /auth/me`, `POST /profile/*` | ✅ | Any |
| Admin Reference Data | `GET/POST/PUT/DELETE /admin/ref/*` | ✅ | Super Admin |
| Admin Users | `apiResource /users`, `/roles` | ✅ | Super Admin |
| Admin Analytics | `GET /admin/analytics/overview` | ✅ | Super Admin |
| Projects | `apiResource /proyek` | ✅ | Any authenticated |
| Reference Data | `GET /ref/ecosystem-types`, `/ref/valuation-methods`, `/ref/market-prices`, `/ref/coefficients`, `/ref/land-cover-catalog` | ✅ | Any authenticated |
| Valuation Data | Method assignments, valuation rows, method analyses, method results, project market prices, project coefficients | ✅ | Any authenticated |
| Calculations | `GET /proyek/{id}/economic-valuation` — aggregates `method_results` with `is_primary` filter | ✅ | Any authenticated |
| Reviews | CRUD reviews, comments, decisions | ✅ | Any authenticated |
| Chat | Conversations, messages, heartbeat | ✅ | Any authenticated |

---

## 6. Database Architecture

### 6.1 Schema Domain Map

```mermaid
flowchart TD
    subgraph Core["Core (3 tables)"]
        roles --> users --> proyek
    end

    subgraph Geo["Geography (5 tables)"]
        provinsi --> kabupaten_kota --> kecamatan --> desa_kelurahan
        admin_boundaries["administrative_boundaries (PostGIS)"]
    end

    subgraph Eco["Ecosystem & Land Cover (2 tables)"]
        proyek --> unit_analisis --> tutupan_lahan
    end

    subgraph Ref["Reference Data (5 tables)"]
        ref_ecosystem_types
        ref_valuation_methods
        ref_market_prices
        ref_coefficients
        ref_land_cover_catalog
    end

    subgraph Val["Valuation (9 tables)"]
        tutupan_lahan --> service_method_assignments
        ref_valuation_methods --> service_method_assignments
        service_method_assignments --> valuation_rows
        service_method_assignments --> method_analyses
        service_method_assignments --> method_results
        proyek --> project_prices["project_market_prices"]
        proyek --> project_coeffs["project_coefficients"]
        proyek --> benefits_costs["benefits + costs"]
    end

    subgraph Rev["Review (7 tables)"]
        proyek --> reviews
        proyek --> validasi_analyst
        reviews --> review_comments
    end

    subgraph ChatDomain["Chat (5 tables)"]
        proyek --> conversations
        conversations --> messages
    end

    subgraph Audit["Audit (2 tables)"]
        activity_logs
        histori
    end
```

### 6.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------| 
| **PostGIS extension** | Native spatial queries for administrative boundary lookup and polygon intersection |
| **JSON/JSONB columns** | Flexible storage for GeoJSON geometry, `input_schema` method definitions, `row_data` valuation data, and `calculation_detail` results |
| **Multi-method support** | `service_method_assignments` allows N methods per service per land cover with exactly one `is_primary` for TEV aggregation |
| **Method-agnostic data layer** | `valuation_rows` uses JSON `row_data` validated against `ref_valuation_methods.input_schema`, allowing new methods via configuration without code changes |
| **Copy-on-use immutability** | `project_market_prices` and `project_coefficients` are frozen copies of system references, protecting historical research data from admin catalog changes |
| **Composite unique constraints** | Prevent duplicate entries (`service_method_assignments` per land cover + service + method) |
| **Soft deletes on messages** | Preserve chat history while allowing message "deletion" |
| **Application-level encryption** | Chat messages encrypted with SafeEncryptedString for data-at-rest security |
| **Cascading deletes** | Valuation data cascades from `tutupan_lahan` → `service_method_assignments` → `valuation_rows` for data integrity |

---

## 7. Real-time Architecture

### 7.1 WebSocket Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Echo as Laravel Echo
    participant Reverb as Reverb Server
    participant Laravel
    participant DB as PostgreSQL

    Browser->>Echo: Initialize connection
    Echo->>Reverb: WebSocket handshake (Pusher protocol)
    Reverb-->>Echo: Connection established

    Note over Echo,Reverb: Subscribe to channels

    Echo->>Reverb: Subscribe private-conversation.{id}
    Echo->>Reverb: Subscribe presence-conversation.{id}
    Reverb-->>Echo: Subscription confirmed

    Note over Browser,DB: User sends a message

    Browser->>Laravel: POST /api/v1/conversations/{id}/messages
    Laravel->>DB: Store encrypted message
    Laravel->>Reverb: Broadcast ChatMessageSent event
    Reverb->>Echo: Push event to subscribers
    Echo->>Browser: Update UI with new message

    Note over Browser,Reverb: Typing indicator

    Browser->>Laravel: POST /api/v1/conversations/{id}/typing
    Laravel->>Reverb: Broadcast UserTyping event
    Reverb->>Echo: Push to other participants
    Echo->>Browser: Show typing indicator

    Note over Browser,Reverb: Presence heartbeat

    Browser->>Laravel: POST /api/v1/chat/heartbeat
    Laravel->>DB: Update last_online_at
```

### 7.2 Channel Types

| Channel | Pattern | Purpose |
|---------|---------|---------|
| Private | `private-conversation.{id}` | Message delivery, edits, deletes |
| Presence | `presence-conversation.{id}` | Online status, typing indicators |
| Private | `private-user.{id}` | Personal notifications, review updates |

---

## 8. Security Architecture

### 8.1 Authentication Flow

```mermaid
flowchart TD
    A["User"] --> B{"Auth Method"}

    B -->|"Email/Password"| C["POST /api/v1/auth/login"]
    B -->|"Google SSO"| D["GET /api/v1/auth/google/redirect"]

    C --> E["Validate Credentials"]
    E -->|"Success"| F["Generate Sanctum Token"]
    E -->|"Fail"| G["401 Unauthorized"]

    D --> H["Redirect to Google"]
    H --> I["Google OAuth Consent"]
    I --> J["Callback with Code"]
    J --> K["Exchange for Google Profile"]
    K --> L["Find or Create User"]
    L --> F

    F --> M["Return Token + User Data"]
    M --> N["Store in AuthContext"]
    N --> O["Attach to Axios Headers"]
    O --> P["All API requests include Bearer token"]
```

### 8.2 RBAC Middleware Chain

```
Request → auth:sanctum → RoleMiddleware → Controller → Policy Check → Action
```

| Middleware | Purpose |
|-----------|---------|
| `auth:sanctum` | Verify valid API token |
| `role:Super Admin` | Restrict to admin-only endpoints |
| `role:Super Admin,Peneliti` | Allow both admin and researcher |
| Policy classes | Fine-grained authorization per model (e.g., can user edit this project?) |

### 8.3 Data Security

| Layer | Protection |
|-------|-----------|
| **Transport** | HTTPS (in production), Cloudflare tunnel for demos |
| **Authentication** | Sanctum tokens with expiry |
| **Authorization** | RBAC middleware + Eloquent policies |
| **Chat Messages** | Application-level encryption (SafeEncryptedString) |
| **Passwords** | bcrypt hashing (Laravel `hashed` cast) |
| **Email** | Verification required before access |
| **Sessions** | Database-backed session management |

---

## 9. Deployment Architecture

### 9.1 Environment Options

| Environment | Stack | Access |
|-------------|-------|--------|
| **Development** | Docker Compose + Vite dev server | `localhost:5173` (frontend), `localhost:8000` (API) |
| **Demo/Staging** | Docker Compose + Cloudflare Quick Tunnel | Temporary `*.trycloudflare.com` public URL |
| **Production** | Docker Compose (or K8s) + Nginx serving built frontend | Custom domain with SSL |

### 9.2 Production Considerations

| Aspect | Recommendation |
|--------|---------------|
| **Frontend** | `npm run build` → serve `dist/` via Nginx |
| **SSL** | Terminate at Nginx or load balancer |
| **Database** | Managed PostgreSQL with PostGIS, persistent volume |
| **WebSocket** | Reverb behind Nginx with WebSocket upgrade support |
| **Queue** | Supervisor for queue worker process management |
| **Email** | Replace Mailpit with production SMTP (AWS SES, Mailtrap) |
| **Backups** | Automated PostgreSQL `pg_dump` with point-in-time recovery |
| **Monitoring** | Laravel Telescope, health checks, log aggregation |

---

## 10. Data Flow: 8-Step Research Workflow

### 10.1 End-to-End Data Flow

```mermaid
flowchart LR
    S1["01 Identitas Proyek\n(proyek table)"] --> S2["02 Wilayah Penelitian\n(geometry, shapefile_files)"]
    S2 --> S3["03 Unit & Tutupan Lahan\n(unit_analisis, tutupan_lahan)"]
    S3 --> S4["04 Referensi Proyek\n(project_market_prices, project_coefficients)"]
    S4 --> S5["05 Jasa & Metode\n(service_method_assignments)"]
    S5 --> S6["06 Data Valuasi\n(valuation_rows, method_analyses)"]
    S6 --> S7["07 Perhitungan & Validasi\n(method_results, benefits, costs)"]
    S7 --> S8["08 Laporan & Analisis\n(reviews, PDF export)"]
    S8 --> S9["Analyst Validation\n(validasi_analyst)"]
    S9 --> S10["Published\n(Public map and dashboard)"]
```

### 10.2 Data Dependencies

| Step | Writes To | Depends On |
|------|-----------|-----------|
| 01 - Identitas Proyek | `proyek` (with economic params) | `users`, `roles` |
| 02 - Wilayah | `proyek.geometry`, `proyek.shapefile_files` | `proyek`, `administrative_boundaries` |
| 03 - Unit & Tutupan Lahan | `unit_analisis`, `tutupan_lahan` | `proyek`, `ref_land_cover_catalog` |
| 04 - Referensi Proyek | `project_market_prices`, `project_coefficients` | `proyek`, `ref_market_prices`, `ref_coefficients` |
| 05 - Jasa & Metode | `service_method_assignments` | `tutupan_lahan`, `ref_valuation_methods` |
| 06 - Data Valuasi | `valuation_rows`, `method_analyses` | `service_method_assignments`, `ref_valuation_methods.input_schema` |
| 07 - Perhitungan | `method_results`, `benefits`, `costs` | `valuation_rows`, `method_analyses`, `proyek.discount_rate` |
| 08 - Laporan | `reviews`, PDF file | All preceding steps |
| Validation | `validasi_analyst` | `reviews`, `proyek` |

---

*Architecture document aligned with Redesign v2 — PKSPL IPB Valuation System*
