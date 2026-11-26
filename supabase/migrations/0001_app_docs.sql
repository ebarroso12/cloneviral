-- Armazenamento genérico de documentos por coleção (usado pelo SupabaseStore).
create table if not exists app_docs (
  id text primary key,
  collection text not null,
  user_id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists app_docs_user_collection_idx on app_docs (user_id, collection, created_at);
create index if not exists app_docs_collection_idx on app_docs (collection);
-- O app acessa com a service role (servidor). Sem política = ninguém mais lê pela API pública.
alter table app_docs enable row level security;
