# 09 — Swagger, OpenAPI, and Postman

Document the implemented Laravel PKSPL API. Inspect actual routes, Form Requests, API Resources, auth middleware, and test responses first. Documentation must describe the running API, not an aspirational one.

## Deliverables

- Swagger/OpenAPI configuration and generated documentation for `/api/v1` endpoints.
- OpenAPI endpoint descriptions, tags, path parameters using custom key names, request bodies, validation errors, auth requirements, and response examples.
- Importable Postman Collection JSON and Postman Environment JSON.
- README instructions for generating/viewing Swagger and importing Postman files.

## Requirements

- Use a Laravel 12-compatible OpenAPI package after checking its official documentation; do not invent annotations or configuration syntax.
- Include examples for all existing endpoints, including auth (`register`, `login`, `refresh`, `logout`, `me`, password reset, verification) and each CRUD module actually implemented.
- Use Postman variables such as `base_url` and `access_token`; do not include real credentials, JWTs, client secrets, or database passwords.
- Ensure examples match validation and resource output exactly. Do not document routes that do not exist.
- Make 401, 403, 404, and 422 responses explicit where the endpoint can produce them.

## Verification

Generate the OpenAPI artifact and check it parses. Import or validate the Postman JSON format if tooling is available. Compare a representative documented request/response with feature-test output.
