-- 1-hour-before reminders for booked Gameplan Sessions.
-- A pg_cron job runs every 5 minutes, finds bookings starting within the next hour that haven't been
-- reminded, and posts each to the notify-booking edge function with { remind: true }. The function
-- re-validates that the booking is due and claims it (bookings.reminded_at), so it's safe to call
-- without credentials and can never send a reminder twice. (bookings.reminded_at: migration
-- booking_reminded_at, applied alongside 0006.)
alter table public.bookings add column if not exists reminded_at timestamptz;

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.send_booking_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0;
begin
  for r in
    select id from public.bookings
    where reminded_at is null
      and start_time > now() and start_time <= now() + interval '1 hour'
      and start_time - created_at > interval '1 hour'   -- booked inside the last hour: the confirmation is enough
  loop
    perform net.http_post(
      url := 'https://wtzklaumnzezgzgzllgn.supabase.co/functions/v1/notify-booking',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('booking_id', r.id, 'remind', true)
    );
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.send_booking_reminders() from public, anon, authenticated;

select cron.schedule('booking-reminders', '*/5 * * * *', 'select public.send_booking_reminders()');
