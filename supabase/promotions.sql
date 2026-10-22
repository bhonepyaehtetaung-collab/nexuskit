-- =====================================================================
-- NexusKit — product sorting, seasonal campaigns, daily AI drafts
-- ---------------------------------------------------------------------
-- Supabase Dashboard → SQL Editor → New query → paste ALL → Run.
-- Safe to run more than once.
--
-- 1. products.sort_order      — the "Recommended" order set in Admin.
-- 2. popular_products()       — best sellers (ids only, no counts).
-- 3. campaigns                — seasonal sales: % off chosen products or
--                               categories between two dates.
-- 4. create_order()           — now applies the campaign price itself, so
--                               the browser can never pick its own price.
-- 5. site_settings.ai_daily   — switches for the daily AI drafts.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Manual product order
-- ---------------------------------------------------------------------
alter table public.products add column if not exists sort_order integer;

-- ---------------------------------------------------------------------
-- 2. Best sellers (completed orders, last 120 days)
-- ---------------------------------------------------------------------
create or replace function public.popular_products(p_limit int default 60)
returns table (product_id text)
language sql stable security definer
set search_path = ''
as $$
  select it ->> 'id'
  from public.orders o
  cross join lateral jsonb_array_elements(case when jsonb_typeof(o.items) = 'array' then o.items else '[]'::jsonb end) it
  where o.status = 'completed'
    and o.created_at > now() - interval '120 days'
    and nullif(it ->> 'id', '') is not null
  group by 1
  order by sum(case when coalesce(it ->> 'quantity', '') ~ '^[0-9]{1,3}$' then (it ->> 'quantity')::int else 1 end) desc
  limit least(greatest(coalesce(p_limit, 60), 1), 100);
$$;
revoke all on function public.popular_products(int) from public;
grant execute on function public.popular_products(int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Seasonal campaigns
-- ---------------------------------------------------------------------
create table if not exists public.campaigns (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(name) between 2 and 80),
  name_en          text check (char_length(name_en) <= 80),
  tagline          text check (char_length(tagline) <= 200),
  tagline_en       text check (char_length(tagline_en) <= 200),
  emoji            text check (char_length(emoji) <= 8),
  theme            text not null default 'violet' check (theme in ('violet', 'red', 'gold', 'green', 'blue', 'pink')),
  discount_percent numeric not null check (discount_percent between 1 and 90),
  all_products     boolean not null default false,
  product_ids      text[] not null default '{}' check (cardinality(product_ids) <= 200),
  categories       text[] not null default '{}' check (cardinality(categories) <= 50),
  starts_at        timestamptz not null default now(),
  ends_at          timestamptz not null,
  show_banner      boolean not null default true,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  constraint campaigns_dates check (ends_at > starts_at),
  constraint campaigns_target check (all_products or cardinality(product_ids) > 0 or cardinality(categories) > 0)
);
create index if not exists campaigns_live_idx on public.campaigns (active, starts_at, ends_at);

alter table public.campaigns enable row level security;
drop policy if exists "campaigns_read" on public.campaigns;
drop policy if exists "campaigns_write" on public.campaigns;
-- Shoppers only see campaigns that are running right now; staff see all.
create policy "campaigns_read" on public.campaigns for select to anon, authenticated
  using ((active and now() >= starts_at and now() < ends_at) or public.is_staff());
create policy "campaigns_write" on public.campaigns for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Category names are matched the same way as the store does
-- (lower case, no trailing "s"): "Subscriptions" → "subscription".
create or replace function public.category_key(p text)
returns text language sql immutable
set search_path = ''
as $$ select regexp_replace(lower(trim(coalesce(p, ''))), 's$', '') $$;

-- Best running campaign for one product (used by create_order only).
create or replace function public.campaign_for(p_id text, p_type text)
returns table (pct numeric, name text)
language sql stable security definer
set search_path = ''
as $$
  select least(greatest(c.discount_percent, 0), 90), c.name
  from public.campaigns c
  where c.active and now() >= c.starts_at and now() < c.ends_at
    and (c.all_products or p_id = any (c.product_ids) or public.category_key(p_type) = any (c.categories))
  order by c.discount_percent desc, c.created_at
  limit 1;
$$;
revoke all on function public.campaign_for(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. create_order with campaign prices (everything else unchanged)
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
language plpgsql
security definer
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
  v_cpct       numeric;
  v_cname      text;
  v_line       jsonb;
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
  -- into their products at the bundle discount. Single products get the
  -- best running campaign discount (bundles keep their own discount).
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

    v_cpct := null;
    v_cname := null;
    select c.pct, c.name into v_cpct, v_cname
    from public.campaign_for(v_prod->>'id', v_prod->>'product_type') c;
    v_unit := round((v_prod->>'price')::numeric * (100 - coalesce(v_cpct, 0)) / 100, 2);

    v_subtotal := v_subtotal + v_unit * v_qty;
    v_line := jsonb_build_object(
      'id',                v_prod->'id',
      'name',              v_prod->'name',
      'price',             v_unit,
      'quantity',          v_qty,
      'image',             v_prod->'image',
      'product_type',      v_prod->'product_type',
      'subscription_days', coalesce((v_prod->>'subscription_days')::numeric::int, 0)
    );
    if v_cpct is not null then
      v_line := v_line || jsonb_build_object(
        'list_price', (v_prod->>'price')::numeric,
        'campaign',   v_cname,
        'campaign_percent', v_cpct
      );
    end if;
    v_items := v_items || jsonb_build_array(v_line);
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
-- Signed-in customers only (same as login-checkout.sql).
revoke execute on function public.create_order(text, text, text, jsonb, jsonb, text, text, text) from public, anon;
grant  execute on function public.create_order(text, text, text, jsonb, jsonb, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Daily AI drafts (5 news + 5 real job openings, approved on Telegram)
-- ---------------------------------------------------------------------
alter table public.site_settings add column if not exists ai_daily jsonb
  not null default '{"news": true, "jobs": true, "count": 3}'::jsonb;

alter table public.ai_jobs drop constraint if exists ai_jobs_kind_check;
alter table public.ai_jobs add constraint ai_jobs_kind_check
  check (kind in ('products', 'job', 'jobs_web', 'news', 'cover'));

commit;

notify pgrst, 'reload schema';
