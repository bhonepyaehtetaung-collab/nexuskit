-- =====================================================================
-- NexusKit — customers must sign in to place an order
-- ---------------------------------------------------------------------
-- Supabase Dashboard → SQL Editor → New query → paste ALL → Run.
-- Safe to run more than once.
--
-- 1. Visitors who are not signed in can no longer call create_order().
-- 2. Every new order is stored under the signed-in customer's verified
--    email, whatever email the browser sent — so nobody can place orders
--    in someone else's name, and nobody loses access to what they bought.
-- =====================================================================

begin;

revoke execute on function public.create_order(text, text, text, jsonb, jsonb, text, text, text) from anon;
grant  execute on function public.create_order(text, text, text, jsonb, jsonb, text, text, text) to authenticated;

create or replace function public.orders_force_owner_email()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text := public.current_verified_email();
begin
  if v_email is not null then
    new.customer_email := v_email;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_force_owner_email on public.orders;
create trigger orders_force_owner_email
  before insert on public.orders
  for each row execute function public.orders_force_owner_email();

commit;
