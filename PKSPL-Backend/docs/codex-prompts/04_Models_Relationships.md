# 04 — Models and Relationships

Create Eloquent models for every table defined by `03_Database_Migration.md`. Inspect the actual migrations first and make model configuration match them exactly.

## Required models

`Role`, `User`, `Proyek`, `Ekosistem`, `AreaTerdampak`, `ProvisioningService`, `RegulatingService`, `SupportingService`, `CulturalService`, `MetodeValuasi`, `HasilValuasi`, `DatasetReferensi`, `BasisDataAi`, `AnalisisAi`, `Histori`, and `ValidasiAnalyst`.

## Requirements

- Configure each nonstandard table name and primary key explicitly. Set incrementing/key type only after the ID decision in stage 03 is known.
- Define `$fillable` based only on real assignable schema fields. Do not make primary IDs fillable when IDs are generated.
- Hide passwords and token-sensitive fields from serialization. Use Laravel's standard password hashing cast where compatible with the installed Laravel version.
- Add casts for datetime fields and decimal values. Keep decimals as strings where Laravel's decimal cast requires it; do not use float casts for amounts, coordinates, or calculations.
- Implement all relationships expressed by foreign keys with accurate `belongsTo` and `hasMany` methods, including explicit foreign/local key names where Laravel conventions do not apply.
- Add scopes only for repeated, meaningful filters supported by schema: active/inactive status, project status, validation status, or related project/area. Do not add speculative search scopes.
- Add accessors/mutators only where they enforce a defined invariant, such as password hashing. Do not transform names, statuses, or calculations based on assumptions.
- Do not calculate `tev` or service `nilai` in model events: no business formula is supplied. Keep models free of business workflows.

## Verification

Run `php artisan migrate:fresh` only against the local Docker database after confirming it is safe to erase its development data. Otherwise run `php artisan migrate`. Add focused relationship tests and report all commands run.
