-- Add second Home banner slot (after daily health tip).

insert into public.ad_remote_config (key, value) values
  ('ads.slots.home.tips.mode', 'house')
on conflict (key) do nothing;

-- Seed placement so existing welcome house campaign can fill the new slot.
insert into public.ad_placements (id, campaign_id, slot_id)
select 'plc_welcome_home_tips', 'camp_house_welcome', 'home.tips'
where exists (select 1 from public.ad_campaigns where id = 'camp_house_welcome' and deleted_at is null)
  and not exists (select 1 from public.ad_placements where id = 'plc_welcome_home_tips');
