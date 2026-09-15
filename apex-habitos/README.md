# Mi día · Oracle APEX

Aplicación personal de hábitos, pendientes y notas, instalada en Oracle APEX.

## Estado

**Mi día**, aplicación **173075**, está instalada en Oracle APEX 26.1.3 y usa autenticación de cuentas APEX. Acceso sin identificador de sesión en el enlace:

[Abrir Mi día](https://oracleapex.com/ords/r/tony15/mi-d%C3%ADa/home)

El panel principal reúne hábitos del día, detalles diarios, contadores, pendientes y notas. El diseño actual usa fondo oscuro, acentos de color, animaciones y formularios superpuestos para crear contenido.

El guardado y los flujos principales se probaron en la aplicación el **11 de septiembre de 2026**. Consulta [04_revision_y_pruebas.md](04_revision_y_pruebas.md) para la evidencia y las comprobaciones pendientes. La visibilidad de hábitos de otros días, los mensajes de validación y el bloqueo de páginas CRUD generadas siguen en revisión.

Estos archivos son la base SQL y documentación de mantenimiento. **No contienen un export de App Builder ni reproducen por sí solos el diseño y los procesos actuales del panel.** No volver a ejecutar `01_instalar.sql` sobre el esquema instalado.

## Uso del panel

1. **Hábitos de hoy:** escribir el detalle del día y guardarlo; usar **Hecho**, **No lo hice** o **Deshacer** para cambiar el estado. La tarjeta muestra racha, completados y no completados.
2. **Nuevo hábito:** abrir el formulario, escribir nombre y descripción, elegir los días de la semana y guardar. Solo los días seleccionados cuentan para su seguimiento.
3. **Pendientes:** crear un pendiente con fecha opcional y marcarlo como completado.
4. **Notas:** guardar un título y texto libre. Los caracteres que parecen etiquetas HTML se presentan como texto.

El backend también contiene operaciones de edición, archivo y corrección de fechas pasadas. Su existencia en `MD_API` no implica que todas tengan una pantalla disponible en esta versión; el historial con calendario era una ampliación prevista.

Hábitos iniciales: contar calorías, trabajar, ir al gimnasio, estudiar y no comer chatarra. Empiezan con frecuencia diaria; sus días se ajustan al configurar la aplicación. «Contar calorías» es una casilla de seguimiento, no un diario de alimentos ni un cálculo nutricional.

## Reglas

- Un único registro por hábito y fecha; repetir «completado» no aumenta el total.
- Hoy sin marcar = pendiente. Un día programado anterior sin marcar = no completado.
- «No lo hice» permite registrar un incumplimiento explícito, incluso hoy.
- Los días de descanso no cuentan como incumplimiento ni interrumpen la racha.
- La racha cuenta ocasiones programadas consecutivas cumplidas; no equivale necesariamente a días naturales consecutivos. Mostrar «racha de días programados» en la interfaz.
- Hoy pendiente no rompe la racha hasta que termine el día; hoy marcado como no completado sí.
- No se puede registrar un día futuro ni un día no programado.
- Las correcciones de fechas pasadas actualizan los contadores.
- Los cambios de frecuencia se aplican desde mañana para preservar el historial. Al crear un hábito se elige su frecuencia inicial.
- Archivar un hábito conserva sus registros y deja de programarlo desde mañana.
- Se utiliza la fecha de Panamá (America/Panama), no la del servidor.
- Las notas diarias son independientes de la descripción general del hábito.
- Cada usuario autenticado ve y modifica únicamente sus registros mediante las vistas y el paquete incluidos.

## Referencia para instalar en otro esquema vacío

La aplicación actual ya está instalada. Estos pasos describen la base para otra instalación, no una actualización ni una restauración completa de App Builder.

1. Crear una aplicación vacía llamada **Mi día**, en español, con Universal Theme y autenticación de cuentas APEX. Todas las páginas de datos requieren autenticación.
2. En **SQL Workshop → SQL Scripts**, cargar y ejecutar `01_instalar.sql` una sola vez en el esquema seleccionado para la aplicación. No usar Import de App Builder: este archivo es un instalador de base de datos, no un export de aplicación. No contiene DROP ni elimina información existente. Si una ejecución falla, revisar los resultados antes de reintentar: Oracle confirma los cambios DDL automáticamente.
3. Ejecutar `02_verificar.sql`. Todos los objetos deben estar VALID y la consulta de errores debe devolver cero filas. Esta comprobación no sustituye las pruebas funcionales.
4. Crear un proceso de aplicación **Before Header**, para páginas autenticadas, con `begin md_api.iniciar; end;`. Los hábitos iniciales se crean una sola vez por usuario, dentro de su sesión de la aplicación. No ejecutar este proceso desde SQL Workshop para sembrar datos personales.
5. Construir las páginas siguiendo las fuentes de datos y procesos de abajo. No generar formularios automáticos que escriban directamente en las tablas: las operaciones pasan por `MD_API`, que valida usuario, fecha y pertenencia.
6. Confirmar la transacción cuando el proceso de guardado completo termine correctamente. En errores, dejar que APEX haga rollback y mostrar un mensaje de error; nunca mostrar éxito si falló el guardado. El paquete no realiza COMMIT para permitir transacciones completas.

## Referencia de fuentes y procesos

Las consultas y ejemplos siguientes documentan la API. Los nombres de elementos `P1_*`, `P2_*`, etc. son ejemplos de integración; el panel actual llama procesos Ajax y no depende de esos formularios de ejemplo.

| Pantalla | Fuente |
| --- | --- |
| Hoy | `select * from md_v_diario where fecha = md_api.hoy order by habito_id` |
| Hábitos y contadores | `select * from md_v_resumen order by habito_id` |
| Historial | `select * from md_v_diario order by fecha desc, habito_id` |
| Pendientes | `select * from md_v_tareas order by fecha_limite nulls last, id` |
| Pendientes de hoy | `select * from md_v_tareas where estado <> 'COMPLETADO' and (fecha_limite is null or fecha_limite <= md_api.hoy) order by fecha_limite nulls last, id` |
| Notas | `select * from md_v_notas order by actualizado_en desc` |

`MD_V_DIARIO` genera las fechas programadas desde el inicio del hábito, incluso si no se abrió la aplicación esos días. No requiere un trabajo nocturno para detectar incumplimientos.

Escapar siempre los títulos, descripciones y notas como texto; no renderizarlos como HTML. Mantener Session State Protection y protección de checksums para los identificadores en enlaces. El usuario no se recibe desde un elemento de página: lo obtiene el paquete de la sesión autenticada.

### Marcar y guardar detalles

Elementos de página sugeridos: `P1_HABITO_ID`, `P1_FECHA` con máscara `YYYY-MM-DD`, `P1_ESTADO` y `P1_DETALLE`. Estados permitidos: `PENDIENTE`, `COMPLETADO`, `NO_COMPLETADO`.

Proceso PL/SQL de un botón o acción dinámica:

```sql
begin
  md_api.registrar(
    p_habito_id => :P1_HABITO_ID,
    p_fecha    => to_date(:P1_FECHA, 'FXYYYY-MM-DD'),
    p_estado   => :P1_ESTADO,
    p_detalle  => :P1_DETALLE
  );
end;
```

Enviar los cuatro elementos al servidor y refrescar las regiones de hábitos, progreso e historial después del éxito. Desactivar el control mientras guarda. Una casilla marcada envía COMPLETADO; desmarcada envía PENDIENTE. Conservar el detalle actual al cambiar solo el estado. Nunca cambiar visualmente los contadores antes de recibir éxito del servidor.

### Crear o editar un hábito

```sql
begin
  md_api.guardar_habito(
    p_id => :P2_ID,
    p_titulo => :P2_TITULO,
    p_descripcion => :P2_DESCRIPCION,
    p_dias => :P2_DIAS
  );
end;
```

`P2_ID` vacío crea un hábito; con ID lo edita. Días: 1=lunes, 2=martes, …, 7=domingo, separados por comas; por ejemplo `1,3,5`. Si un checkbox group devuelve dos puntos, convertirlos mediante `replace(:P2_DIAS, ':', ',')`. Mostrar que los cambios de frecuencia entran en vigor mañana. Para archivar, usar `md_api.archivar_habito(:P2_ID)` tras confirmar en la interfaz.

### Pendientes y notas

```sql
begin
  md_api.guardar_tarea(:P3_ID, :P3_TITULO, :P3_DESCRIPCION,
    to_date(:P3_FECHA_LIMITE, 'FXYYYY-MM-DD'), :P3_ESTADO);
end;
```

Estados de tarea: PENDIENTE, EN_CURSO, COMPLETADO. Fecha vacía = sin fecha. Para las notas: `md_api.guardar_nota(:P4_ID, :P4_TITULO, :P4_CONTENIDO)`. Para eliminar una tarea o nota tras confirmación: `md_api.eliminar_tarea(:P3_ID)` y `md_api.eliminar_nota(:P4_ID)`.

## Verificación y mantenimiento

- `02_verificar.sql`: inspección de objetos, errores de compilación y fecha de Panamá; no sustituye pruebas funcionales.
- `03_pruebas_transaccionales.sql`: prueba aislada preparada para un callback temporal en una sesión runtime autenticada. Crea filas nuevas y las revierte al finalizar, incluso en error. **No se ha ejecutado.**
- `04_revision_y_pruebas.md`: comprobaciones ejecutadas, hallazgos y límites de la revisión del 11 de septiembre de 2026.

Mantener las operaciones de la interfaz sobre `MD_API` y las vistas que filtran por usuario. Las tablas base no ofrecen por sí solas aislamiento por usuario: ocultar una página del menú no impide acceder a su URL.

## Referencias oficiales consultadas

- [Oracle APEX y opciones para comenzar](https://www.oracle.com/apex/)
- [SQL Scripts](https://docs.oracle.com/en/database/oracle/apex/24.2/aeutl/using-sql-scripts.html)
- [Identidad de sesión y APP_USER](https://docs.oracle.com/en/database/oracle/apex/24.2/htmdb/using-available-built-in-substitution-strings.html)

La documentación de pantallas se tomará de la versión efectiva del workspace al conectarlo.
