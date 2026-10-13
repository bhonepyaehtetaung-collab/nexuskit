-- =====================================================================
-- NexusKit — Database security migration
-- ---------------------------------------------------------------------
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste this
-- whole file → Run. It runs inside one transaction: if anything fails,
-- nothing is changed.
--
-- WHAT IT DOES
--  1. Adds the columns the app now uses (safe to re-run).
--  2. Removes ALL old Row Level Security policies on the app tables and on
--     storage objects, then turns RLS on and creates strict new ones.
--  3. Customers can no longer write to `orders` directly. Orders are created
--     only through `create_order()`, which looks up prices in the database
--     (the browser can no longer choose the price).
--  4. Payment slips go to a new PRIVATE bucket `payment-slips`. Only staff
--     can view them (through short-lived signed links).
--  5. Admin access is decided by the `team_members` table + a confirmed
--     email, enforced inside the database — not only in the browser.
--
-- BEFORE YOU RUN
--  * Make sure YOUR email is in `team_members` with role = 'super_admin',
--    otherwise you will lock yourself out of the admin panel.
--  * Authentication → Providers → Email: keep "Confirm email" ON.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Columns used by the app
-- ---------------------------------------------------------------------
alter table public.orders add column if not exists customer_name    text;
alter table public.orders add column if not exists customer_email   text;
alter table public.orders add column if not exists order_note       text;
alter table public.orders add column if not exists items            jsonb;
alter table public.orders add column if not exists slip_url         text;
alter table public.orders add column if not exists admin_note       text;
alter table public.orders add column if not exists start_date       timestamptz;
alter table public.orders add column if not exists payment_method   text;
alter table public.orders add column if not exists promo_code       text;
alter table public.orders add column if not exists discount_percent numeric default 0;
alter table public.orders add column if not exists subtotal_amount  numeric;

create index if not exists orders_customer_email_idx on public.orders (lower(customer_email));
create index if not exists team_members_email_idx    on public.team_members (lower(email));

-- ---------------------------------------------------------------------
-- 2. Identity helpers (SECURITY DEFINER = they can read auth.users and
--    team_members without being blocked by RLS themselves)
-- ---------------------------------------------------------------------

-- The signed-in user's email, ONLY if that email has been confirmed.
create or replace function public.current_verified_email()
returns text
language sql stable security definer
set search_path = ''
as $$
  select lower(u.email)
  from auth.users u
  where u.id = auth.uid()
    and u.email_confirmed_at is not null
$$;

-- 'super_admin' | 'manager' | 'editor' | null
create or replace function public.staff_role()
returns text
language sql stable security definer
set search_path = ''
as $$
  select t.role
  from public.team_members t
  where lower(t.email) = public.current_verified_email()
  limit 1
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(public.staff_role() in ('super_admin', 'manager', 'editor'), false)
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(public.staff_role() = 'super_admin', false)
$$;

-- ---------------------------------------------------------------------
-- 3. Remove every old policy on the app tables (old "allow all" policies
--    would otherwise keep the doors open — Postgres OR-s policies together)
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('orders', 'products', 'team_members', 'site_settings',
                        'payment_methods', 'promo_codes', 'product_categories',
                        'customer_info_fields')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table public.orders               enable row level security;
alter table public.products             enable row level security;
alter table public.team_members         enable row level security;
alter table public.site_settings        enable row level security;
alter table public.payment_methods      enable row level security;
alter table public.promo_codes          enable row level security;
alter table public.product_categories   enable row level security;
alter table public.customer_info_fields enable row level security;

-- ---------------------------------------------------------------------
-- 4. Table policies
-- ---------------------------------------------------------------------

-- Public catalogue: everyone can read, staff can write.
create policy "catalog_read"   on public.products for select to anon, authenticated using (true);
create policy "catalog_insert" on public.products for insert to authenticated with check (public.is_staff());
create policy "catalog_update" on public.products for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "catalog_delete" on public.products for delete to authenticated using (public.is_staff());

create policy "categories_read"   on public.product_categories for select to anon, authenticated using (true);
create policy "categories_insert" on public.product_categories for insert to authenticated with check (public.is_staff());
create policy "categories_update" on public.product_categories for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "categories_delete" on public.product_categories for delete to authenticated using (public.is_staff());

create policy "info_fields_read"   on public.customer_info_fields for select to anon, authenticated using (true);
create policy "info_fields_insert" on public.customer_info_fields for insert to authenticated with check (public.is_staff());
create policy "info_fields_update" on public.customer_info_fields for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "info_fields_delete" on public.customer_info_fields for delete to authenticated using (public.is_staff());

-- Store settings + payment methods: everyone reads, only super_admin writes.
create policy "settings_read"   on public.site_settings for select to anon, authenticated using (true);
create policy "settings_insert" on public.site_settings for insert to authenticated with check (public.is_super_admin());
create policy "settings_update" on public.site_settings for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy "payment_methods_read"   on public.payment_methods for select to anon, authenticated using (true);
create policy "payment_methods_insert" on public.payment_methods for insert to authenticated with check (public.is_super_admin());
create policy "payment_methods_update" on public.payment_methods for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy "payment_methods_delete" on public.payment_methods for delete to authenticated using (public.is_super_admin());

-- Promo codes are secret: only staff can list them. Customers check a code
-- through check_promo_code() below.
create policy "promos_read"   on public.promo_codes for select to authenticated using (public.is_staff());
create policy "promos_insert" on public.promo_codes for insert to authenticated with check (public.is_staff());
create policy "promos_update" on public.promo_codes for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "promos_delete" on public.promo_codes for delete to authenticated using (public.is_staff());

-- Orders: a customer sees only orders placed with their confirmed email.
-- Nobody inserts directly (create_order() does it). Only staff update.
create policy "orders_read" on public.orders for select to authenticated
  using (public.is_staff() or lower(customer_email) = public.current_verified_email());
create policy "orders_update" on public.orders for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "orders_delete" on public.orders for delete to authenticated
  using (public.staff_role() in ('super_admin', 'manager'));

-- Team: you can see your own row; only super_admin manages the team.
create policy "team_read" on public.team_members for select to authenticated
  using (public.is_super_admin() or lower(email) = public.current_verified_email());
create policy "team_insert" on public.team_members for insert to authenticated with check (public.is_super_admin());
create policy "team_update" on public.team_members for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy "team_delete" on public.team_members for delete to authenticated using (public.is_super_admin());

-- ---------------------------------------------------------------------
-- 5. Storage
-- ---------------------------------------------------------------------
-- Private bucket for payment slips: max 5 MB, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-slips', 'payment-slips', false, 5242880,
        array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Product images stay in the public `products` bucket, but only staff
-- may upload / change / delete there.
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
 where id = 'products';

-- Remove every old storage policy (this project only uses the buckets above).
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

-- Anyone may UPLOAD a slip (needed at checkout), with a random file name.
-- Nobody but staff may READ or LIST slips.
create policy "slips_upload" on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'payment-slips'
    and name ~ '^[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$'
  );
create policy "slips_staff_read" on storage.objects for select to authenticated
  using (bucket_id = 'payment-slips' and public.is_staff());
create policy "slips_staff_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'payment-slips' and public.staff_role() in ('super_admin', 'manager'));

create policy "product_images_staff_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'products' and public.is_staff());
create policy "product_images_staff_update" on storage.objects for update to authenticated
  using (bucket_id = 'products' and public.is_staff())
  with check (bucket_id = 'products' and public.is_staff());
create policy "product_images_staff_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'products' and public.is_staff());

-- ---------------------------------------------------------------------
-- 6. Checkout functions
-- ---------------------------------------------------------------------

-- Returns the discount % for a code, or null if it does not exist.
create or replace function public.check_promo_code(p_code text)
returns numeric
language sql stable security definer
set search_path = ''
as $$
  select least(greatest(coalesce(pc.discount_percent, 0), 0), 100)
  from public.promo_codes pc
  where upper(pc.code) = upper(trim(p_code))
  limit 1
$$;

-- Creates an order. Prices ALWAYS come from the products table.
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

  -- Price every line from the database
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item->>'quantity', '') !~ '^[0-9]{1,2}$' then
      raise exception 'INVALID_QUANTITY';
    end if;
    v_qty := (v_item->>'quantity')::int;
    if v_qty < 1 then
      raise exception 'INVALID_QUANTITY';
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

-- Customer uploads a slip for an order that is waiting for payment.
create or replace function public.submit_payment_slip(p_order_id text, p_slip_path text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text := public.current_verified_email();
  v_row   jsonb;
begin
  if v_email is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if coalesce(p_slip_path, '') !~ '^[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$' then
    raise exception 'SLIP_REQUIRED';
  end if;
  begin
    if not exists (select 1 from storage.objects o
                   where o.bucket_id = 'payment-slips' and o.name = p_slip_path) then
      raise exception 'SLIP_REQUIRED';
    end if;
  exception when insufficient_privilege then
    null; -- storage not readable here; the upload was already checked by the API
  end;
  if exists (select 1 from public.orders o where o.slip_url = p_slip_path) then
    raise exception 'SLIP_ALREADY_USED';
  end if;

  update public.orders o
     set slip_url = p_slip_path,
         status   = 'pending'
   where o.id::text = p_order_id
     and lower(o.customer_email) = v_email
     and o.status = 'awaiting_payment'
  returning jsonb_build_object(
    'id', o.id::text,
    'customer_name', o.customer_name,
    'customer_email', o.customer_email,
    'total_amount', o.total_amount
  ) into v_row;

  if v_row is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  return v_row;
end;
$$;

revoke all on function public.create_order(text, text, text, jsonb, jsonb, text, text, text) from public;
revoke all on function public.submit_payment_slip(text, text) from public;
revoke all on function public.check_promo_code(text) from public;
grant execute on function public.create_order(text, text, text, jsonb, jsonb, text, text, text) to authenticated;
grant execute on function public.submit_payment_slip(text, text) to authenticated;
grant execute on function public.check_promo_code(text) to anon, authenticated;

commit;

-- =====================================================================
-- AFTER RUNNING — quick checks (run these one by one):
--
--   select public.staff_role();          -- run while NOT logged in → null
--   select * from pg_policies where schemaname in ('public','storage');
--
-- Old payment slips uploaded before this change are still in the PUBLIC
-- `products` bucket (file names start with "slip_"). Move or delete them in
-- Storage → products when you have checked them.
-- =====================================================================
