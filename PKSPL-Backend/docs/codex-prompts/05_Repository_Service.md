# 05 — Repository, Service, DTO, and DI

Implement the data-access and business-service layer for the PKSPL models after reviewing actual models, migrations, response conventions, and at least one representative module end-to-end.

## Required pattern

For each resource that has CRUD/query behavior, create a focused repository interface in `app/Contracts/Repositories`, an Eloquent implementation in `app/Repositories`, a DTO for service input where the service accepts structured write data, and a service in `app/Services`.

At minimum cover: roles, users, proyek, ekosistem, area terdampak, four ecosystem service tables, metode valuasi, hasil valuasi, dataset referensi, basis data AI, analisis AI, histori, and validasi analyst. A repository may be read-only where the table is append-only by schema/workflow; do not guess which tables are append-only.

## Rules

- Interfaces should expose actual required operations, not a speculative generic CRUD contract.
- Repositories handle query construction and persistence only. Services own transactions, authorization collaboration, orchestration, and business checks.
- DTOs must be immutable/typed where project PHP conventions support it, and must originate from already-validated Form Request data. Do not re-parse arbitrary request arrays in services.
- Register every interface-to-implementation binding in one dedicated provider and ensure it is loaded by Laravel 12's provider configuration.
- Use pagination explicitly for index operations. Do not invent default filtering or ordering rules beyond deterministic primary-key ordering if an endpoint needs one.
- Do not duplicate an Eloquent query in controllers and repositories.
- Do not create an artificial repository/service merely to wrap a one-line relationship call with no reuse. Explain any exception to the pattern.
- Activity history writes and multi-record writes must use transactions only when their required behavior has been specified. Do not swallow failures.

## Verification

Resolve representative repository interfaces through Laravel's container, run PHPStan/Pint, and add focused service tests for any implemented business rule. Report bindings and validation results.
