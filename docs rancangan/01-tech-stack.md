# Tech Stack Document

## PKSPL IPB — Coastal & Marine Ecosystem Economic Valuation System

### Aligned with Redesign v2

---

## 1. Project Overview

The **PKSPL Valuation System** is a full-stack web application that digitalizes, standardizes, and automates the economic valuation of coastal and marine natural resources across Indonesia. Developed for **Pusat Kajian Sumberdaya Pesisir dan Lautan (PKSPL), IPB University**.

**Key Capabilities:**
- Interactive spatial mapping with Shapefile upload and administrative boundary lookup
- Ecosystem services classification across 4 categories (Provisioning, Regulating, Supporting, Cultural)
- Multi-method valuation with primary/supporting method designation and double-counting prevention
- Automated TEV (Total Economic Value), BCR (Benefit-Cost Ratio), and NPV (Net Present Value) calculations
- Real-time collaboration via WebSocket chat with presence and typing indicators
- Comprehensive report generation and analytics dashboards
- Bilingual support (Indonesian / English)

---

## 2. Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------| 
| **Backend Runtime** | PHP | ^8.3 |
| **Backend Framework** | Laravel | 13 (v13.21.1) |
| **Database** | PostgreSQL + PostGIS | 16 + 3.4 |
| **Auth** | Laravel Sanctum | ^4.3 |
| **OAuth SSO** | Laravel Socialite (Google) | ^5.29 |
| **WebSocket** | Laravel Reverb | ^1.11.1 |
| **Queue** | Laravel Database Queue | built-in |
| **Web Server** | Nginx | latest |
| **Frontend Runtime** | JavaScript (ES Modules) & TypeScript | ES2020+ |
| **Frontend Framework** | React | ^18.2.0 |
| **Build Tool** | Vite | ^5.1.4 |
| **CSS Framework** | Tailwind CSS | ^3.4.1 |
| **Routing** | React Router DOM | ^6.22.0 |
| **Maps** | Leaflet + React Leaflet | ^1.9.4 / ^4.2.1 |
| **Charts** | Recharts | ^2.15.4 |
| **WebSocket Client** | Laravel Echo + Pusher JS | ^2.5.0 / ^8.6.0 |
| **i18n** | i18next + react-i18next | ^26.4.2 / ^17.0.13 |
| **Containerization** | Docker + Docker Compose | v2 |

---

## 3. Backend Stack

### 3.1 Runtime & Framework
- **PHP ^8.3** running inside `php:8.3-fpm` Docker image
- **Laravel 13** (v13.21.1) — full-featured MVC framework with Eloquent ORM, migrations, seeders, form requests, API resources, policies, events/broadcasting, and queue workers

### 3.2 Database
- **PostgreSQL 16** with **PostGIS 3.4** extension (`postgis/postgis:16-3.4`)
- GeoJSON geometry storage for project boundaries and land cover polygons
- Administrative boundary hierarchy with spatial queries
- JSONB columns for flexible data: `input_schema` for method definitions, `row_data` for valuation data, `calculation_detail` for results

### 3.3 Authentication & Security
| Feature | Technology |
|---------|-----------|
| API Token Auth | Laravel Sanctum ^4.3 |
| Google OAuth SSO | Laravel Socialite ^5.29 |
| RBAC Middleware | Custom `RoleMiddleware` |
| Chat Encryption | Application-level `SafeEncryptedString` cast |
| Email Verification | Built-in Laravel verification |
| Password Reset | Secure token-based reset flow |

### 3.4 Real-time & Background Processing
| Feature | Technology |
|---------|-----------|
| WebSocket Server | Laravel Reverb ^1.11.1 |
| Event Broadcasting | Laravel Broadcasting (Pusher protocol) |
| Queue/Jobs | Laravel Database Queue Worker |
| Presence | Heartbeat endpoint + last_online_at tracking |

### 3.5 Development & Testing Tools
| Tool | Purpose |
|------|---------| 
| Mailpit | Local email catcher for testing (port 8025) |
| Adminer | Web-based PostgreSQL admin UI (port 8081) |
| Composer | PHP dependency manager |
| Laravel Pint ^1.27 | Code style fixer |
| Laravel Pail ^1.2.5 | Real-time log viewer |
| PHPUnit ^12.5.12 | Unit & feature testing |

---

## 4. Frontend Stack

### 4.1 Core Framework
- **React 18** (^18.2.0) with React DOM — SPA architecture
- **TypeScript** for newer modules (peneliti workflow), **JavaScript** for legacy components
- **Vite 5** (^5.1.4) with `@vitejs/plugin-react` (^4.2.1) — fast HMR and optimized builds

### 4.2 Styling
- **Tailwind CSS 3** (^3.4.1) — utility-first CSS framework
- **PostCSS** (^8.4.35) + **Autoprefixer** (^10.4.18)
- Dark sidebar theme (Slate-900) + white content area design system

### 4.3 Routing & State
- **React Router DOM 6** (^6.22.0) — nested routes, protected routes, layout routes
- **React Context API** — AuthContext, ProjectContext, SpreadsheetContext, ChatContext

### 4.4 Maps & Geospatial
| Library | Purpose |
|---------|---------|
| Leaflet ^1.9.4 | Interactive map rendering |
| React Leaflet ^4.2.1 | React wrapper for Leaflet |
| shpjs ^6.2.0 | Browser-side Shapefile (.zip) parsing |

### 4.5 Data Visualization & Processing
| Library | Purpose |
|---------|---------|
| Recharts ^2.15.4 | Charts and analytics dashboards |
| xlsx / SheetJS ^0.18.5 | Spreadsheet import/export |
| jsPDF ^4.2.1 | PDF report generation |
| jspdf-autotable ^5.0.8 | PDF table formatting |
| html2canvas ^1.4.1 | HTML-to-image for PDF export |

### 4.6 Communication & UX
| Library | Purpose |
|---------|---------|
| Laravel Echo ^2.5.0 | WebSocket client abstraction |
| Pusher JS ^8.6.0 | WebSocket transport protocol |
| react-hot-toast ^2.6.0 | Toast notifications |
| Lucide React ^0.344.0 | Icon library |
| i18next ^26.4.2 | Internationalization framework |
| react-i18next ^17.0.13 | React i18n integration |

---

## 5. Infrastructure & DevOps

### 5.1 Docker Container Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Docker Compose                      │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  nginx   │  │   app    │  │    postgres       │  │
│  │ :8000    │──│ PHP-FPM  │──│ PostgreSQL 16     │  │
│  │          │  │ Laravel  │  │ + PostGIS 3.4     │  │
│  └──────────┘  └──────────┘  │ :5433             │  │
│                               └──────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  reverb  │  │  queue   │  │ mailpit  │          │
│  │ WS:8085  │  │ Worker   │  │ :8025    │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                      │
│  ┌──────────┐  ┌──────────────┐                     │
│  │ adminer  │  │   tunnel     │                     │
│  │ :8081    │  │ (Cloudflare) │                     │
│  └──────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────┘
```

### 5.2 Port Mapping

| Service | Port | Protocol |
|---------|------|----------|
| Frontend (Vite Dev) | 5173 | HTTP |
| Nginx (API + SPA) | 8000 | HTTP |
| Laravel Reverb (WebSocket) | 8085 | WS |
| Adminer | 8081 | HTTP |
| Mailpit Web UI | 8025 | HTTP |
| Mailpit SMTP | 1025 | SMTP |
| PostgreSQL | 5433 | TCP |

### 5.3 Demo/Staging
- **Cloudflare Quick Tunnel** for temporary public demo access
- Single-origin Nginx reverse proxy serving both SPA and API
- No VPS/cloud hosting required for demos

---

## 6. Database Architecture

### 6.1 PostgreSQL 16 + PostGIS 3.4
- **~35 tables** organized into logical domains
- PostGIS extension for geospatial queries and boundary lookups
- JSONB for flexible configurations (`input_schema` for method definitions, `row_data` for valuation data, `calculation_detail` for results)
- Administrative boundary hierarchy: Provinsi → Kabupaten/Kota → Kecamatan → Desa/Kelurahan

### 6.2 Schema Domain Groups

| Domain | Key Tables | Description |
|--------|-----------|-------------|
| Core | `roles`, `users`, `proyek` | Authentication, authorization, projects (with embedded economic parameters) |
| Geography | `provinsi`, `kabupaten_kota`, `kecamatan`, `desa_kelurahan`, `administrative_boundaries` | Indonesian admin hierarchy + PostGIS spatial data |
| Ecosystem & Land Cover | `unit_analisis`, `tutupan_lahan` | Analysis units (zones) and land cover types — replaces old `indexes`, `jenis_tutupan_lahan`, `area_terdampak`, `ekosistem` |
| Reference Data | `ref_ecosystem_types`, `ref_valuation_methods`, `ref_market_prices`, `ref_coefficients`, `ref_land_cover_catalog` | Admin-managed system reference catalogs with `input_schema` for dynamic form rendering |
| Valuation | `service_method_assignments`, `valuation_rows`, `method_analyses`, `method_results`, `valuation_custom_columns`, `project_market_prices`, `project_coefficients`, `benefits`, `costs` | Multi-method valuation engine with flexible JSON data model |
| Review | `reviews`, `review_comments`, `comment_mentions`, `comment_attachments`, `comment_edit_histories`, `validasi_analyst` | Review & validation workflow |
| Communication | `conversations`, `conversation_participants`, `messages`, `message_attachments`, `notification_preferences` | Real-time messaging |
| Audit | `activity_logs`, `histori` | Logging & audit trail |

---

## 7. Security Features

| Feature | Implementation |
|---------|---------------|
| API Authentication | Bearer token via Laravel Sanctum |
| OAuth 2.0 | Google SSO via Laravel Socialite |
| RBAC | 4 roles: Super Admin, Analis, Peneliti, Guest |
| Chat Encryption | SafeEncryptedString application-level encryption |
| Email Verification | Token-based email verification flow |
| Password Reset | Secure token with expiry |
| CSRF Protection | Laravel built-in CSRF middleware |
| Input Validation | Form Request classes for all API endpoints |

---

## 8. Key Integrations

| Integration | Library | Use Case |
|-------------|---------|----------|
| Shapefile Parsing | shpjs | Upload .zip shapefiles, parse to GeoJSON in browser |
| Interactive Maps | Leaflet + React Leaflet | Project boundary visualization, polygon editing |
| Spreadsheet I/O | SheetJS (xlsx) | Import/export valuation data from Excel |
| PDF Generation | jsPDF + jspdf-autotable + html2canvas | Export comprehensive valuation reports |
| Real-time Chat | Laravel Echo + Reverb | WebSocket messaging with presence & typing |
| Bilingual Support | i18next | Indonesian (primary) / English UI switching |
| Data Visualization | Recharts | Analytics dashboards, TEV distribution charts |

---

*Tech stack document aligned with Redesign v2 — PKSPL IPB Valuation System*
