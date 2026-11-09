-- notify-booking bookkeeping:
--   google_event_id  the Google Calendar event created for this booking (for later edits/cancels)
--   notified_at      set once the confirmation has been sent, so the (public) function can't
--                    be re-triggered to send duplicate emails/invites for the same booking
alter table public.bookings
  add column if not exists google_event_id text,
  add column if not exists notified_at timestamptz;
