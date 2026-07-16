-- Nearby provider detail: banner before contact card.

insert into public.ad_remote_config (key, value) values
  ('ads.slots.nearby.provider.mode', 'house')
on conflict (key) do nothing;

insert into public.ad_placements (id, campaign_id, slot_id)
select 'plc_welcome_nearby_provider', 'camp_house_welcome', 'nearby.provider'
where exists (select 1 from public.ad_campaigns where id = 'camp_house_welcome' and deleted_at is null)
  and not exists (
    select 1 from public.ad_placements
    where campaign_id = 'camp_house_welcome' and slot_id = 'nearby.provider'
  );
