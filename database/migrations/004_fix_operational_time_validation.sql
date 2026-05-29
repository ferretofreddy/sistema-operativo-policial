-- SOP - Fix validación horaria operativa para planning_activities
-- Fecha: 2026-05-25
--
-- Objetivo:
--   1) Remover CHECK lineal legacy incompatible con turnos nocturnos.
--   2) Mantener integridad mínima horaria.
--   3) Implementar validación operacional real (turno + solapamiento)
--      vía trigger BEFORE INSERT/UPDATE.

begin;

-- ============================================================================
-- A) Remover solamente el CHECK lineal legacy problemático
-- ============================================================================
alter table public.planning_activities
  drop constraint if exists planning_activities_horario_check;

-- ============================================================================
-- B) Integridad mínima obligatoria
-- ============================================================================
alter table public.planning_activities
  add constraint planning_activities_horario_check
  check (
    hora_inicio is not null
    and hora_fin is not null
    and hora_inicio <> hora_fin
  );

-- ============================================================================
-- C) Motor de validación operacional (turno + rango + solapamiento)
-- ============================================================================
create or replace function public.validate_planning_activity_horario()
returns trigger
language plpgsql
as $$
declare
  v_turno text;
  v_start_new int;
  v_end_new int;
  v_turn_start int;
  v_turn_end int;
  v_crosses_midnight boolean;
  v_row record;
  v_start_existing int;
  v_end_existing int;
begin
  -- Turno oficial del día (source of truth)
  select pd.turno
    into v_turno
  from public.planning_days pd
  where pd.id = new.planning_day_id;

  if v_turno is null then
    raise exception using
      errcode = '23514',
      message = 'planning_day_id sin turno válido para validar horario operacional';
  end if;

  -- Parse HH:MM -> minutos
  v_start_new := extract(hour from new.hora_inicio)::int * 60
               + extract(minute from new.hora_inicio)::int;
  v_end_new := extract(hour from new.hora_fin)::int * 60
             + extract(minute from new.hora_fin)::int;

  if v_start_new = v_end_new then
    raise exception using
      errcode = '23514',
      message = 'hora_inicio y hora_fin no pueden ser iguales';
  end if;

  -- Catálogo vigente de turnos
  if v_turno = '05:00-17:00' then
    v_turn_start := 5 * 60;
    v_turn_end := 17 * 60;
    v_crosses_midnight := false;
  elsif v_turno = '17:00-05:00' then
    v_turn_start := 17 * 60;
    -- eje extendido al día siguiente
    v_turn_end := (5 * 60) + 1440;
    v_crosses_midnight := true;
  elsif v_turno = '00:00-23:59' then
    v_turn_start := 0;
    v_turn_end := (23 * 60) + 59;
    v_crosses_midnight := false;
  else
    raise exception using
      errcode = '23514',
      message = format('Turno no soportado: %s', v_turno);
  end if;

  -- Normalización en eje continuo para turnos nocturnos
  if v_crosses_midnight then
    if v_start_new < v_turn_start then
      v_start_new := v_start_new + 1440;
    end if;
    if v_end_new < v_turn_start then
      v_end_new := v_end_new + 1440;
    end if;
    if v_end_new <= v_start_new then
      v_end_new := v_end_new + 1440;
    end if;
  end if;

  -- Rango consistente
  if v_end_new <= v_start_new then
    raise exception using
      errcode = '23514',
      message = 'Rango horario inconsistente: hora_fin debe ser posterior a hora_inicio';
  end if;

  -- Dentro del turno del día
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

  -- Validación de solapamiento: mismo planning_day_id
  for v_row in
    select pa.id, pa.hora_inicio, pa.hora_fin
    from public.planning_activities pa
    where pa.planning_day_id = new.planning_day_id
      and pa.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  loop
    v_start_existing := extract(hour from v_row.hora_inicio)::int * 60
                      + extract(minute from v_row.hora_inicio)::int;
    v_end_existing := extract(hour from v_row.hora_fin)::int * 60
                    + extract(minute from v_row.hora_fin)::int;

    if v_crosses_midnight then
      if v_start_existing < v_turn_start then
        v_start_existing := v_start_existing + 1440;
      end if;
      if v_end_existing < v_turn_start then
        v_end_existing := v_end_existing + 1440;
      end if;
      if v_end_existing <= v_start_existing then
        v_end_existing := v_end_existing + 1440;
      end if;
    end if;

    -- Intervalos semiabiertos [inicio, fin): evita falsos positivos en frontera
    if v_start_new < v_end_existing and v_start_existing < v_end_new then
      raise exception using
        errcode = '23514',
        message = format(
          'Solapamiento horario con actividad %s en planning_day_id %s',
          v_row.id,
          new.planning_day_id
        );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_validate_planning_activity_horario
  on public.planning_activities;

create trigger trg_validate_planning_activity_horario
before insert or update on public.planning_activities
for each row
execute function public.validate_planning_activity_horario();

commit;
