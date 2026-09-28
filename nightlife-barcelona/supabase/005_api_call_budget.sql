-- Tope de gasto diario para las llamadas de pago a Google Places.
-- Pégalo entero en Supabase → SQL Editor → Run, una sola vez.

create table if not exists api_call_budget (
  day date primary key,
  calls_used integer not null default 0
);

create or replace function increment_daily_calls(p_day date, p_n integer)
returns void
language plpgsql
as $$
begin
  insert into api_call_budget (day, calls_used)
  values (p_day, p_n)
  on conflict (day) do update
    set calls_used = api_call_budget.calls_used + excluded.calls_used;
end;
$$;

alter table api_call_budget enable row level security;

-- El service role (el que usan los crons) se salta RLS por defecto, así que no hace
-- falta ninguna policy adicional para que esto funcione.
