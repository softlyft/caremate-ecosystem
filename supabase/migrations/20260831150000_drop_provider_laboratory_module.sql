-- Retire portal laboratory workflow module. Labs share results via Documents (lab_result PDFs).

delete from public.provider_org_modules
where module_key = 'laboratory';

drop table if exists public.lab_order_items cascade;
drop table if exists public.lab_orders cascade;
drop table if exists public.lab_test_definitions cascade;
