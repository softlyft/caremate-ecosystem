-- Pregnancy Tracker mini-app: banner slots before the timeline card and before the
-- "update due date" CTA. Default mode house; portal can set off | house | sponsored | admob.

insert into public.ad_remote_config (key, value) values
  ('ads.slots.pregnancy.timeline.mode', 'house'),
  ('ads.slots.pregnancy.footer.mode', 'house')
on conflict (key) do nothing;

insert into public.ad_placements (id, campaign_id, slot_id)
select 'plc_welcome_pregnancy_timeline', 'camp_house_welcome', 'pregnancy.timeline'
where exists (select 1 from public.ad_campaigns where id = 'camp_house_welcome' and deleted_at is null)
  and not exists (
    select 1 from public.ad_placements
    where campaign_id = 'camp_house_welcome' and slot_id = 'pregnancy.timeline'
  );

insert into public.ad_placements (id, campaign_id, slot_id)
select 'plc_welcome_pregnancy_footer', 'camp_house_welcome', 'pregnancy.footer'
where exists (select 1 from public.ad_campaigns where id = 'camp_house_welcome' and deleted_at is null)
  and not exists (
    select 1 from public.ad_placements
    where campaign_id = 'camp_house_welcome' and slot_id = 'pregnancy.footer'
  );
