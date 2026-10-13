-- =====================================================================
-- NexusKit — Hub, Bundles and Job board
-- ---------------------------------------------------------------------
-- Run AFTER supabase/security.sql (it uses the helper functions from it).
-- Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run more than once.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Hub posts (news, guides, promos)
-- ---------------------------------------------------------------------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  title       text not null check (char_length(title) between 3 and 160),
  excerpt     text check (char_length(excerpt) <= 300),
  body        text check (char_length(body) <= 20000),
  cover_url   text check (cover_url is null or cover_url ~ '^https://'),
  tag         text not null default 'news' check (tag in ('news', 'guide', 'promo')),
  product_ids text[] not null default '{}',
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.posts enable row level security;
drop policy if exists "posts_read" on public.posts;
drop policy if exists "posts_write" on public.posts;
create policy "posts_read" on public.posts for select to anon, authenticated
  using (published or public.is_staff());
create policy "posts_write" on public.posts for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- 2. Bundles / toolkits
-- ---------------------------------------------------------------------
create table if not exists public.bundles (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(name) between 3 and 120),
  description      text check (char_length(description) <= 2000),
  image            text check (image is null or image ~ '^https://'),
  discount_percent numeric not null default 10 check (discount_percent between 0 and 90),
  product_ids      text[] not null default '{}' check (cardinality(product_ids) between 2 and 20),
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

alter table public.bundles enable row level security;
drop policy if exists "bundles_read" on public.bundles;
drop policy if exists "bundles_write" on public.bundles;
create policy "bundles_read" on public.bundles for select to anon, authenticated
  using (active or public.is_staff());
create policy "bundles_write" on public.bundles for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- 3. Job board (posts appear only after staff approve them)
-- ---------------------------------------------------------------------
create table if not exists public.jobs (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('hiring', 'offering')),
  title        text not null check (char_length(title) between 5 and 120),
  description  text not null check (char_length(description) between 20 and 3000),
  category     text check (char_length(category) <= 60),
  budget       text check (char_length(budget) <= 60),
  contact      text not null check (char_length(contact) between 3 and 120),
  poster_email text not null,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'closed')),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '30 days'
);
create index if not exists jobs_status_idx on public.jobs (status, created_at desc);
create index if not exists jobs_poster_idx on public.jobs (lower(poster_email));

alter table public.jobs enable row level security;
drop policy if exists "jobs_read" on public.jobs;
drop policy if exists "jobs_staff_update" on public.jobs;
drop policy if exists "jobs_staff_delete" on public.jobs;
-- Everyone sees approved, unexpired posts; posters see their own; staff see all.
create policy "jobs_read" on public.jobs for select to anon, authenticated
  using (
    (status = 'approved' and expires_at > now())
    or lower(poster_email) = public.current_verified_email()
    or public.is_staff()
  );
-- No insert policy: posts are created only through submit_job().
create policy "jobs_staff_update" on public.jobs for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "jobs_staff_delete" on public.jobs for delete to authenticated
  using (public.is_staff());

-- Submit a job post (signed-in, confirmed email; max 3 waiting, 5 per day).
create or replace function public.submit_job(
  p_kind text, p_title text, p_description text,
  p_category text, p_budget text, p_contact text
)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text := public.current_verified_email();
  v_id    text;
begin
  if v_email is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if (select count(*) from public.jobs j where lower(j.poster_email) = v_email and j.status = 'pending') >= 3
     or (select count(*) from public.jobs j where lower(j.poster_email) = v_email and j.created_at > now() - interval '1 day') >= 5 then
    raise exception 'TOO_MANY_POSTS';
  end if;

  insert into public.jobs (kind, title, description, category, budget, contact, poster_email, status)
  values (
    p_kind, trim(p_title), trim(p_description),
    nullif(trim(coalesce(p_category, '')), ''), nullif(trim(coalesce(p_budget, '')), ''),
    trim(p_contact), v_email, 'pending'
  )
  returning id::text into v_id;
  return v_id;
exception
  when check_violation or not_null_violation then
    raise exception 'INVALID_INPUT';
end;
$$;

-- The poster closes their own post (e.g. job filled).
create or replace function public.close_job(p_id text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.jobs j set status = 'closed'
   where j.id::text = p_id
     and lower(j.poster_email) = public.current_verified_email();
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.submit_job(text, text, text, text, text, text) from public;
revoke all on function public.close_job(text) from public;
grant execute on function public.submit_job(text, text, text, text, text, text) to authenticated;
grant execute on function public.close_job(text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Checkout: create_order now also accepts bundles {bundle_id, quantity}
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_email          text,
  p_name           text  default null,
  p_phone          text  default null,
  p_info           jsonb default '{}'::jsonb,
  p_items          jsonb default '[]'::jsonb,
  p_payment_method text  default null,
  p_promo_code     text  default null,
  p_slip_path      text  default null
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email      text    := lower(trim(coalesce(p_email, '')));
  v_name       text    := nullif(trim(coalesce(p_name, '')), '');
  v_phone      text    := nullif(trim(coalesce(p_phone, '')), '');
  v_info       jsonb   := coalesce(p_info, '{}'::jsonb);
  v_item       jsonb;
  v_prod       jsonb;
  v_qty        int;
  v_items      jsonb   := '[]'::jsonb;
  v_subtotal   numeric := 0;
  v_total      numeric;
  v_discount   numeric := 0;
  v_promo      text;
  v_method     text;
  v_slip       text    := p_slip_path;
  v_pay_later  boolean := (p_payment_method = 'pay-later');
  v_enabled    boolean;
  v_note       text[]  := '{}';
  v_key        text;
  v_val        text;
  v_id         text;
  v_bundle     jsonb;
  v_bdisc      numeric;
  v_pid        text;
  v_unit       numeric;
begin
  -- Basic input validation
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email) > 254 then
    raise exception 'INVALID_EMAIL';
  end if;
  if length(coalesce(v_name, '')) > 100 or length(coalesce(v_phone, '')) > 40 then
    raise exception 'INVALID_INPUT';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50 then
    raise exception 'INVALID_ITEMS';
  end if;
  if jsonb_typeof(v_info) is distinct from 'object'
     or (select count(*) from jsonb_object_keys(v_info)) > 20 then
    raise exception 'INVALID_INPUT';
  end if;

  -- Price every line from the database. A line is either a product
  -- {id, quantity} or a bundle {bundle_id, quantity}; bundles are expanded
  -- into their products at the bundle discount.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item->>'quantity', '') !~ '^[0-9]{1,2}$' then
      raise exception 'INVALID_QUANTITY';
    end if;
    v_qty := (v_item->>'quantity')::int;
    if v_qty < 1 then
      raise exception 'INVALID_QUANTITY';
    end if;

    if v_item ? 'bundle_id' then
      select to_jsonb(b) into v_bundle
      from public.bundles b
      where b.id::text = (v_item->>'bundle_id') and b.active;
      if v_bundle is null then
        raise exception 'PRODUCT_NOT_FOUND';
      end if;
      v_bdisc := least(greatest(coalesce((v_bundle->>'discount_percent')::numeric, 0), 0), 90);
      for v_pid in select jsonb_array_elements_text(coalesce(v_bundle->'product_ids', '[]'::jsonb))
      loop
        select to_jsonb(p) into v_prod from public.products p where p.id::text = v_pid;
        if v_prod is null or (v_prod->>'price') is null then
          raise exception 'PRODUCT_NOT_FOUND';
        end if;
        v_unit := round((v_prod->>'price')::numeric * (100 - v_bdisc) / 100, 2);
        v_subtotal := v_subtotal + v_unit * v_qty;
        v_items := v_items || jsonb_build_array(jsonb_build_object(
          'id',                v_prod->'id',
          'name',              v_prod->'name',
          'price',             v_unit,
          'quantity',          v_qty,
          'image',             v_prod->'image',
          'product_type',      v_prod->'product_type',
          'subscription_days', coalesce((v_prod->>'subscription_days')::numeric::int, 0),
          'bundle',            v_bundle->'name'
        ));
      end loop;
      continue;
    end if;

    select to_jsonb(p) into v_prod
    from public.products p
    where p.id::text = (v_item->>'id');

    if v_prod is null or (v_prod->>'price') is null then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    v_subtotal := v_subtotal + (v_prod->>'price')::numeric * v_qty;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'id',                v_prod->'id',
      'name',              v_prod->'name',
      'price',             (v_prod->>'price')::numeric,
      'quantity',          v_qty,
      'image',             v_prod->'image',
      'product_type',      v_prod->'product_type',
      'subscription_days', coalesce((v_prod->>'subscription_days')::numeric::int, 0)
    ));
  end loop;
  if jsonb_array_length(v_items) = 0 or jsonb_array_length(v_items) > 100 then
    raise exception 'INVALID_ITEMS';
  end if;

  -- Promo code
  if nullif(trim(coalesce(p_promo_code, '')), '') is not null then
    select upper(pc.code), least(greatest(coalesce(pc.discount_percent, 0), 0), 100)
      into v_promo, v_discount
    from public.promo_codes pc
    where upper(pc.code) = upper(trim(p_promo_code))
    limit 1;
    if v_promo is null then
      raise exception 'INVALID_PROMO';
    end if;
  end if;
  v_total := round(v_subtotal * (100 - v_discount) / 100, 2);

  -- Payment
  if v_pay_later then
    select coalesce((to_jsonb(s)->>'enable_pay_later')::boolean, true)
      into v_enabled
    from public.site_settings s
    where s.id = 1;
    if coalesce(v_enabled, true) = false then
      raise exception 'PAY_LATER_DISABLED';
    end if;
    v_method := 'pay_later';
    v_slip := null;
  else
    select pm.provider_name into v_method
    from public.payment_methods pm
    where pm.id::text = p_payment_method;
    if v_method is null then
      raise exception 'INVALID_PAYMENT_METHOD';
    end if;
    if coalesce(v_slip, '') !~ '^[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$' then
      raise exception 'SLIP_REQUIRED';
    end if;
    begin
      if not exists (select 1 from storage.objects o
                     where o.bucket_id = 'payment-slips' and o.name = v_slip) then
        raise exception 'SLIP_REQUIRED';
      end if;
    exception when insufficient_privilege then
      null; -- storage not readable here; the upload was already checked by the API
    end;
    if exists (select 1 from public.orders o where o.slip_url = v_slip) then
      raise exception 'SLIP_ALREADY_USED';
    end if;
  end if;

  -- Customer notes (name, phone, product-specific fields)
  if v_name  is not null then v_note := v_note || ('Name: '    || v_name);  end if;
  if v_phone is not null then v_note := v_note || ('Contact: ' || v_phone); end if;
  for v_key, v_val in select key, value from jsonb_each_text(v_info)
  loop
    if length(v_key) > 100 or length(coalesce(v_val, '')) > 500 then
      raise exception 'INVALID_INPUT';
    end if;
    if nullif(trim(coalesce(v_val, '')), '') is not null then
      v_note := v_note || (v_key || ': ' || trim(v_val));
    end if;
  end loop;

  insert into public.orders (
    customer_name, customer_email, order_note, total_amount, subtotal_amount,
    items, status, slip_url, payment_method, promo_code, discount_percent
  ) values (
    coalesce(v_name, 'Customer'), v_email, array_to_string(v_note, ' | '), v_total, v_subtotal,
    v_items, 'pending', v_slip, v_method, v_promo, v_discount
  )
  returning id::text into v_id;

  return jsonb_build_object(
    'id', v_id,
    'total', v_total,
    'subtotal', v_subtotal,
    'discount_percent', v_discount,
    'payment_method', v_method,
    'items', v_items,
    'note', array_to_string(v_note, ' | ')
  );
end;
$$;


revoke all on function public.create_order(text, text, text, jsonb, jsonb, text, text, text) from public;
grant execute on function public.create_order(text, text, text, jsonb, jsonb, text, text, text) to anon, authenticated;

commit;
