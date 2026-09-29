# 08 — AI Module Architecture

Create an AI integration architecture for PKSPL without integrating OpenAI or any external LLM provider yet. Inspect the tables `basis_data_ai`, `dataset_referensi`, and `analisis_ai` first.

## Required components

- `AIServiceInterface` and a provider-neutral `AIService` implementation/stub
- `PromptBuilder`
- `KnowledgeRepository`, `DatasetRepository`, `VectorRepository`, and `ConversationRepository` interfaces/implementations only where they map to a real persistence need
- `AIController` under `/api/v1`
- DI bindings and request/resource/test coverage

## Boundaries

- `basis_data_ai`, `dataset_referensi`, and `analisis_ai` are the only AI-related tables supplied. There is no vector, embedding, document-chunk, or conversation table. Do not create these tables or claim vector search works without schema approval.
- `analisis_ai` can persist question, answer, source data, project, and user. It has no update timestamp. Treat it as immutable history unless the product owner specifies otherwise.
- The initial service must return a clear controlled "provider not configured" error (for example 503) instead of fabricated AI answers. Do not create mock production answers or fallback data.
- Keep provider request/response mapping inside the future provider implementation. Controllers and application services should depend only on `AIServiceInterface`.
- Validate that a referenced project/user exists and authorize access using only confirmed policies.
- Do not log full prompts, answers, tokens, or sensitive user data by default. Log minimal failure context safely.

## Verification

Add tests that demonstrate request validation, authorization, persistence behavior only when an answer is genuinely received, and the explicit provider-not-configured behavior. No external API call may run in test or local default configuration.
