# Impulso · Tu transformación

Aplicación en español, privada y local, con diseño oscuro adaptable a móvil. Esta carpeta contiene todos los archivos de la nueva versión. La app anterior y su guardado `impulsoState` se conservan; al abrir esta versión por primera vez en el mismo origen, se importan sus sesiones y rutinas personalizadas y se convierten las cargas de libras a kilogramos.

## Abrir

Desde la carpeta del proyecto, ejecutar `node transformacion/serve.cjs` y abrir http://127.0.0.1:8089/transformacion/. El servidor solo escucha en este equipo. También se puede publicar el contenido de esta carpeta en un alojamiento estático HTTPS; no requiere base de datos ni dependencias de producción.

La caché permite reabrir las pantallas sin conexión después de la primera visita. Los datos pertenecen al navegador y al origen donde se guardaron. Para trasladarlos a otra URL, equipo o teléfono: exportar una copia completa e importarla en el destino. Esta versión no está publicada ni sincronizada con Oracle APEX.

## Funciones

- **Hoy:** siguiente rutina del split activo, peso medio reciente, objetivos, continuidad con descansos, chequeo y recuperación programada.
- **Entrenar:** tres bases guiadas, biblioteca y rutinas propias; ejercicios de fuerza, isométricos y cardio; carga planificada por ejercicio, fotos/videos locales y enlaces HTTPS de técnica.
- **Series:** tipos N/W/D/S, carga total en kg, reps, RPE, RIR, TUT, descanso y grupo de biserie. Registro persistente, cronómetros basados en timestamps y resumen de sesión con tonelaje, ejercicios, músculos y descansos.
- **Progreso:** pesajes corregibles por fecha, promedio móvil de 7 días, chequeos, medidas, fotos, calendario, días de entrenamiento por semana e historial de 1RM estimado por ejercicio.
- **Perfil:** datos solicitados, factor de actividad, macros editables y recálculo manual de Mifflin–St Jeor. El peso inicial se conserva.
- **Decisiones:** ventana de hasta 28 días; exige al menos 14 días transcurridos, suficientes pesajes semanales y adherencia explícita antes de reducir calorías. Los cambios requieren pulsar Aplicar y esperan 14 días entre ajustes.
- **Recuperación:** próximas descargas cada 5–6 semanas y pausas de dieta cada 8–10. Programar una descarga reduce aproximadamente a la mitad las series de las nuevas sesiones durante ese período; no cambia sesiones ya guardadas. La pausa usa el mantenimiento estimado y permite retomar el objetivo anterior.
- **Comida:** catálogo inicial de 111 alimentos en 11 categorías con valores de USDA SR Legacy 2018; buscador, productos propios por etiqueta en g o ml, recetas, diario por fecha y cálculo de porciones que guarda directamente sus cantidades y macros. Cerrar el día permite ver el déficit o superávit estimado frente al TDEE guardado para esa fecha.
- **Exportaciones:** CSV completo y tablas separadas, informe imprimible como PDF y copia JSON que incluye fotos/videos. La restauración valida datos y archivos antes de sustituir registros.

## Límites que la interfaz explica

Los recordatorios del navegador requieren permiso y la app abierta. Para avisos con la app cerrada se ofrece un calendario ICS recurrente, que debe importarse en el calendario del teléfono. La entrega final de alarmas depende de ese calendario y del sistema operativo. No se promete Web Push en segundo plano sin servidor.

Un temporizador conserva el tiempo al cambiar de app o recargar, aunque el navegador suspenda su ejecución; esto no garantiza que emita un sonido con la pantalla bloqueada. Los descansos mantienen la continuidad pero nunca suman días de entrenamiento.

Los valores iniciales de alimentos/precios son ejemplos editables. La fórmula y las sugerencias son estimaciones, no promesas de resultados ni diagnósticos. La calculadora no emite objetivos para menores de 18 años. Fotos/videos: hasta 20 MB por archivo desde la interfaz; no se envían a servicios externos. Borrar el almacenamiento del navegador puede borrar el historial: exportar copias periódicas.

## Base de las reglas

- [Artículo original de Mifflin–St Jeor](https://pubmed.ncbi.nlm.nih.gov/2305711/).
- [NIDDK: estimaciones de energía para adultos](https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner).
- [Consenso de expertos sobre descargas](https://pubmed.ncbi.nlm.nih.gov/37730925/).
- [Ensayo sobre pausas de dieta en mujeres entrenadas](https://pubmed.ncbi.nlm.nih.gov/37181269/).

Los umbrales de pérdida y las frecuencias son reglas de producto solicitadas y configurables; no constituyen un algoritmo clínico validado. El sistema muestra el período y el motivo de la sugerencia y no actúa a partir de un pesaje diario aislado.

## Verificación

`node --test transformacion/core.test.cjs transformacion/integrity-test.cjs transformacion/nutrition-plan.test.cjs`: 37 pruebas aprobadas de cálculos, tendencias, progresión, carga planificada, catálogo, diario calórico, migración, cuota, importación, CSV y calendarios.

Pruebas funcionales de Chrome automatizado, con almacenamiento aislado del usuario:

- `browser-test.cjs`: perfil, TDEE, series, navegación/recarga, resumen, historial, peso, chequeo, recetas, suplementos y diseño móvil.
- `advanced-test.cjs`: rutina propia, rangos, foto de ejercicio, isométrico persistente, medidas/foto, CSV/PDF, copia/restauración y calendario.
- `recovery-test.cjs`: descarga, biseries, pausa, regreso al objetivo, descanso y funcionamiento sin conexión.
- `video-test.cjs`: carga de video local, reproducción y persistencia al recargar; la interfaz valida que el navegador pueda leer el archivo.
- `nutrition-plan-browser.cjs`: carga planificada y real, catálogo/buscador, producto por etiqueta, edición histórica inmutable, cálculo de porciones sin duplicados, cierre diario, exportación y móvil.

Las pruebas usan el Playwright ya instalado en este equipo y un Chrome local; no son dependencias de la aplicación. No sustituyen una prueba física de notificaciones con el teléfono bloqueado.
