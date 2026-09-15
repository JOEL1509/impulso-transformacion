# Revisión de Mi día · 11 de septiembre de 2026

Aplicación Oracle APEX **173075**. Este registro distingue las pruebas ejecutadas en la aplicación de la revisión estática y las verificaciones pendientes.

## Corrección confirmada

El callback de creación de hábitos contenía un bloque anterior concatenado accidentalmente. Se reemplazó su contenido y se comprobó el guardado desde el formulario.

## Pruebas ejecutadas en la aplicación

| Caso | Resultado observado |
| --- | --- |
| Crear hábito para todos los días | Guardado correcto; fixture de prueba ID 23. |
| Guardar detalle con acentos y texto literal `<etiqueta>` | El texto se conservó como contenido. |
| Marcar **Hecho** | Racha 1, completados 1. |
| Repetir **Hecho** | El total permaneció en 1; no duplicó el registro. |
| Cambiar a **No lo hice** | Racha 0, completados 0, no completados 1. |
| **Deshacer** | Racha y ambos contadores volvieron a 0; el detalle se conservó. |
| Crear pendiente con fecha 12/09/2026 y completarlo | Ambas operaciones funcionaron. |
| Crear nota con texto literal `<b>` | Se mostró como texto, sin interpretarlo como etiqueta. |
| Crear hábito solo para lunes | Fixture ID 24 con `DIAS=1`; no apareció entre los hábitos de hoy viernes. |
| Retirar fixtures | Se eliminaron los hábitos 23/24 y la nota/tarea creadas para probar; se verificaron conteos 0. |

Estas pruebas fueron ejecutadas por el agente principal durante la revisión en vivo. No se marcaron hábitos personales existentes para simular resultados.

## Revisión estática del backend

- `MD_API` admite `PENDIENTE`, `COMPLETADO` y `NO_COMPLETADO`. Un registro por hábito y fecha evita duplicar contadores.
- `MD_V_DIARIO` cuenta días pasados programados sin completar desde `fecha_inicio`; hoy pendiente no suma un incumplimiento.
- La racha omite descansos y conserva la racha previa mientras hoy siga pendiente. Hoy marcado como no completado la interrumpe.
- Los cambios de frecuencia se aplican desde mañana. Archivar conserva el historial y deja de programar después de hoy.
- Los títulos tienen límite de 150 caracteres; descripciones y detalles, 2.000. La API valida el título; las descripciones y detalles demasiado largos dependen actualmente del límite de la tabla.
- Vistas y operaciones de `MD_API` comprueban identidad/propiedad. Las tablas base no tienen aislamiento por usuario; las páginas CRUD que las usan directamente deben bloquearse o protegerse expresamente.

La inspección del código no sustituye pruebas de fechas pasadas, cambio de día o segunda cuenta.

## En revisión

- Visibilidad de hábitos guardados para días distintos de hoy, para que crear uno no parezca haber fallado.
- Validaciones, límites de entrada y mensajes que expliquen los errores de guardado.
- Bloqueo del acceso directo a las páginas CRUD generadas sobre las tablas base.

## No confirmado todavía

- Pruebas con dos cuentas reales independientes.
- Cambio de día en Panamá, correcciones históricas y cambios sucesivos de frecuencia mediante la aplicación.
- Comprobación completa de teclado, móvil y preferencias de movimiento reducido.
- Ejecución de `03_pruebas_transaccionales.sql`. El script está preparado; no se ha ejecutado y no se presenta como evidencia de pruebas aprobadas.
