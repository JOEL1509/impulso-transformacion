-- Ejecutar en SQL Workshop despues del instalador.
-- No escribe datos. Esperado: 15 objetos y todos VALID; cero errores.
select object_name, object_type, status
from user_objects
where object_name in (
  'MD_PERFILES','MD_HABITOS','MD_AGENDAS','MD_REGISTROS','MD_TAREAS','MD_NOTAS',
  'MD_HABITOS_SEQ','MD_TAREAS_SEQ','MD_NOTAS_SEQ','MD_API',
  'MD_V_DIARIO','MD_V_RESUMEN','MD_V_TAREAS','MD_V_NOTAS'
)
order by object_type, object_name;

select name, type, line, position, text
from user_errors
where name in ('MD_API','MD_V_DIARIO','MD_V_RESUMEN','MD_V_TAREAS','MD_V_NOTAS')
order by name, type, sequence;

select md_api.hoy fecha_actual_panama from dual;
