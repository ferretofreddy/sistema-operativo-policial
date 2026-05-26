-- SOP - Test Harness Operacional
-- planning_activities temporal validation
--
-- Objetivo:
--   Validar el motor temporal SQL (trigger validate_planning_activity_horario)
--   para turnos diurnos/nocturnos/24h, cruces medianoche, solapamientos y fronteras.
--
-- Seguridad:
--   - Este script NO persiste cambios.
--   - Ejecuta todo dentro de transacción y finaliza con ROLLBACK.
--
-- ============================================================================
-- MODO DE USO (Supabase SQL Editor)
-- ============================================================================
-- 1) Abrir SQL Editor en el proyecto.
-- 2) Pegar y ejecutar este script completo.
-- 3) Revisar resultado de:
--      SELECT * FROM test_results ORDER BY case_id;
-- 4) Confirmar que cada fila coincida con expected_outcome.
--
-- Resultado esperado:
--   - status = PASS en todos los casos.
--   - Las pruebas marcadas EXPECTED FAILURE deben fallar por trigger/check.
--
-- Falsos positivos posibles:
--   - Si cambió el catálogo de turnos en planning_days.
--   - Si hay validaciones adicionales nuevas en trigger.
--
-- Falsos negativos posibles:
--   - Si el trigger fue deshabilitado o reemplazado.
--   - Si el entorno no tiene datos mínimos FK (users/squads/delegations/orders/actions).

begin;

create temporary table test_results (
  case_id text primary key,
  expected_outcome text not null, -- EXPECTED SUCCESS / EXPECTED FAILURE
  actual_outcome text not null,   -- SUCCESS / FAILURE
  status text not null,           -- PASS / FAIL
  detail text
) on commit drop;

do $$
declare
  -- Contexto base tomado de datos existentes (no persistimos nada al final)
  v_delegation_id uuid;
  v_squad_id uuid;
  v_user_id uuid;
  v_order_id uuid;
  v_order_action_id uuid;

  v_plan_diurno uuid;
  v_plan_nocturno uuid;
  v_plan_24h uuid;

  v_day_diurno uuid;
  v_day_nocturno uuid;
  v_day_24h uuid;
  v_day_nocturno_n2 uuid;
  v_day_nocturno_n3 uuid;
  v_day_nocturno_n6 uuid;
  v_day_nocturno_overlap uuid;

  v_act_ok_overlap_seed uuid;
  v_seed_date date;
  v_fecha_diurno date;
  v_fecha_nocturno date;
  v_fecha_24h date;
begin
  -- --------------------------------------------------------------------------
  -- 0) Resolver contexto mínimo FK
  -- --------------------------------------------------------------------------
  select d.id into v_delegation_id from public.delegations d limit 1;
  select s.id into v_squad_id from public.squads s limit 1;
  select u.id into v_user_id from public.users u limit 1;
  select o.id into v_order_id from public.orders o limit 1;
  select oa.id into v_order_action_id
  from public.order_actions oa
  where oa.order_id = v_order_id
  limit 1;

  if v_delegation_id is null or v_squad_id is null or v_user_id is null
     or v_order_id is null or v_order_action_id is null then
    raise exception 'Contexto insuficiente para pruebas. Requiere delegations/squads/users/orders/order_actions con al menos 1 fila.';
  end if;

  -- --------------------------------------------------------------------------
  -- 1) Crear escenarios controlados (planning + planning_days)
  --    Fechas dinámicas futuras para evitar colisión con datos reales.
  -- --------------------------------------------------------------------------
  v_seed_date := current_date + (700 + floor(random() * 8000))::int;

  v_fecha_diurno := v_seed_date;
  while exists (
    select 1
    from public.planning p
    where p.squad_id = v_squad_id
      and p.fecha_inicio = v_fecha_diurno
  ) loop
    v_fecha_diurno := v_fecha_diurno + 1;
  end loop;

  v_fecha_nocturno := v_fecha_diurno + 1;
  while exists (
    select 1
    from public.planning p
    where p.squad_id = v_squad_id
      and p.fecha_inicio = v_fecha_nocturno
  ) loop
    v_fecha_nocturno := v_fecha_nocturno + 1;
  end loop;

  v_fecha_24h := v_fecha_nocturno + 1;
  while exists (
    select 1
    from public.planning p
    where p.squad_id = v_squad_id
      and p.fecha_inicio = v_fecha_24h
  ) loop
    v_fecha_24h := v_fecha_24h + 1;
  end loop;

  insert into public.planning (
    delegation_id, squad_id, supervisor_id, creado_por,
    fecha_inicio, fecha_fin, estado
  ) values (
    v_delegation_id, v_squad_id, v_user_id, v_user_id,
    v_fecha_diurno, v_fecha_diurno + 1, 'activa'
  ) returning id into v_plan_diurno;

  insert into public.planning (
    delegation_id, squad_id, supervisor_id, creado_por,
    fecha_inicio, fecha_fin, estado
  ) values (
    v_delegation_id, v_squad_id, v_user_id, v_user_id,
    v_fecha_nocturno, v_fecha_nocturno + 1, 'activa'
  ) returning id into v_plan_nocturno;

  insert into public.planning (
    delegation_id, squad_id, supervisor_id, creado_por,
    fecha_inicio, fecha_fin, estado
  ) values (
    v_delegation_id, v_squad_id, v_user_id, v_user_id,
    v_fecha_24h, v_fecha_24h + 1, 'activa'
  ) returning id into v_plan_24h;

  insert into public.planning_days (planning_id, fecha, turno, dia_numero)
  values (v_plan_diurno, v_fecha_diurno, '05:00-17:00', 1)
  returning id into v_day_diurno;

  insert into public.planning_days (planning_id, fecha, turno, dia_numero)
  values (v_plan_nocturno, v_fecha_nocturno, '17:00-05:00', 1)
  returning id into v_day_nocturno;

  -- Días nocturnos adicionales para aislar casos SUCCESS y evitar falsos negativos por solapamiento
  insert into public.planning_days (planning_id, fecha, turno, dia_numero)
  values (v_plan_nocturno, v_fecha_nocturno + 1, '17:00-05:00', 2)
  returning id into v_day_nocturno_n2;

  insert into public.planning_days (planning_id, fecha, turno, dia_numero)
  values (v_plan_nocturno, v_fecha_nocturno + 2, '17:00-05:00', 3)
  returning id into v_day_nocturno_n3;

  insert into public.planning_days (planning_id, fecha, turno, dia_numero)
  values (v_plan_nocturno, v_fecha_nocturno + 3, '17:00-05:00', 4)
  returning id into v_day_nocturno_n6;

  -- Día exclusivo para pruebas de solapamiento deliberado
  insert into public.planning_days (planning_id, fecha, turno, dia_numero)
  values (v_plan_nocturno, v_fecha_nocturno + 4, '17:00-05:00', 5)
  returning id into v_day_nocturno_overlap;

  insert into public.planning_days (planning_id, fecha, turno, dia_numero)
  values (v_plan_24h, v_fecha_24h, '00:00-23:59', 1)
  returning id into v_day_24h;

  -- --------------------------------------------------------------------------
  -- 2) Casos diurnos 05:00-17:00
  -- --------------------------------------------------------------------------

  -- D1 - EXPECTED SUCCESS
  begin
    insert into public.planning_activities (
      planning_day_id, order_id, order_action_id,
      hora_inicio, hora_fin, sector, sector_dinamico, detalle, turno, posicion
    ) values (
      v_day_diurno, v_order_id, v_order_action_id,
      '06:00', '07:00', 'SECTOR D1', 'DIN D1', 'D1', '05:00-17:00', 1
    );
    insert into test_results values ('D1', 'EXPECTED SUCCESS', 'SUCCESS', 'PASS', 'Diurno válido 06:00-07:00');
  exception when others then
    insert into test_results values ('D1', 'EXPECTED SUCCESS', 'FAILURE', 'FAIL', sqlerrm);
  end;

  -- D2 - EXPECTED FAILURE (fuera de turno por inicio < 05:00)
  begin
    insert into public.planning_activities (
      planning_day_id, order_id, order_action_id,
      hora_inicio, hora_fin, sector, sector_dinamico, detalle, turno, posicion
    ) values (
      v_day_diurno, v_order_id, v_order_action_id,
      '04:30', '05:30', 'SECTOR D2', 'DIN D2', 'D2', '05:00-17:00', 2
    );
    insert into test_results values ('D2', 'EXPECTED FAILURE', 'SUCCESS', 'FAIL', 'Debió fallar por fuera de turno');
  exception when others then
    insert into test_results values ('D2', 'EXPECTED FAILURE', 'FAILURE', 'PASS', sqlerrm);
  end;

  -- D3 - EXPECTED FAILURE (igualdad inicio/fin)
  begin
    insert into public.planning_activities (
      planning_day_id, order_id, order_action_id,
      hora_inicio, hora_fin, sector, sector_dinamico, detalle, turno, posicion
    ) values (
      v_day_diurno, v_order_id, v_order_action_id,
      '08:00', '08:00', 'SECTOR D3', 'DIN D3', 'D3', '05:00-17:00', 3
    );
    insert into test_results values ('D3', 'EXPECTED FAILURE', 'SUCCESS', 'FAIL', 'Debió fallar por igualdad');
  exception when others then
    insert into test_results values ('D3', 'EXPECTED FAILURE', 'FAILURE', 'PASS', sqlerrm);
  end;

  -- --------------------------------------------------------------------------
  -- 3) Casos nocturnos 17:00-05:00
  -- --------------------------------------------------------------------------

  -- N1 - EXPECTED SUCCESS (cruza medianoche)
  begin
    insert into public.planning_activities (
      planning_day_id, order_id, order_action_id,
      hora_inicio, hora_fin, sector, sector_dinamico, detalle, turno, posicion
    ) values (
      v_day_nocturno, v_order_id, v_order_action_id,
      '23:00', '02:00', 'SECTOR N1', 'DIN N1', 'N1', '17:00-05:00', 1
    );
    insert into test_results values ('N1', 'EXPECTED SUCCESS', 'SUCCESS', 'PASS', 'Nocturno válido 23:00-02:00');
  exception when others then
    insert into test_results values ('N1', 'EXPECTED SUCCESS', 'FAILURE', 'FAIL', sqlerrm);
  end;

  -- N2 - EXPECTED SUCCESS (después de medianoche)
  begin
    insert into public.planning_activities (
      planning_day_id, order_id, order_action_id,
      hora_inicio, hora_fin, sector, sector_dinamico, detalle, turno, posicion
    ) values (
      v_day_nocturno_n2, v_order_id, v_order_action_id,
      '00:30', '04:00', 'SECTOR N2', 'DIN N2', 'N2', '17:00-05:00', 2
    );
    insert into test_results values ('N2', 'EXPECTED SUCCESS', 'SUCCESS', 'PASS', 'Nocturno válido 00:30-04:00');
  exception when others then
    insert into test_results values ('N2', 'EXPECTED SUCCESS', 'FAILURE', 'FAIL', sqlerrm);
  end;

  -- N3 - EXPECTED SUCCESS (antes de medianoche)
  begin
    insert into public.planning_activities (
      planning_day_id, order_id, order_action_id,
      hora_inicio, hora_fin, sector, sector_dinamico, detalle, turno, posicion
    ) values (
      v_day_nocturno_n3, v_order_id, v_order_action_id,
      '18:00', '22:00', 'SECTOR N3', 'DIN N3', 'N3', '17:00-05:00', 3
    );
    insert into test_results values ('N3', 'EXPECTED SUCCESS', 'SUCCESS', 'PASS', 'Nocturno válido 18:00-22:00');
  exception when others then
    insert into test_results values ('N3', 'EXPECTED SUCCESS', 'FAILURE', 'FAIL', sqlerrm);
  end;

  -- N4 - EXPECTED FAILURE (fuera de turno)
  begin
    insert into public.planning_activities (
      planning_day_id, order_id, order_action_id,
      hora_inicio, hora_fin, sector, sector_dinamico, detalle, turno, posicion
    ) values (
      v_day_nocturno, v_order_id, v_order_action_id,
      '15:00', '16:00', 'SECTOR N4', 'DIN N4', 'N4', '17:00-05:00', 4
    );
    insert into test_results values ('N4', 'EXPECTED FAILURE', 'SUCCESS', 'FAIL', 'Debió fallar por fuera de turno');
  exception when others then
    insert into test_results values ('N4', 'EXPECTED FAILURE', 'FAILURE', 'PASS', sqlerrm);
  end;

  -- N5 - EXPECTED FAILURE (frontera inválida en nocturno: inicia exacto 05:00 y sigue)
  begin
    insert into public.planning_activities (
      planning_day_id, order_id, order_action_id,
      hora_inicio, hora_fin, sector, sector_dinamico, detalle, turno, posicion
    ) values (
      v_day_nocturno, v_order_id, v_order_action_id,
      '05:00', '05:30', 'SECTOR N5', 'DIN N5', 'N5', '17:00-05:00', 5
    );
    insert into test_results values ('N5', 'EXPECTED FAILURE', 'SUCCESS', 'FAIL', 'Debió fallar por frontera fuera de turno');
  exception when others then
    insert into test_results values ('N5', 'EXPECTED FAILURE', 'FAILURE', 'PASS', sqlerrm);
  end;

  -- N6 - EXPECTED SUCCESS (frontera 00:00)
  begin
    insert into public.planning_activities (
      planning_day_id, order_id, order_action_id,
      hora_inicio, hora_fin, sector, sector_dinamico, detalle, turno, posicion
    ) values (
      v_day_nocturno_n6, v_order_id, v_order_action_id,
      '00:00', '00:30', 'SECTOR N6', 'DIN N6', 'N6', '17:00-05:00', 6
    );
    insert into test_results values ('N6', 'EXPECTED SUCCESS', 'SUCCESS', 'PASS', 'Frontera 00:00 válida');
  exception when others then
    insert into test_results values ('N6', 'EXPECTED SUCCESS', 'FAILURE', 'FAIL', sqlerrm);
  end;

  -- --------------------------------------------------------------------------
  -- 4) Solapamientos (mismo planning_day_id nocturno exclusivo)
  -- --------------------------------------------------------------------------

  -- O1 seed - EXPECTED SUCCESS
  begin
    insert into public.planning_activities (
      planning_day_id, order_id, order_action_id,
      hora_inicio, hora_fin, sector, sector_dinamico, detalle, turno, posicion
    ) values (
      v_day_nocturno_overlap, v_order_id, v_order_action_id,
      '20:00', '21:00', 'SECTOR O1', 'DIN O1', 'O1', '17:00-05:00', 20
    ) returning id into v_act_ok_overlap_seed;
    insert into test_results values ('O1', 'EXPECTED SUCCESS', 'SUCCESS', 'PASS', 'Semilla para solapamiento');
  exception when others then
    insert into test_results values ('O1', 'EXPECTED SUCCESS', 'FAILURE', 'FAIL', sqlerrm);
  end;

  -- O2 - EXPECTED FAILURE (solapa parcialmente 20:30-21:30)
  begin
    insert into public.planning_activities (
      planning_day_id, order_id, order_action_id,
      hora_inicio, hora_fin, sector, sector_dinamico, detalle, turno, posicion
    ) values (
      v_day_nocturno_overlap, v_order_id, v_order_action_id,
      '20:30', '21:30', 'SECTOR O2', 'DIN O2', 'O2', '17:00-05:00', 21
    );
    insert into test_results values ('O2', 'EXPECTED FAILURE', 'SUCCESS', 'FAIL', 'Debió fallar por solapamiento');
  exception when others then
    insert into test_results values ('O2', 'EXPECTED FAILURE', 'FAILURE', 'PASS', sqlerrm);
  end;

  -- O3 - EXPECTED SUCCESS (adyacente en frontera: 21:00-22:00)
  begin
    insert into public.planning_activities (
      planning_day_id, order_id, order_action_id,
      hora_inicio, hora_fin, sector, sector_dinamico, detalle, turno, posicion
    ) values (
      v_day_nocturno_overlap, v_order_id, v_order_action_id,
      '21:00', '22:00', 'SECTOR O3', 'DIN O3', 'O3', '17:00-05:00', 22
    );
    insert into test_results values ('O3', 'EXPECTED SUCCESS', 'SUCCESS', 'PASS', 'No solapa: frontera exacta permitida');
  exception when others then
    insert into test_results values ('O3', 'EXPECTED SUCCESS', 'FAILURE', 'FAIL', sqlerrm);
  end;

  -- --------------------------------------------------------------------------
  -- 5) Turno 24h (00:00-23:59)
  -- --------------------------------------------------------------------------

  -- T1 - EXPECTED SUCCESS
  begin
    insert into public.planning_activities (
      planning_day_id, order_id, order_action_id,
      hora_inicio, hora_fin, sector, sector_dinamico, detalle, turno, posicion
    ) values (
      v_day_24h, v_order_id, v_order_action_id,
      '00:00', '00:30', 'SECTOR T1', 'DIN T1', 'T1', '00:00-23:59', 1
    );
    insert into test_results values ('T1', 'EXPECTED SUCCESS', 'SUCCESS', 'PASS', '24h frontera inicio');
  exception when others then
    insert into test_results values ('T1', 'EXPECTED SUCCESS', 'FAILURE', 'FAIL', sqlerrm);
  end;

  -- T2 - EXPECTED FAILURE (cruce medianoche no permitido en mismo día 24h)
  begin
    insert into public.planning_activities (
      planning_day_id, order_id, order_action_id,
      hora_inicio, hora_fin, sector, sector_dinamico, detalle, turno, posicion
    ) values (
      v_day_24h, v_order_id, v_order_action_id,
      '23:30', '00:30', 'SECTOR T2', 'DIN T2', 'T2', '00:00-23:59', 2
    );
    insert into test_results values ('T2', 'EXPECTED FAILURE', 'SUCCESS', 'FAIL', 'Debió fallar por cruce fuera de turno 24h');
  exception when others then
    insert into test_results values ('T2', 'EXPECTED FAILURE', 'FAILURE', 'PASS', sqlerrm);
  end;
end
$$;

-- ============================================================================
-- Reporte final
-- ============================================================================
select * from test_results order by case_id;

select
  count(*) as total_cases,
  count(*) filter (where status = 'PASS') as passed_cases,
  count(*) filter (where status = 'FAIL') as failed_cases
from test_results;

-- IMPORTANT: no persistir datos de prueba
rollback;
