-- =====================================================================
-- NexusKit — editable storefront text, custom categories, AI post covers
-- ---------------------------------------------------------------------
-- Run AFTER security.sql, features.sql and ai.sql.
-- Supabase Dashboard → SQL Editor → New query → paste ALL → Run.
-- Safe to run more than once.
-- =====================================================================

begin;

-- 1. Store text the admin can change: { "home.heroTitle": { "my": "…", "en": "…" }, … }
--    (site_settings is already readable by everyone and writable only by super_admin.)
alter table public.site_settings add column if not exists ui_text jsonb not null default '{}'::jsonb;

-- 2. Category display options (names shown to customers, picture, order, hide)
alter table public.product_categories add column if not exists label_my   text;
alter table public.product_categories add column if not exists label_en   text;
alter table public.product_categories add column if not exists image      text;
alter table public.product_categories add column if not exists sort_order int not null default 0;
alter table public.product_categories add column if not exists hidden     boolean not null default false;

alter table public.product_categories drop constraint if exists product_categories_image_https;
alter table public.product_categories add constraint product_categories_image_https
  check (image is null or image ~ '^https://');
alter table public.product_categories drop constraint if exists product_categories_label_len;
alter table public.product_categories add constraint product_categories_label_len
  check (char_length(coalesce(label_my, '')) <= 60 and char_length(coalesce(label_en, '')) <= 60);

-- 3. AI jobs can also draw a cover picture for an existing Hub post
alter table public.ai_jobs drop constraint if exists ai_jobs_kind_check;
alter table public.ai_jobs add constraint ai_jobs_kind_check
  check (kind in ('products', 'job', 'news', 'cover'));

commit;

-- Make the API notice the new columns right away.
notify pgrst, 'reload schema';
