-- Verificacion funcional AISLADA de MD_API y sus vistas.
-- Ejecutar como codigo de un Ajax Callback temporal en una sesion RUNTIME
-- autenticada de Mi dia. SQL Workshop no aporta la identidad runtime necesaria.
-- No contiene COMMIT. Todas las filas de prueba se revierten al terminar,
-- incluso si falla una asercion. Solo se consumen valores de las secuencias.
-- Eliminar el callback temporal despues de probar. No es una migracion.
declare
  l_usuario varchar2(255) := md_api.usuario;
  l_hoy date := md_api.hoy;
  l_diario number;
  l_semanal number;
  l_nuevo number;
  l_ajeno number;
  l_n number;
  l_otro_usuario varchar2(255) := 'MD_QA_' || rawtohex(sys_guid());
  l_dia varchar2(1) := to_char(md_api.hoy - trunc(md_api.hoy, 'IW') + 1);
  l_otro_dia varchar2(1) := to_char(mod(md_api.hoy - trunc(md_api.hoy, 'IW') + 1, 7) + 1);
  l_pruebas number := 0;

  procedure igual(p_real number, p_esperado number, p_prueba varchar2) is
  begin
    if p_real is null or p_real <> p_esperado then
      raise_application_error(-20990, p_prueba || ': esperado ' ||
        p_esperado || ', obtenido ' || nvl(to_char(p_real), 'NULL'));
    end if;
    l_pruebas := l_pruebas + 1;
  end;

  function temporal(p_inicio date, p_dias varchar2) return number is
    l_id number := md_habitos_seq.nextval;
  begin
    insert into md_habitos(id, usuario, titulo, fecha_inicio)
    values(l_id, l_usuario, 'QA temporal - se revierte', p_inicio);
    insert into md_agendas(habito_id, desde, dias)
    values(l_id, p_inicio, p_dias);
    return l_id;
  end;

  procedure resumen(p_id number, p_hechos number, p_faltas number, p_racha number, p_caso varchar2) is
    l_hechos number;
    l_faltas number;
    l_racha number;
  begin
    select completados, no_completados, racha_dias_programados
      into l_hechos, l_faltas, l_racha
      from md_v_resumen where habito_id = p_id;
    igual(l_hechos, p_hechos, p_caso || ': completados');
    igual(l_faltas, p_faltas, p_caso || ': no completados');
    igual(l_racha, p_racha, p_caso || ': racha');
  end;

  procedure error_registro(p_id number, p_fecha date, p_codigo number, p_caso varchar2) is
    l_codigo number := 0;
  begin
    begin
      md_api.registrar(p_id, p_fecha, 'COMPLETADO', null);
    exception when others then l_codigo := sqlcode;
    end;
    igual(l_codigo, p_codigo, p_caso);
  end;
begin
  savepoint md_qa_aislada;
  -- Crear mediante API: titulo con acento, descripcion y dias desordenados.
  md_api.guardar_habito(null, 'QA creacion - se revierte', 'Descripcion temporal', '7,1,7,3');
  l_nuevo := md_habitos_seq.currval;
  select count(*) into l_n from md_agendas
    where habito_id = l_nuevo and dias = '1,3,7' and desde = l_hoy;
  igual(l_n, 1, 'Crear y normalizar dias');

  l_diario := temporal(l_hoy - 3, '1,2,3,4,5,6,7');
  resumen(l_diario, 0, 3, 0, 'Inicio: hoy pendiente y tres dias pasados');
  select count(*) into l_n from md_v_diario
    where habito_id = l_diario and fecha < l_hoy - 3;
  igual(l_n, 0, 'No contar antes del inicio');

  md_api.registrar(l_diario, l_hoy - 2, 'COMPLETADO', null);
  md_api.registrar(l_diario, l_hoy - 1, 'COMPLETADO', null);
  resumen(l_diario, 2, 1, 2, 'Hoy pendiente conserva racha');
  md_api.registrar(l_diario, l_hoy, 'COMPLETADO', 'Detalle conservado');
  md_api.registrar(l_diario, l_hoy, 'COMPLETADO', 'Detalle conservado');
  resumen(l_diario, 3, 1, 3, 'Completar dos veces no duplica');
  select count(*) into l_n from md_registros
    where habito_id = l_diario and fecha = l_hoy;
  igual(l_n, 1, 'Un registro por fecha');

  md_api.registrar(l_diario, l_hoy, 'NO_COMPLETADO', 'Detalle conservado');
  resumen(l_diario, 2, 2, 0, 'No completado hoy corta racha');
  md_api.registrar(l_diario, l_hoy, 'PENDIENTE', 'Detalle conservado');
  resumen(l_diario, 2, 1, 2, 'Deshacer resta contadores y recupera racha');
  select count(*) into l_n from md_registros
    where habito_id = l_diario and fecha = l_hoy and detalle = 'Detalle conservado';
  igual(l_n, 1, 'Detalle permanece tras cambios de estado');
  md_api.registrar(l_diario, l_hoy - 3, 'COMPLETADO', null);
  resumen(l_diario, 3, 0, 3, 'Corregir pasado recalcula resumen');
  error_registro(l_diario, l_hoy + 1, -20006, 'Rechazar futuro');
  error_registro(l_diario, l_hoy - 4, -20008, 'Rechazar antes del inicio');

  l_semanal := temporal(l_hoy - 8, l_dia);
  resumen(l_semanal, 0, 1, 0, 'Solo un dia pasado programado');
  md_api.registrar(l_semanal, l_hoy - 7, 'COMPLETADO', null);
  resumen(l_semanal, 1, 0, 1, 'Descansos conservan racha');
  error_registro(l_semanal, l_hoy - 1, -20008, 'Rechazar descanso');

  md_api.guardar_habito(l_semanal, 'QA cambio - se revierte', null, l_otro_dia);
  resumen(l_semanal, 1, 0, 1, 'Cambiar dias conserva historial');
  select count(*) into l_n from md_v_diario
    where habito_id = l_semanal and fecha = l_hoy;
  igual(l_n, 1, 'Cambio de frecuencia conserva hoy');
  select count(*) into l_n from md_agendas
    where habito_id = l_semanal and desde = l_hoy + 1 and dias = l_otro_dia;
  igual(l_n, 1, 'Nueva frecuencia empieza manana');
  md_api.archivar_habito(l_semanal);
  select count(*) into l_n from md_agendas
    where habito_id = l_semanal and (desde > l_hoy or hasta is null or hasta > l_hoy);
  igual(l_n, 0, 'Archivar elimina programacion futura');
  resumen(l_semanal, 1, 0, 1, 'Archivar preserva historial');

  -- Identidad ajena creada solo dentro de esta transaccion y luego revertida.
  insert into md_perfiles(usuario) values(l_otro_usuario);
  l_ajeno := md_habitos_seq.nextval;
  insert into md_habitos(id, usuario, titulo, fecha_inicio)
    values(l_ajeno, l_otro_usuario, 'QA ajeno - se revierte', l_hoy);
  insert into md_agendas(habito_id, desde, dias)
    values(l_ajeno, l_hoy, '1,2,3,4,5,6,7');
  select count(*) into l_n from md_v_resumen where habito_id = l_ajeno;
  igual(l_n, 0, 'Vista oculta habito ajeno');
  error_registro(l_ajeno, l_hoy, -20005, 'API rechaza habito ajeno');

  rollback to md_qa_aislada;
  apex_json.open_object;
  apex_json.write('ok', true);
  apex_json.write('pruebas', l_pruebas);
  apex_json.write('mensaje', 'Todas las pruebas pasaron. Filas de prueba revertidas.');
  apex_json.close_object;
exception
  when others then
    rollback to md_qa_aislada;
    raise;
end;
