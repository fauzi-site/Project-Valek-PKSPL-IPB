# 07 — CRUD API Modules

Implement versioned REST API modules for every PKSPL table after inspecting migrations, models, repositories, services, authentication, and the API response convention. Do not create a new contract that conflicts with prior stages.

## Modules

- Roles, Users, Proyek, Ekosistem, Area Terdampak
- Provisioning Service, Regulating Service, Supporting Service, Cultural Service
- Metode Valuasi, Hasil Valuasi
- Dataset Referensi, Basis Data AI, Analisis AI, Histori, Validasi Analyst

## Per module, create only what is applicable

- Controller under `app/Http/Controllers/Api/V1`
- Form Requests for store/update with field-level validation derived from actual migrations
- API Resource(s) that expose a stable, explicit response shape
- Repository interface/implementation and service following stage 05
- Policy and authorization registration where authorization is definable
- `/api/v1` routes with route-model binding configured for the actual custom primary keys
- Feature tests for happy path, validation failure, unauthenticated access, and forbidden access where rules are defined

## Non-negotiable rules

- Do not implement valuation formulas, TEV calculations, automatic validation outcomes, or AI-generated answers: the SQL provides storage fields, not their business formulas.
- Do not expose `password`, credentials, or internal tokens.
- For index routes, use pagination and whitelist filters/sorts; do not pass user-provided column names to Eloquent.
- Validate foreign-key IDs exist. Keep numeric decimal inputs precise and do not cast them with PHP floats.
- `histori` and `analisis_ai` only have `created_at`; do not implement update/delete routes for them unless the product owner explicitly requires it. For all other tables, confirm intended CRUD lifecycle when it is not defined.
- Do not assume users can manage roles, datasets, AI knowledge, or validations. Enforce only policies supported by a supplied role/action matrix; otherwise authenticate and document the unresolved authorization requirement.
- Return 201 for creates, 200 for reads/updates, 204 only when the established API convention intentionally has no body, 401 for unauthenticated, 403 for forbidden, 404 for absent resources, and 422 for validation errors.

## Delivery approach

Implement one representative parent module (Proyek), one child module (AreaTerdampak), and one value module (HasilValuasi) first. Test the API contract, then continue consistently with the remaining modules. Do not mass-generate unreviewed controllers.
