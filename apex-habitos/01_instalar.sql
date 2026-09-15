-- Mi dia: instalar UNA vez mediante SQL Workshop > SQL Scripts.
-- Base para APEX; no es un export de App Builder.
-- No ejecutar en un esquema que ya contenga objetos MD_*.
-- Las escrituras personales se hacen en una sesion APEX autenticada.

create table md_perfiles (
  usuario varchar2(255 char) primary key,
  creado_en timestamp with time zone default systimestamp not null
);

create sequence md_habitos_seq;
create sequence md_tareas_seq;
create sequence md_notas_seq;

create table md_habitos (
  id number primary key,
  usuario varchar2(255 char) not null references md_perfiles(usuario),
  titulo varchar2(150 char) not null,
  descripcion varchar2(2000 char),
  fecha_inicio date not null,
  fecha_fin date,
  creado_en timestamp with time zone default systimestamp not null,
  constraint md_habitos_fechas_ck check (
    fecha_inicio = trunc(fecha_inicio) and
    (fecha_fin is null or (fecha_fin >= fecha_inicio and fecha_fin = trunc(fecha_fin)))
  )
);
create index md_habitos_usuario_ix on md_habitos(usuario);

-- Periodos inclusivos. Cambiar una frecuencia no reescribe el pasado.
create table md_agendas (
  habito_id number not null references md_habitos(id),
  desde date not null,
  hasta date,
  dias varchar2(30 char) not null,
  constraint md_agendas_pk primary key (habito_id, desde),
  constraint md_agendas_fechas_ck check (
    desde = trunc(desde) and
    (hasta is null or (hasta >= desde and hasta = trunc(hasta)))
  ),
  constraint md_agendas_dias_ck check (regexp_like(dias, '^[1-7](,[1-7])*$'))
);

create table md_registros (
  habito_id number not null references md_habitos(id),
  fecha date not null,
  estado varchar2(20 char) not null,
  detalle varchar2(2000 char),
  actualizado_en timestamp with time zone default systimestamp not null,
  constraint md_registros_pk primary key (habito_id, fecha),
  constraint md_registros_estado_ck check (estado in ('PENDIENTE','COMPLETADO','NO_COMPLETADO')),
  constraint md_registros_fecha_ck check (fecha = trunc(fecha))
);

create table md_tareas (
  id number primary key,
  usuario varchar2(255 char) not null references md_perfiles(usuario),
  titulo varchar2(150 char) not null,
  descripcion varchar2(2000 char),
  fecha_limite date,
  estado varchar2(20 char) default 'PENDIENTE' not null,
  completado_en timestamp with time zone,
  actualizado_en timestamp with time zone default systimestamp not null,
  constraint md_tareas_estado_ck check (estado in ('PENDIENTE','EN_CURSO','COMPLETADO')),
  constraint md_tareas_fecha_ck check (fecha_limite = trunc(fecha_limite)),
  constraint md_tareas_completo_ck check (
    (estado = 'COMPLETADO' and completado_en is not null) or
    (estado <> 'COMPLETADO' and completado_en is null)
  )
);
create index md_tareas_usuario_ix on md_tareas(usuario, fecha_limite);

create table md_notas (
  id number primary key,
  usuario varchar2(255 char) not null references md_perfiles(usuario),
  titulo varchar2(150 char) not null,
  contenido clob,
  actualizado_en timestamp with time zone default systimestamp not null
);
create index md_notas_usuario_ix on md_notas(usuario);

create or replace package md_api authid definer as
  function usuario return varchar2;
  function hoy return date;
  procedure iniciar;
  procedure guardar_habito(p_id number, p_titulo varchar2, p_descripcion varchar2, p_dias varchar2);
  procedure archivar_habito(p_id number);
  procedure registrar(p_habito_id number, p_fecha date, p_estado varchar2, p_detalle varchar2);
  function racha(p_habito_id number) return number;
  procedure guardar_tarea(p_id number, p_titulo varchar2, p_descripcion varchar2, p_fecha_limite date, p_estado varchar2);
  procedure eliminar_tarea(p_id number);
  procedure guardar_nota(p_id number, p_titulo varchar2, p_contenido clob);
  procedure eliminar_nota(p_id number);
end md_api;
/

create or replace package body md_api as
  function usuario return varchar2 is
    l_usuario varchar2(255) := sys_context('APEX$SESSION', 'APP_USER');
  begin
    if l_usuario is null or upper(l_usuario) in ('NOBODY','APEX_PUBLIC_USER','ANONYMOUS')
       or not apex_authentication.is_authenticated then
      raise_application_error(-20001, 'Inicia sesion para acceder a tus datos.');
    end if;
    return l_usuario;
  end;

  function hoy return date is
  begin
    return trunc(cast(systimestamp at time zone 'America/Panama' as date));
  end;

  procedure validar_titulo(p_titulo varchar2) is
  begin
    if trim(p_titulo) is null or length(trim(p_titulo)) > 150 then
      raise_application_error(-20002, 'Escribe un titulo de 1 a 150 caracteres.');
    end if;
  end;

  procedure guardar_habito(p_id number, p_titulo varchar2, p_descripcion varchar2, p_dias varchar2) is
    l_usuario varchar2(255) := usuario;
    l_id number;
    l_fin date;
    l_dias varchar2(30);
  begin
    validar_titulo(p_titulo);
    if p_dias is null or length(p_dias) > 30 or not regexp_like(p_dias, '^[1-7](,[1-7])*$') then
      raise_application_error(-20003, 'Selecciona al menos un dia de la semana.');
    end if;
    -- Ordenar y deduplicar para no crear cambios de frecuencia artificiales.
    select listagg(to_char(n), ',') within group (order by n) into l_dias
    from (select level n from dual connect by level <= 7)
    where instr(',' || p_dias || ',', ',' || to_char(n) || ',') > 0;
    if p_id is null then
      l_id := md_habitos_seq.nextval;
      insert into md_habitos(id, usuario, titulo, descripcion, fecha_inicio)
      values(l_id, l_usuario, trim(p_titulo), p_descripcion, hoy);
      insert into md_agendas(habito_id, desde, dias) values(l_id, hoy, l_dias);
    else
      select fecha_fin into l_fin from md_habitos
      where id = p_id and usuario = l_usuario for update;
      if l_fin is not null then
        raise_application_error(-20004, 'Este habito esta archivado.');
      end if;
      update md_habitos set titulo = trim(p_titulo), descripcion = p_descripcion where id = p_id;
      -- Serializado con el bloqueo del habito. Los registros de hoy se preservan.
      update md_agendas set hasta = hoy
      where habito_id = p_id and desde <= hoy and (hasta is null or hasta > hoy);
      merge into md_agendas a
      using (select p_id habito_id, hoy + 1 desde from dual) s
      on (a.habito_id = s.habito_id and a.desde = s.desde)
      when matched then update set a.dias = l_dias
      when not matched then insert(habito_id, desde, dias) values(s.habito_id, s.desde, l_dias);
    end if;
  exception when no_data_found then
    raise_application_error(-20005, 'Habito no disponible.');
  end;

  procedure iniciar is
    l_usuario varchar2(255) := usuario;
  begin
    begin
      insert into md_perfiles(usuario) values(l_usuario);
    exception when dup_val_on_index then return;
    end;
    guardar_habito(null, 'Contar calorias', 'Registrar lo que comi durante el dia.', '1,2,3,4,5,6,7');
    guardar_habito(null, 'Trabajar', 'Escribir aqui la prioridad del trabajo.', '1,2,3,4,5,6,7');
    guardar_habito(null, 'Ir al gimnasio', 'Anotar la rutina en el detalle de cada dia.', '1,2,3,4,5,6,7');
    guardar_habito(null, 'Estudiar', 'Anotar el tema o la tarea de estudio.', '1,2,3,4,5,6,7');
    guardar_habito(null, 'No comer chatarra', 'Registrar si cumpli este habito.', '1,2,3,4,5,6,7');
  end;

  procedure archivar_habito(p_id number) is
    l_usuario varchar2(255) := usuario;
    l_id number;
  begin
    select id into l_id from md_habitos where id = p_id and usuario = l_usuario for update;
    update md_habitos set fecha_fin = hoy where id = l_id and fecha_fin is null;
    delete from md_agendas where habito_id = l_id and desde > hoy;
    update md_agendas set hasta = hoy
    where habito_id = l_id and desde <= hoy and (hasta is null or hasta > hoy);
  exception when no_data_found then
    raise_application_error(-20005, 'Habito no disponible.');
  end;

  procedure registrar(p_habito_id number, p_fecha date, p_estado varchar2, p_detalle varchar2) is
    l_usuario varchar2(255) := usuario;
    l_inicio date;
    l_fin date;
    l_programado number;
  begin
    if p_fecha is null or p_fecha <> trunc(p_fecha) or p_fecha > hoy then
      raise_application_error(-20006, 'Elige una fecha valida, hasta hoy.');
    end if;
    if p_estado is null or p_estado not in ('PENDIENTE','COMPLETADO','NO_COMPLETADO') then
      raise_application_error(-20007, 'Estado de habito no valido.');
    end if;
    -- Evita duplicados incluso si dos pestanas guardan el mismo dia simultaneamente.
    select fecha_inicio, fecha_fin into l_inicio, l_fin from md_habitos
    where id = p_habito_id and usuario = l_usuario for update;
    select count(*) into l_programado from md_agendas
    where habito_id = p_habito_id and p_fecha between desde and nvl(hasta, p_fecha)
      and instr(',' || dias || ',', ',' || to_char(p_fecha - trunc(p_fecha, 'IW') + 1) || ',') > 0;
    if p_fecha < l_inicio or p_fecha > nvl(l_fin, p_fecha) or l_programado = 0 then
      raise_application_error(-20008, 'El habito no estaba programado para esa fecha.');
    end if;
    merge into md_registros r
    using (select p_habito_id habito_id, p_fecha fecha from dual) s
    on (r.habito_id = s.habito_id and r.fecha = s.fecha)
    when matched then update set r.estado = p_estado, r.detalle = p_detalle, r.actualizado_en = systimestamp
    when not matched then insert(habito_id, fecha, estado, detalle)
      values(s.habito_id, s.fecha, p_estado, p_detalle);
  exception when no_data_found then
    raise_application_error(-20005, 'Habito no disponible.');
  end;

  function racha(p_habito_id number) return number is
    l_usuario varchar2(255) := usuario;
    l_inicio date;
    l_dia date;
    l_estado varchar2(20);
    l_programado number;
    l_racha number := 0;
  begin
    select fecha_inicio, least(nvl(fecha_fin, hoy), hoy) into l_inicio, l_dia
    from md_habitos where id = p_habito_id and usuario = l_usuario;
    while l_dia >= l_inicio loop
      select count(*) into l_programado from md_agendas
      where habito_id = p_habito_id and l_dia between desde and nvl(hasta, l_dia)
        and instr(',' || dias || ',', ',' || to_char(l_dia - trunc(l_dia, 'IW') + 1) || ',') > 0;
      if l_programado > 0 then
        select nvl(max(estado), 'PENDIENTE') into l_estado from md_registros
        where habito_id = p_habito_id and fecha = l_dia;
        if l_estado = 'COMPLETADO' then
          l_racha := l_racha + 1;
        elsif l_dia < hoy or l_estado = 'NO_COMPLETADO' then
          return l_racha;
        end if;
      end if;
      l_dia := l_dia - 1;
    end loop;
    return l_racha;
  exception when no_data_found then
    raise_application_error(-20005, 'Habito no disponible.');
  end;

  procedure guardar_tarea(p_id number, p_titulo varchar2, p_descripcion varchar2, p_fecha_limite date, p_estado varchar2) is
    l_usuario varchar2(255) := usuario;
  begin
    validar_titulo(p_titulo);
    if p_estado is null or p_estado not in ('PENDIENTE','EN_CURSO','COMPLETADO') then
      raise_application_error(-20009, 'Estado de pendiente no valido.');
    end if;
    if p_id is null then
      insert into md_tareas(id, usuario, titulo, descripcion, fecha_limite, estado, completado_en)
      values(md_tareas_seq.nextval, l_usuario, trim(p_titulo), p_descripcion, trunc(p_fecha_limite), p_estado,
        case when p_estado = 'COMPLETADO' then systimestamp end);
    else
      update md_tareas set titulo = trim(p_titulo), descripcion = p_descripcion,
        fecha_limite = trunc(p_fecha_limite), estado = p_estado, actualizado_en = systimestamp,
        completado_en = case when p_estado = 'COMPLETADO' then nvl(completado_en, systimestamp) end
      where id = p_id and usuario = l_usuario;
      if sql%rowcount = 0 then raise_application_error(-20010, 'Pendiente no disponible.'); end if;
    end if;
  end;

  procedure eliminar_tarea(p_id number) is
    l_usuario varchar2(255) := usuario;
  begin
    delete from md_tareas where id = p_id and usuario = l_usuario;
    if sql%rowcount = 0 then raise_application_error(-20010, 'Pendiente no disponible.'); end if;
  end;

  procedure guardar_nota(p_id number, p_titulo varchar2, p_contenido clob) is
    l_usuario varchar2(255) := usuario;
  begin
    validar_titulo(p_titulo);
    if p_id is null then
      insert into md_notas(id, usuario, titulo, contenido)
      values(md_notas_seq.nextval, l_usuario, trim(p_titulo), p_contenido);
    else
      update md_notas set titulo = trim(p_titulo), contenido = p_contenido, actualizado_en = systimestamp
      where id = p_id and usuario = l_usuario;
      if sql%rowcount = 0 then raise_application_error(-20011, 'Nota no disponible.'); end if;
    end if;
  end;

  procedure eliminar_nota(p_id number) is
    l_usuario varchar2(255) := usuario;
  begin
    delete from md_notas where id = p_id and usuario = l_usuario;
    if sql%rowcount = 0 then raise_application_error(-20011, 'Nota no disponible.'); end if;
  end;
end md_api;
/

create or replace view md_v_diario as
with limites as (
  select nvl(min(fecha_inicio), md_api.hoy) primera_fecha
  from md_habitos where usuario = sys_context('APEX$SESSION', 'APP_USER')
), numeros as (
  select level - 1 n from dual
  connect by level <= (select greatest(1, md_api.hoy - primera_fecha + 1) from limites)
), fechas as (
  select l.primera_fecha + n.n fecha from limites l cross join numeros n
)
select h.id habito_id, h.titulo, h.descripcion, f.fecha,
  case when r.estado = 'COMPLETADO' then 'COMPLETADO'
       when r.estado = 'NO_COMPLETADO' or f.fecha < md_api.hoy then 'NO_COMPLETADO'
       else 'PENDIENTE' end estado,
  r.detalle, r.actualizado_en
from md_habitos h
join md_agendas a on a.habito_id = h.id
join fechas f on f.fecha between a.desde and nvl(a.hasta, md_api.hoy)
  and f.fecha between h.fecha_inicio and nvl(h.fecha_fin, md_api.hoy)
  and instr(',' || a.dias || ',', ',' || to_char(f.fecha - trunc(f.fecha, 'IW') + 1) || ',') > 0
left join md_registros r on r.habito_id = h.id and r.fecha = f.fecha
where h.usuario = sys_context('APEX$SESSION', 'APP_USER');

create or replace view md_v_resumen as
select h.id habito_id, h.titulo, h.descripcion, h.fecha_inicio, h.fecha_fin,
  case when h.fecha_fin is null then 'ACTIVO' else 'ARCHIVADO' end estado_habito,
  (select max(a.dias) keep (dense_rank last order by a.desde)
   from md_agendas a where a.habito_id = h.id) dias_configurados,
  nvl(d.completados, 0) completados,
  nvl(d.no_completados, 0) no_completados,
  md_api.racha(h.id) racha_dias_programados
from md_habitos h
left join (
  select habito_id,
    sum(case when estado = 'COMPLETADO' then 1 else 0 end) completados,
    sum(case when estado = 'NO_COMPLETADO' then 1 else 0 end) no_completados
  from md_v_diario group by habito_id
) d on d.habito_id = h.id
where h.usuario = sys_context('APEX$SESSION', 'APP_USER');

create or replace view md_v_tareas as
select id, titulo, descripcion, fecha_limite, estado, completado_en, actualizado_en
from md_tareas where usuario = sys_context('APEX$SESSION', 'APP_USER')
with read only;

create or replace view md_v_notas as
select id, titulo, contenido, actualizado_en
from md_notas where usuario = sys_context('APEX$SESSION', 'APP_USER')
with read only;
