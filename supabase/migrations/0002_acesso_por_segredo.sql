-- Acesso ao app_docs sem chave de administrador: o servidor usa a chave pública e envia, no cabeçalho
-- x-rv-key, um segredo que só ele conhece. O banco guarda apenas o sha256 do segredo.
--
-- Depois de aplicar, gravar o resumo (nunca o segredo):
--   insert into private.rv_key (hash) values ('<sha256 em hexadecimal de RV_DB_KEY>');
create schema if not exists private;

create table if not exists private.rv_key (hash text primary key);
alter table private.rv_key enable row level security; -- sem política: ninguém lê pela API

create or replace function private.rv_allowed() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from private.rv_key k
    where k.hash = encode(sha256(convert_to(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-rv-key', ''), 'UTF8')), 'hex')
  );
$$;

revoke all on function private.rv_allowed() from public;
grant usage on schema private to anon;
grant execute on function private.rv_allowed() to anon;
grant select, insert, update, delete on public.app_docs to anon;

drop policy if exists app_docs_com_segredo on public.app_docs;
create policy app_docs_com_segredo on public.app_docs
  for all to anon
  using (private.rv_allowed())
  with check (private.rv_allowed());
