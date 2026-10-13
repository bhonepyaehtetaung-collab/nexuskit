-- =====================================================================
-- NexusKit — AI drafts (products, toolkits, Hub posts, job posts)
-- ---------------------------------------------------------------------
-- Run AFTER security.sql and features.sql.
-- Supabase Dashboard → SQL Editor → New query → paste ALL → Run.
-- Safe to run more than once.
--
-- The AI never publishes anything. It only writes rows into ai_drafts.
-- A staff member (dashboard) or the owner's Telegram chat (server, with the
-- service-role key) approves a draft through publish_draft().
-- Supplier cost prices live in staff-only tables, never in `products`
-- (which everyone can read).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Drafts
-- ---------------------------------------------------------------------
create table if not exists public.ai_drafts (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('product', 'bundle', 'post', 'job')),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  data          jsonb not null default '{}'::jsonb,
  cost          numeric check (cost is null or cost >= 0),
  source        text check (char_length(source) <= 8000),
  sources       jsonb not null default '[]'::jsonb,
  note          text check (char_length(note) <= 2000),
  origin        text not null default 'dashboard' check (origin in ('dashboard', 'telegram')),
  result_id     text,
  decided_by    text,
  decided_at    timestamptz,
  tg_message_id bigint,
  created_at    timestamptz not null default now()
);
create index if not exists ai_drafts_status_idx on public.ai_drafts (status, created_at desc);

alter table public.ai_drafts enable row level security;
drop policy if exists "ai_drafts_staff" on public.ai_drafts;
create policy "ai_drafts_staff" on public.ai_drafts for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- 2. Private pricing (margin) and supplier costs — staff only
-- ---------------------------------------------------------------------
create table if not exists public.pricing_rules (
  id              int primary key default 1 check (id = 1),
  markup_percent  numeric not null default 20 check (markup_percent between 0 and 500),
  round_to        int not null default 100 check (round_to in (1, 10, 50, 100, 500, 1000)),
  category_markup jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);
insert into public.pricing_rules (id) values (1) on conflict (id) do nothing;

alter table public.pricing_rules enable row level security;
drop policy if exists "pricing_staff_read" on public.pricing_rules;
drop policy if exists "pricing_admin_write" on public.pricing_rules;
create policy "pricing_staff_read" on public.pricing_rules for select to authenticated
  using (public.is_staff());
create policy "pricing_admin_write" on public.pricing_rules for update to authenticated
  using (public.staff_role() in ('super_admin', 'manager'))
  with check (public.staff_role() in ('super_admin', 'manager'));

create table if not exists public.product_costs (
  product_id text primary key,
  cost       numeric not null check (cost >= 0),
  supplier   text,
  updated_at timestamptz not null default now()
);
alter table public.product_costs enable row level security;
drop policy if exists "costs_staff" on public.product_costs;
create policy "costs_staff" on public.product_costs for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- 3. Approve / reject a draft
--    p_data (optional) = the fields as edited by the reviewer.
-- ---------------------------------------------------------------------
create or replace function public.publish_draft(p_id uuid, p_approve boolean, p_data jsonb default null, p_by text default null)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_service boolean := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role';
  v_by      text;
  v_draft   public.ai_drafts;
  v_d       jsonb;
  v_id      text;
  v_slug    text;
  v_n       int := 1;
begin
  if not v_service and not public.is_staff() then
    raise exception 'NOT_ALLOWED';
  end if;
  v_by := case when v_service then coalesce(nullif(trim(p_by), ''), 'telegram') else public.current_verified_email() end;

  select * into v_draft from public.ai_drafts where id = p_id for update;
  if v_draft.id is null then
    raise exception 'DRAFT_NOT_FOUND';
  end if;
  if v_draft.status <> 'pending' then
    return jsonb_build_object('status', v_draft.status, 'result_id', v_draft.result_id, 'already', true);
  end if;

  if not p_approve then
    update public.ai_drafts set status = 'rejected', decided_by = v_by, decided_at = now() where id = p_id;
    return jsonb_build_object('status', 'rejected');
  end if;

  v_d := coalesce(p_data, v_draft.data);
  if jsonb_typeof(v_d) is distinct from 'object' then
    raise exception 'INVALID_DATA';
  end if;

  if v_draft.kind = 'product' then
    if nullif(trim(v_d ->> 'name'), '') is null or coalesce(v_d ->> 'price', '') !~ '^[0-9]+(\.[0-9]+)?$' then
      raise exception 'PRICE_REQUIRED';
    end if;
    insert into public.products (name, price, product_type, subscription_days, required_fields, description, image)
    select r.name, r.price, r.product_type, coalesce(r.subscription_days, 0), r.required_fields, r.description, r.image
    from jsonb_populate_record(null::public.products,
           v_d || jsonb_build_object('required_fields', coalesce(v_d -> 'required_fields', '[]'::jsonb))) r
    returning id::text into v_id;
    if v_draft.cost is not null then
      insert into public.product_costs (product_id, cost, supplier)
      values (v_id, v_draft.cost, nullif(v_d ->> 'supplier', ''))
      on conflict (product_id) do update set cost = excluded.cost, supplier = excluded.supplier, updated_at = now();
    end if;

  elsif v_draft.kind = 'bundle' then
    insert into public.bundles (name, description, image, discount_percent, product_ids, active)
    values (
      v_d ->> 'name', v_d ->> 'description', nullif(v_d ->> 'image', ''),
      coalesce((v_d ->> 'discount_percent')::numeric, 10),
      array(select jsonb_array_elements_text(coalesce(v_d -> 'product_ids', '[]'::jsonb))),
      true)
    returning id::text into v_id;

  elsif v_draft.kind = 'post' then
    v_slug := lower(regexp_replace(coalesce(nullif(v_d ->> 'slug', ''), v_d ->> 'title', 'post'), '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from left(v_slug, 70));
    if length(v_slug) < 3 then v_slug := 'post-' || to_char(now(), 'YYYYMMDDHH24MI'); end if;
    while exists (select 1 from public.posts where slug = v_slug || case when v_n = 1 then '' else '-' || v_n end) loop
      v_n := v_n + 1;
    end loop;
    if v_n > 1 then v_slug := v_slug || '-' || v_n; end if;
    insert into public.posts (slug, title, excerpt, body, cover_url, tag, product_ids, published)
    values (
      v_slug, v_d ->> 'title', nullif(v_d ->> 'excerpt', ''), nullif(v_d ->> 'body', ''),
      nullif(v_d ->> 'cover_url', ''), coalesce(nullif(v_d ->> 'tag', ''), 'news'),
      array(select jsonb_array_elements_text(coalesce(v_d -> 'product_ids', '[]'::jsonb))),
      true)
    returning id::text into v_id;

  elsif v_draft.kind = 'job' then
    insert into public.jobs (kind, title, description, category, budget, contact, poster_email, status, expires_at)
    values (
      coalesce(nullif(v_d ->> 'kind', ''), 'hiring'), v_d ->> 'title', v_d ->> 'description',
      nullif(v_d ->> 'category', ''), nullif(v_d ->> 'budget', ''), v_d ->> 'contact',
      coalesce(v_by, 'admin'), 'approved', now() + interval '30 days')
    returning id::text into v_id;
  end if;

  update public.ai_drafts
     set status = 'approved', data = v_d, result_id = v_id, decided_by = v_by, decided_at = now()
   where id = p_id;

  return jsonb_build_object('status', 'approved', 'result_id', v_id, 'kind', v_draft.kind);
end;
$$;

revoke all on function public.publish_draft(uuid, boolean, jsonb, text) from public;
grant execute on function public.publish_draft(uuid, boolean, jsonb, text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4. AI jobs — the slow AI work runs in the background and reports here
-- ---------------------------------------------------------------------
create table if not exists public.ai_jobs (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('products', 'job', 'news')),
  origin      text not null default 'dashboard' check (origin in ('dashboard', 'telegram')),
  input       jsonb not null default '{}'::jsonb,
  status      text not null default 'queued' check (status in ('queued', 'running', 'done', 'error')),
  error       text,
  draft_count int not null default 0,
  created_by  text,
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);
alter table public.ai_jobs enable row level security;
drop policy if exists "ai_jobs_staff" on public.ai_jobs;
create policy "ai_jobs_staff" on public.ai_jobs for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

commit;
