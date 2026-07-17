-- Period Tracker mini-app: banner slots before the weekly calendar and before
-- the "Log period days" CTA. Default mode house; portal can set off | house | sponsored | admob.

insert into public.ad_remote_config (key, value) values
  ('ads.slots.period.week.mode', 'house'),
  ('ads.slots.period.footer.mode', 'house')
on conflict (key) do nothing;

insert into public.ad_placements (id, campaign_id, slot_id)
select 'plc_welcome_period_week', 'camp_house_welcome', 'period.week'
where exists (
    select 1
    from public.ad_campaigns
    where id = 'camp_house_welcome' and deleted_at is null
  )
  and not exists (
    select 1
    from public.ad_placements
    where campaign_id = 'camp_house_welcome' and slot_id = 'period.week'
  );

insert into public.ad_placements (id, campaign_id, slot_id)
select 'plc_welcome_period_footer', 'camp_house_welcome', 'period.footer'
where exists (
    select 1
    from public.ad_campaigns
    where id = 'camp_house_welcome' and deleted_at is null
  )
  and not exists (
    select 1
    from public.ad_placements
    where campaign_id = 'camp_house_welcome' and slot_id = 'period.footer'
  );
