-- SOP - Fix temporal operacional para sheet_activities
-- Fecha: 2026-05-26
--
-- Objetivo:
--   Extender el motor temporal operacional a hojas de servicio, alineado con
--   planning_activities (turnos nocturnos, cruces medianoche y solapamientos).

begin;

-- ============================================================================
-- A) Remover solo el CHECK legacy lineal problemático
-- ============================================================================
alter table public.sheet_activities
  drop constraint if exists sheet_activities_horario_check;

-- ============================================================================
-- B) CHECK mínimo de integridad horaria (equivalente a planning_activities)
-- ============================================================================
alter table public.sheet_activities
  add constraint sheet_activities_horario_check
  check (
    hora_inicio is not null
    and hora_fin is not null
    and hora_inicio <> hora_fin
  );

-- ============================================================================
-- C) Helpers temporales compartidos (reutilizables)
-- ============================================================================
create or replace function public.sop_time_to_minutes(p_time time)
returns integer
language sql
immutable
as $$
  select extract(hour from p_time)::int * 60 + extract(minute from p_time)::int;
$$;

create or replace function public.sop_operational_window(p_turno text)
returns table(turn_start integer, turn_end integer, crosses_midnight boolean)
language sql
immutable
as $$
  select
    case p_turno
      when '05:00-17:00' then 5 * 60
      when '17:00-05:00' then 17 * 60
      when '00:00-23:59' then 0
      else null
    end as turn_start,
    case p_turno
      when '05:00-17:00' then 17 * 60
      when '17:00-05:00' then (5 * 60) + 1440
      when '00:00-23:59' then (23 * 60) + 59
      else null
    end as turn_end,
    case p_turno
      when '17:00-05:00' then true
      when '05:00-17:00' then false
      when '00:00-23:59' then false
      else null
    end as crosses_midnight;
$$;

create or replace function public.sop_normalize_minutes(
  p_minutes integer,
  p_turn_start integer,
  p_crosses_midnight boolean
)
returns integer
language sql
immutable
as $$
  select case
    when p_crosses_midnight and p_minutes < p_turn_start then p_minutes + 1440
    else p_minutes
  end;
$$;

-- ============================================================================
-- D) Trigger operacional para sheet_activities
--    Fuente de turno: service_sheets.planning_day_id -> planning_days.turno
--    Solapamiento: por service_sheet_id
-- ============================================================================
create or replace function public.validate_sheet_activity_horario()
returns trigger
language plpgsql
as $$
declare
  v_turno text;
  v_turn_start int;
  v_turn_end int;
  v_crosses_midnight boolean;

  v_start_new int;
  v_end_new int;

  v_row record;
  v_start_existing int;
  v_end_existing int;
begin
  -- Obtener turno operacional oficial desde planning_day asociado a la hoja.
  select pd.turno
    into v_turno
  from public.service_sheets ss
  join public.planning_days pd on pd.id = ss.planning_day_id
  where ss.id = new.service_sheet_id;

  if v_turno is null then
    raise exception using
      errcode = '23514',
      message = 'No se pudo resolver turno operativo desde service_sheets.planning_day_id';
  end if;

  select w.turn_start, w.turn_end, w.crosses_midnight
    into v_turn_start, v_turn_end, v_crosses_midnight
  from public.sop_operational_window(v_turno) w;

  if v_turn_start is null or v_turn_end is null or v_crosses_midnight is null then
    raise exception using
      errcode = '23514',
      message = format('Turno no soportado: %s', v_turno);
  end if;

  v_start_new := public.sop_time_to_minutes(new.hora_inicio);
  v_end_new := public.sop_time_to_minutes(new.hora_fin);

  if v_start_new = v_end_new then
    raise exception using
      errcode = '23514',
      message = 'hora_inicio y hora_fin no pueden ser iguales';
  end if;

  v_start_new := public.sop_normalize_minutes(v_start_new, v_turn_start, v_crosses_midnight);
  v_end_new := public.sop_normalize_minutes(v_end_new, v_turn_start, v_crosses_midnight);

  if v_crosses_midnight and v_end_new <= v_start_new then
    v_end_new := v_end_new + 1440;
  end if;

  if v_end_new <= v_start_new then
    raise exception using
      errcode = '23514',
      message = 'Rango horario inconsistente: hora_fin debe ser posterior a hora_inicio';
  end if;

  -- Debe quedar dentro de la ventana del turno.
  if v_start_new < v_turn_start or v_end_new > v_turn_end then
    raise exception using
      errcode = '23514',
      message = format(
        'Actividad fuera del turno operacional %s (%s -> %s)',
        v_turno,
        new.hora_inicio::text,
        new.hora_fin::text
      );
  end if;

  -- Solapamiento dentro de la misma hoja de servicio.
  for v_row in
    select sa.id, sa.hora_inicio, sa.hora_fin
    from public.sheet_activities sa
    where sa.service_sheet_id = new.service_sheet_id
      and sa.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  loop
    v_start_existing := public.sop_time_to_minutes(v_row.hora_inicio);
    v_end_existing := public.sop_time_to_minutes(v_row.hora_fin);

    v_start_existing := public.sop_normalize_minutes(
      v_start_existing, v_turn_start, v_crosses_midnight
    );
    v_end_existing := public.sop_normalize_minutes(
      v_end_existing, v_turn_start, v_crosses_midnight
    );

    if v_crosses_midnight and v_end_existing <= v_start_existing then
      v_end_existing := v_end_existing + 1440;
    end if;

    -- Intervalos semiabiertos [inicio, fin): fronteras contiguas permitidas.
    if v_start_new < v_end_existing and v_start_existing < v_end_new then
      raise exception using
        errcode = '23514',
        message = format(
          'Solapamiento horario con actividad %s en service_sheet_id %s',
          v_row.id,
          new.service_sheet_id
        );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_validate_sheet_activity_horario
  on public.sheet_activities;

create trigger trg_validate_sheet_activity_horario
before insert or update on public.sheet_activities
for each row
execute function public.validate_sheet_activity_horario();

commit;
