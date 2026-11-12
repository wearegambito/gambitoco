-- The visitor's own timezone (IANA name from their browser, e.g. "Europe/London"), captured by /book.
-- Confirmation + reminder emails show the session time in this zone; the admin shows it as reference.
-- Null for bookings made before this existed (emails fall back to booking_timezone).
alter table public.bookings add column if not exists timezone text;

drop function if exists public.book_slot(uuid, text, text, text, text, text);

create or replace function public.book_slot(
  p_slot_id uuid, p_name text, p_email text,
  p_company text default '', p_notes text default '', p_hp text default '', p_timezone text default ''
) returns json
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_slot booking_slots%rowtype;
  v_booking_id uuid;
  v_tz text := nullif(trim(coalesce(p_timezone, '')), '');
begin
  -- spam honeypot: pretend success, do nothing
  if coalesce(trim(p_hp), '') <> '' then
    return json_build_object('ok', true, 'booking_id', gen_random_uuid());
  end if;

  if coalesce(trim(p_name), '') = '' then
    return json_build_object('ok', false, 'error', 'Please enter your name.');
  end if;
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return json_build_object('ok', false, 'error', 'Please enter a valid email.');
  end if;
  if length(coalesce(p_notes, '')) > 2000 or length(coalesce(p_name, '')) > 200 then
    return json_build_object('ok', false, 'error', 'That input is too long.');
  end if;
  -- only keep a real IANA zone name; anything else is dropped (never blocks the booking)
  if v_tz is not null and (length(v_tz) > 64 or not exists (select 1 from pg_timezone_names where name = v_tz)) then
    v_tz := null;
  end if;

  select * into v_slot from booking_slots where id = p_slot_id for update;
  if not found then
    return json_build_object('ok', false, 'error', 'That time is no longer available.');
  end if;
  if v_slot.status <> 'available' then
    return json_build_object('ok', false, 'error', 'Sorry — that time was just taken. Please pick another.');
  end if;
  if v_slot.start_time <= now() then
    return json_build_object('ok', false, 'error', 'That time has already passed.');
  end if;

  update booking_slots set status = 'booked' where id = p_slot_id;
  insert into bookings (slot_id, start_time, name, email, company, notes, timezone)
    values (p_slot_id, v_slot.start_time, trim(p_name), lower(trim(p_email)), coalesce(trim(p_company), ''), coalesce(p_notes, ''), v_tz)
    returning id into v_booking_id;

  return json_build_object('ok', true, 'booking_id', v_booking_id, 'start_time', v_slot.start_time, 'duration', v_slot.duration_minutes);
end;
$function$;

grant execute on function public.book_slot(uuid, text, text, text, text, text, text) to anon, authenticated;
