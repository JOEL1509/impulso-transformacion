# TNC FITNES · Tu transformación

Aplicación en español, privada y local, con diseño oscuro adaptable a móvil. Esta carpeta contiene todos los archivos de la nueva versión. La app anterior y su guardado `impulsoState` se conservan; al abrir esta versión por primera vez en el mismo origen, se importan sus sesiones y rutinas personalizadas y se convierten las cargas de libras a kilogramos.

## Abrir

Desde la carpeta del proyecto, ejecutar `node transformacion/serve.cjs` y abrir http://127.0.0.1:8089/transformacion/. El servidor solo escucha en este equipo. También se puede publicar el contenido de esta carpeta en un alojamiento estático HTTPS; no requiere base de datos ni dependencias de producción.

Web publicada: https://joel1509.github.io/impulso-transformacion/transformacion/

La caché permite reabrir las pantallas sin conexión después de la primera visita. Los datos pertenecen al navegador y al origen donde se guardaron. Para trasladarlos a otra URL, equipo o teléfono: exportar una copia completa e importarla en el destino. Esta versión no sincroniza con Oracle APEX. El nombre de la clave de guardado anterior se conserva para que cambiar la marca no pierda los datos.

## Funciones

- **Hoy:** siguiente rutina del split activo, peso medio reciente, objetivos, continuidad con descansos, chequeo y recuperación programada.
- **Entrenar:** tres bases guiadas, biblioteca y rutinas propias; ejercicios de fuerza, isométricos y cardio; carga planificada por ejercicio, fotos/videos locales y enlaces HTTPS de técnica.
- **Series:** tipos N/W/D/S, carga total en kg o lb, reps, RPE, RIR, TUT, descanso y grupo de biserie. El almacenamiento permanece en kg; cambiar de unidad no modifica el historial. Registro persistente, series completadas verdes, aviso visual de descanso terminado y resumen descargable como PNG con el logo original.
- **Progreso:** pesajes corregibles por fecha, promedio móvil de 7 días, chequeos, medidas, fotos, calendario, días de entrenamiento por semana e historial de 1RM estimado por ejercicio.
- **Perfil:** foto local, datos solicitados, factor asignado automáticamente a la descripción de actividad, macros y recálculo manual de Mifflin–St Jeor. Ajuste de objetivo, incluidos pasos de ±50 kcal, con advertencia al reducirlo y recálculo de carbohidratos. El peso inicial y su fecha se conservan y se muestran en la gráfica junto a los pesajes diarios.
- **Decisiones:** ventana de hasta 28 días; exige al menos 14 días transcurridos, suficientes pesajes semanales y adherencia explícita antes de reducir calorías. Los cambios requieren pulsar Aplicar y esperan 14 días entre ajustes.
- **Recuperación:** próximas descargas cada 5–6 semanas y pausas de dieta cada 8–10. Programar una descarga reduce aproximadamente a la mitad las series de las nuevas sesiones durante ese período; no cambia sesiones ya guardadas. La pausa usa el mantenimiento estimado y permite retomar el objetivo anterior.
- **Comida:** 146 alimentos en 13 categorías con valores de USDA SR Legacy 2018; productos propios por etiqueta, recetas, eliminación de productos/recetas sin perder comidas anteriores, diario por fecha y cálculo de porciones con guardado. Calorías, proteína, carbohidratos y grasa consumidos/disponibles. Agua por vasos de tamaño configurable y litros, persistente por fecha. Cerrar el día conserva sus metas para el balance histórico.
- **Restaurantes:** 13 referencias editables de McDonald's, Pío Pío, Burger King, Trescuates y salchipapas. Quitar componentes, cambiar bebidas a zero/agua, editar cantidades/macros y guardar en el diario. Las cifras son aproximaciones, no nutrición oficial de Panamá. Ver [fuentes y límites](RESTAURANTES.md).
- **Exportaciones:** CSV completo y tablas separadas, informe imprimible como PDF y copia JSON que incluye fotos/videos. La restauración valida datos y archivos antes de sustituir registros.

## Límites que la interfaz explica

Los recordatorios del navegador requieren permiso y la app abierta. Para avisos con la app cerrada se ofrece un calendario ICS recurrente, que debe importarse en el calendario del teléfono. La entrega final de alarmas depende de ese calendario y del sistema operativo. No se promete Web Push en segundo plano sin servidor.

Un temporizador conserva el tiempo al cambiar de app o recargar, aunque el navegador suspenda su ejecución; esto no garantiza que emita un sonido con la pantalla bloqueada. Los descansos mantienen la continuidad pero nunca suman días de entrenamiento.

Los alimentos generales usan valores USDA; los menús usan porciones supuestas y referencias señaladas. Los precios se configuran por el usuario. La fórmula y las sugerencias son estimaciones, no promesas de resultados ni diagnósticos. La calculadora no emite objetivos para menores de 18 años. No se aceptan objetivos inferiores a 1000 kcal ni macros que generen carbohidratos negativos; esto no garantiza que un objetivo superior sea adecuado. Fotos/videos: hasta 20 MB por archivo; permanecen locales. Borrar el almacenamiento del navegador puede borrar el historial: exportar copias periódicas.

Agua: referencia inicial de líquidos de 1,6 L para mujeres y 2 L para hombres adultos, estimada como 80 % de los valores EFSA de agua total (que incluyen alimentos). No se pretende calcular necesidades exactas con el peso; sudor, clima y restricciones médicas requieren individualización. El contador registra solo el agua anotada y no suma automáticamente bebidas del diario.

## Base de las reglas

- [Artículo original de Mifflin–St Jeor](https://pubmed.ncbi.nlm.nih.gov/2305711/).
- [NIDDK: estimaciones de energía para adultos](https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner).
- [EFSA: referencias de agua total](https://www.efsa.europa.eu/en/press/news/nda100326).
- [CSUN: guía con factores de actividad](https://www.csun.edu/~lisagor/Spring%202015/494/PNC%20Program%20Guide%20Spring%202015.pdf). Los multiplicadores son una aproximación separada de Mifflin–St Jeor, no una medición individual.
- [Consenso de expertos sobre descargas](https://pubmed.ncbi.nlm.nih.gov/37730925/).
- [Ensayo sobre pausas de dieta en mujeres entrenadas](https://pubmed.ncbi.nlm.nih.gov/37181269/).

Los umbrales de pérdida y las frecuencias son reglas de producto solicitadas y configurables; no constituyen un algoritmo clínico validado. El sistema muestra el período y el motivo de la sugerencia y no actúa a partir de un pesaje diario aislado.

## Verificación

`node --test transformacion/core.test.cjs transformacion/integrity-test.cjs transformacion/nutrition-plan.test.cjs transformacion/tnc-features.test.cjs`: 43 pruebas de cálculos, tendencias, progresión, carga, unidades, menús, agua, catálogo, diario, migración, cuota, importación, CSV y calendarios.

Pruebas funcionales de Chrome automatizado, con almacenamiento aislado del usuario:

- `browser-test.cjs`: perfil, TDEE, series, navegación/recarga, resumen, historial, peso, chequeo, recetas, suplementos y diseño móvil.
- `advanced-test.cjs`: rutina propia, rangos, foto de ejercicio, isométrico persistente, medidas/foto, CSV/PDF, copia/restauración y calendario.
- `recovery-test.cjs`: descarga, biseries, pausa, regreso al objetivo, descanso y funcionamiento sin conexión.
- `video-test.cjs`: carga de video local, reproducción y persistencia al recargar; la interfaz valida que el navegador pueda leer el archivo.
- `nutrition-plan-browser.cjs`: carga planificada y real, catálogo/buscador, producto por etiqueta, edición histórica inmutable, cálculo de porciones sin duplicados, cierre diario, exportación y móvil.
- `tnc-browser.cjs`: logo, foto de perfil persistente, actividad descriptiva, ajuste de calorías, gráfica inicial, kg/lb, series verdes, alerta de descanso, PNG, agua, menús personalizados, borrado con conservación histórica y pantalla móvil de 390 px.

Las pruebas usan el Playwright ya instalado en este equipo y un Chrome local; no son dependencias de la aplicación. No sustituyen una prueba física de notificaciones con el teléfono bloqueado.
