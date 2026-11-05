begin;
-- A professional can see the approved snapshot's paused state in their own setup.
create policy sa_pro_listing_owner on public.sa_pro_public_profiles for select to authenticated using(owner_id=(select auth.uid()));
commit;
