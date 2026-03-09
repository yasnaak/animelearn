# AnimeLearn - Plan de Test E2E

**Fecha**: Marzo 2026
**Version**: 2.1
**Plataforma**: https://animelearn.vercel.app
**Repo**: https://github.com/yasnaak/animelearn

---

## Entornos de prueba

| Entorno | URL | DB | APIs |
|---------|-----|-----|------|
| Produccion | animelearn.vercel.app | Railway PostgreSQL (prod) | Claves produccion |
| Local | localhost:3000 | Railway o local PG | Mismas claves (o test keys) |

**Navegadores objetivo**: Chrome 120+, Firefox 120+, Safari 17+, Edge 120+
**Dispositivos**: Desktop (1920x1080, 1440x900), Tablet (768x1024), Mobile (375x812)

## Credenciales de Test

| Rol | Email | Password | Nombre | Tier |
|-----|-------|----------|--------|------|
| QA Tester | `qa@animelearn.com` | `AnimeTest2026!` | QA Tester | free |

> Cuenta pre-creada en produccion. Lista para usar directamente en https://animelearn.vercel.app/login

---

## TC-01: Landing Page

### TC-01.1: Carga inicial y contenido
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Navegar a `/` | Pagina carga sin errores. Hero visible con titulo "Study Smarter With Anime Episodes" |
| 2 | Verificar imagen hero | Imagen `/landing/hero.webp` visible, boton play centrado |
| 3 | Verificar estadisticas | "5 min", "4", "3" visibles debajo de la imagen |
| 4 | Scroll a "How It Works" | 4 tarjetas visibles: Drop Your Material, Pick Your Style, Hit Generate, Watch and Learn |
| 5 | Scroll a "Subject Gallery" | 4 imagenes de subjects visibles (Biology, History, Physics, Literature) con badges |
| 6 | Scroll a "Styles" | 4 tarjetas con imagenes reales: Clean Modern, Soft Pastel, Dark Dramatic, Retro Classic |
| 7 | Scroll a "Features" | 6 feature cards visibles. Feature "Multiple Languages" (no "30+ Languages") |
| 8 | Scroll a "Pricing" | 3 planes: Free (€0), Creator (€29/mo), Pro (€89/mo). "Popular" badge en Creator |
| 9 | Scroll a CTA final | "Stop Rereading. Start Watching." visible |
| 10 | Verificar footer | Logo, links (How It Works, Pricing, Contact), copyright |

### TC-01.2: Navegacion
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click en "How It Works" (nav) | Scroll suave a seccion How It Works. Elementos se hacen visibles (fade-in) |
| 2 | Click en "Styles" (nav) | Scroll suave a seccion Styles. Elementos se hacen visibles |
| 3 | Click en "Features" (nav) | Scroll suave a seccion Features. Elementos se hacen visibles |
| 4 | Click en "Pricing" (nav) | Scroll suave a seccion Pricing. Elementos se hacen visibles |
| 5 | Click en "Sign In" | Redirige a `/login` |
| 6 | Click en "Get Started" (nav) | Redirige a `/login` |
| 7 | Click en "Try It Free" (hero) | Redirige a `/login` |
| 8 | Click en cualquier CTA de pricing | Redirige a `/login` |
| 9 | Click en "Make My First Episode" (final) | Redirige a `/login` |

### TC-01.3: Animaciones y responsividad
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Carga inicial | Elementos aparecen con fade-in al hacer scroll (IntersectionObserver) |
| 2 | Hover en tarjeta de estilo | Imagen hace zoom suave (scale-105), borde cambia opacidad |
| 3 | Hover en subject image | Imagen hace zoom suave |
| 4 | Hover en boton play hero | Boton escala a 110% |
| 5 | Redimensionar a mobile (375px) | Nav comprime: links ocultos, botones visibles. Grid pasa a 1 columna |
| 6 | Redimensionar a tablet (768px) | Subjects en 2 columnas, styles en 2 columnas |

---

## TC-02: Autenticacion

### TC-02.1: Registro con email
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Navegar a `/login` | Formulario de login visible con descripcion "Sign in to your account" y link "Sign up" abajo |
| 2 | Click en link "Sign up" | Formulario cambia a registro con campos: Name, Email, Password |
| 3 | Dejar campos vacios y enviar | Mensaje inline "Email is required" en rojo |
| 4 | Introducir email invalido (ej. "test@") | Mensaje "Please enter a valid email address" |
| 5 | Introducir email valido pero password < 8 chars | Mensaje "Password must be at least 8 characters" |
| 6 | Email + password validos pero nombre vacio | Mensaje "Name is required" |
| 7 | Completar todos los campos correctamente | Registro exitoso. Redireccion a `/dashboard` |
| 8 | Verificar que se creo `app_profiles` | Tier = "free", episodesUsedThisMonth = 0 |

### TC-02.2: Login con email
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Formulario de Sign In visible (por defecto) | Campos Email y Password |
| 2 | Email vacio y enviar | Mensaje "Email is required" |
| 3 | Email invalido | Mensaje "Please enter a valid email address" |
| 4 | Password < 8 chars | Mensaje "Password must be at least 8 characters" |
| 5 | Credenciales incorrectas (formato valido) | Mensaje de error del servidor |
| 6 | Credenciales correctas | Login exitoso. Redireccion a `/dashboard` |
| 7 | Refrescar pagina | Sesion persiste, sigue en dashboard |

### TC-02.3: Login con Google OAuth
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click en "Continue with Google" | Redireccion a pantalla de consentimiento Google |
| 2 | Seleccionar cuenta Google | Redireccion de vuelta a `/dashboard` con sesion activa |
| 3 | Segundo login con misma cuenta | No crea usuario duplicado, login directo |

### TC-02.4: Proteccion de rutas
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Sin sesion, navegar a `/dashboard` | Redireccion a `/login` |
| 2 | Sin sesion, navegar a `/dashboard/projects/new` | Redireccion a `/login` |
| 3 | Sin sesion, navegar a `/dashboard/settings` | Redireccion a `/login` |
| 4 | Con sesion activa, navegar a `/login` | Redireccion automatica a `/dashboard` |

### TC-02.5: Logout
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click en avatar/menu de usuario en sidebar | Menu desplegable visible |
| 2 | Click en "Sign out" | Sesion cerrada, redireccion a `/login` |
| 3 | Navegar manualmente a `/dashboard` | Redireccion a `/login` (sesion ya no existe) |
| 4 | Inmediatamente tras logout, llamar `project.list` via DevTools/fetch | Error 401/UNAUTHORIZED (no datos cacheados) |

---

## TC-03: Dashboard de Proyectos

### TC-03.1: Dashboard vacio
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Login con usuario nuevo (sin proyectos) | Dashboard muestra estado vacio con CTA "Create your first project" |
| 2 | Click en boton "New Project" | Navega a `/dashboard/projects/new` |

### TC-03.2: Dashboard con proyectos
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Login con usuario que tiene proyectos | Grid de tarjetas de proyecto visible |
| 2 | Cada tarjeta muestra | Titulo, tipo de fuente (PDF/YouTube), estilo, status badge |
| 3 | Click en tarjeta de proyecto | Navega a `/dashboard/projects/[id]` |

---

## TC-04: Creacion de Proyecto

### TC-04.1: Proyecto con PDF
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Navegar a `/dashboard/projects/new` | Formulario con campos: Title, Visual Style, Language, Episode Duration, Source tabs (PDF/YouTube) |
| 2 | Verificar grid de opciones | 3 columnas: Visual Style, Language, Episode Duration |
| 3 | Dejar titulo vacio y enviar | Error de validacion en titulo |
| 4 | Escribir titulo: "Biologia Celular" | Campo aceptado |
| 5 | Tab "PDF" seleccionado por defecto | Area de drag & drop visible |
| 6 | Click en area o arrastrar archivo PDF valido (<50MB) | Archivo seleccionado, nombre visible, boton "Change" aparece |
| 7 | Seleccionar estilo "Clean Modern" | Estilo seleccionado visualmente |
| 8 | Seleccionar idioma "Spanish" | Idioma seleccionado |
| 9 | Seleccionar duracion "~5 minutes" | Duracion seleccionada (opciones: ~3 min, ~5 min, ~10 min) |
| 10 | Click en "Create Project" | Loading state en boton. Upload + extraccion de texto |
| 11 | Esperar proceso | Redireccion a pagina de proyecto. Toast de exito |
| 12 | Verificar pagina de proyecto | rawContent visible con preview del texto extraido. Contador de caracteres y tokens |

### TC-04.2: Proyecto con YouTube
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Seleccionar tab "YouTube" | Campo URL aparece con mensaje "coming soon" en amarillo |
| 2 | Introducir URL invalida (ej. "hola") | Error: "Please enter a valid YouTube URL (e.g. https://youtube.com/watch?v=...)" |
| 3 | Introducir URL valida de YouTube | URL aceptada |
| 4 | Click en "Create Project" | Proyecto creado. Pagina de proyecto muestra "YouTube transcript extraction is not available yet. Please upload a PDF instead." |

### TC-04.3: Duracion de episodio
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Seleccionar ~3 minutes | Se guarda `targetDurationMinutes: 3` |
| 2 | Seleccionar ~5 minutes (default) | Se guarda `targetDurationMinutes: 5` |
| 3 | Seleccionar ~10 minutes | Se guarda `targetDurationMinutes: 10` |

### TC-04.4: Validaciones de upload
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Subir archivo que no es PDF (.docx, .jpg) | Error: formato no soportado |
| 2 | Subir PDF de >50MB | Error: archivo demasiado grande |
| 3 | Subir PDF vacio (0 paginas) | Error o warning: no se pudo extraer texto |
| 4 | Subir PDF escaneado (solo imagenes, sin texto) | Warning: poco texto extraido |

---

## TC-05: Pagina de Proyecto

### TC-05.1: Contenido listo, sin analizar
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Abrir proyecto recien creado con contenido | Card "Content Ready" visible |
| 2 | Ver preview del contenido | Primeros 1500 caracteres del rawContent |
| 3 | Ver contadores | "X characters - ~Y tokens" |
| 4 | Boton "Analyze Content and Plan Episodes" visible | Boton habilitado |

### TC-05.2: Analisis de contenido
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click en "Analyze Content and Plan Episodes" | Boton cambia a loading: "Analyzing your content..." |
| 2 | Esperar finalizacion (30-120s) | Toast: "Content analyzed! Episodes are ready to generate." |
| 3 | Pagina se actualiza automaticamente | SeriesPlan visible: titulo de serie, numero de episodios |
| 4 | Seccion "Episodes" aparece | Lista de episodios planificados con titulo y sinopsis |
| 5 | Cada episodio muestra | Titulo, sinopsis, boton "Generate This Episode" |

### TC-05.3: Analisis fallido
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Provocar fallo (contenido muy corto, API caida) | Toast de error con mensaje descriptivo |
| 2 | Boton de analisis vuelve a estar disponible | Usuario puede reintentar |

### TC-05.4: Eliminar proyecto
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click en icono de papelera | Dialogo de confirmacion (AlertDialog, no browser confirm) |
| 2 | Dialogo muestra | Titulo "Delete this project?", descripcion del impacto, botones Cancel y Delete Project |
| 3 | Click en "Cancel" | Dialogo se cierra, nada cambia |
| 4 | Click en "Delete Project" | Loading spinner en boton. Toast "Project deleted". Redireccion a dashboard |
| 5 | Verificar en dashboard | Proyecto ya no aparece |

### TC-05.5: Proyecto YouTube sin contenido
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Abrir proyecto YouTube | Icono AlertCircle amarillo visible |
| 2 | Mensaje | "YouTube transcript extraction is not available yet. Please upload a PDF instead." |
| 3 | Boton "Create New Project" | Lleva a `/dashboard/projects/new` |

---

## TC-06: Generacion de Episodio (Pipeline Completo)

### TC-06.1: Generacion exitosa
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click en "Generate This Episode" | Boton deshabilitado. Card de progreso aparece |
| 2 | Progreso: Writing the script | Icono PenLine activo (spinner). Barra ~5-15%. Detalle: "AI is crafting dialogue, characters, and scenes" |
| 3 | Progreso: Designing characters | Icono Palette activo. Barra ~15-25%. Checkmark en Script |
| 4 | Progreso: Planning the visuals | Icono Sparkles activo. Barra ~25-35%. Checkmarks en Script + Characters |
| 5 | Progreso: Animating scenes | Icono Film activo. Barra ~35-60%. Este paso es el mas largo |
| 6 | Progreso: Recording voices and music | Icono Music activo. Barra ~68-88% |
| 7 | Progreso: Creating quiz and study notes | Barra ~90%. Generando quiz y notas de estudio |
| 8 | Progreso: Episode ready | Icono PartyPopper. Barra 100%. Todos los checkmarks verdes |
| 9 | Toast: "Episode generated successfully!" | Badge "Ready" aparece en el episodio |
| 10 | Botones "Watch Episode" y Share (icono) visibles | Ambos habilitados |

### TC-06.2: Progreso en tiempo real
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Durante generacion, abrir DevTools > Network | Peticiones `generation.getProgress` cada 2 segundos |
| 2 | Verificar datos de respuesta | `currentStep`, `progress`, `stepsCompleted` array actualizado |
| 3 | Porcentaje en UI | Se actualiza cada polling cycle, transicion suave en barra |

### TC-06.3: Generacion fallida
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Provocar fallo (API key invalida, timeout) | Card de progreso muestra icono AlertCircle rojo |
| 2 | Mensaje de error visible | Texto descriptivo del error en la card |
| 3 | Badge "Failed" en episodio | Visible en rojo |
| 4 | Boton "Retry Generation" aparece | Habilitado |
| 5 | Error guardado en DB | `episodes.generationError` tiene mensaje, `episodes.status` = 'failed' |

### TC-06.4: Retry de generacion
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click en "Retry Generation" | Nuevo intento. Progreso desde 0% |
| 2 | Si tiene exito | Episodio pasa a "Ready" normalmente |

### TC-06.5: Generacion multiples episodios (series coherence)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Generar episodio 1 hasta completar | Ready |
| 2 | Click en "Generate This Episode" del episodio 2 | Generacion inicia. Episodio 1 sigue en Ready |
| 3 | Verificar que solo un episodio puede generarse a la vez | Boton deshabilitado en otros episodios mientras uno genera |
| 4 | Verificar coherencia del episodio 2 | Script del episodio 2 referencia eventos/conceptos del episodio 1. Opening hook conecta con cliffhanger anterior |

---

## TC-07: Video Player

### TC-07.1: Acceso al player
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click en "Watch Episode" desde pagina de proyecto | Navega a `/watch/[episodeId]` |
| 2 | Pagina carga | Header con titulo de serie y episodio. Player de video con aspecto 16:9 |
| 3 | Boton Back (flecha) | Navega de vuelta a la pagina del proyecto |

### TC-07.2: Controles del player (Remotion Player)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click en el video | Reproduce/pausa |
| 2 | Barra de controles | Play/pause, seek bar, tiempo, fullscreen visibles |
| 3 | Click en fullscreen | Video se expande a pantalla completa |
| 4 | Doble click en video | Entra/sale de fullscreen |
| 5 | Presionar espacio | Reproduce/pausa |
| 6 | Seek bar | Permite navegar a cualquier punto del video |

### TC-07.3: Contenido del video
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Intro (5 segundos) | Fondo gradient oscuro, nombre de serie, numero de episodio, titulo |
| 2 | Paneles del episodio | Se muestran secuencialmente con transiciones |
| 3 | End card (15 segundos) | Resumen de puntos clave, teaser del siguiente episodio |

### TC-07.4: Informacion del episodio
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Debajo del player | Titulo "Episode N: [titulo]" |
| 2 | Sinopsis visible | Texto descriptivo del episodio |
| 3 | Metadata | Nombre de serie, "Episode N of M", duracion (si disponible) |

### TC-07.5: Episodio no encontrado
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Navegar a `/watch/uuid-invalido` | Mensaje "Episode not found" |
| 2 | Mensaje complementario | "This episode may not exist or is still being generated." |
| 3 | Boton "Go to AnimeLearn" | Navega a `/` |

### TC-07.6: OG Meta Tags
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Inspeccionar `<head>` de pagina de episodio ready | `<title>` contiene "Episode N: [titulo] — [serie]" |
| 2 | Meta `og:title` | Mismo valor que title |
| 3 | Meta `og:description` | Synopsis del episodio |
| 4 | Meta `og:type` | "video.episode" |
| 5 | Meta `twitter:card` | "summary_large_image" |

---

## TC-08: Quiz Post-Episodio

### TC-08.1: Acceso al quiz
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | En pagina `/watch/[episodeId]` con quiz generado | Card "Test your knowledge" visible debajo del player |
| 2 | Card muestra | Icono BrainCircuit, "N questions based on this episode", boton "Take Quiz" |
| 3 | Click en "Take Quiz" | Navega a `/watch/[episodeId]/quiz` |

### TC-08.2: Flujo del quiz
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Pagina quiz carga | Header con titulo, contador "1 / N", barra de progreso |
| 2 | Pregunta visible | Badge de dificultad (easy/medium/hard), concepto testeado, texto de pregunta |
| 3 | 4 opciones de respuesta | Letras A-D, texto de cada opcion |
| 4 | Click en una opcion | Opcion seleccionada se resalta en cyan |
| 5 | Boton "Check Answer" | Habilitado solo si hay opcion seleccionada |
| 6 | Click en "Check Answer" | Feedback inmediato: verde para correcta, rojo para incorrecta |
| 7 | Explicacion visible | Texto explicativo debajo de las opciones |
| 8 | Boton "Next Question" | Aparece despues del feedback |
| 9 | Avanzar por todas las preguntas | Barra de progreso se llena gradualmente |

### TC-08.3: Pantalla de resultados
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Completar todas las preguntas | Pantalla de resultados con porcentaje grande |
| 2 | Icono Trophy | Verde si paso (>= passing_score), amarillo si no |
| 3 | Texto | "X of N correct" + mensaje de felicitacion o animo |
| 4 | Desglose por pregunta | Lista con checkmark verde o X roja por pregunta |
| 5 | Boton "Try Again" | Reinicia quiz desde pregunta 1 |
| 6 | Boton "Back to Episode" | Navega a `/watch/[episodeId]` |

### TC-08.4: Quiz no disponible
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Navegar a `/watch/[episodeId]/quiz` sin quiz generado | Icono BookOpen, "No quiz available yet" |
| 2 | Boton "Back to Episode" | Navega a `/watch/[episodeId]` |

---

## TC-09: Study Notes

### TC-09.1: Notas de estudio en pagina de watch
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | En pagina `/watch/[episodeId]` con notas generadas | Card "Study Notes" visible (colapsada por defecto) |
| 2 | Click en header de Study Notes | Card se expande mostrando contenido |
| 3 | Seccion Summary | Parrafo resumen del episodio |
| 4 | Seccion Key Concepts | Lista de conceptos con nombre, definicion e importancia |
| 5 | Seccion Key Takeaways | Lista con bullet points cyan |
| 6 | Seccion Review Questions | Lista numerada de preguntas abiertas para autoestudio |
| 7 | Seccion "Coming up next..." (si aplica) | Card con borde cyan, texto de conexion con siguiente episodio |
| 8 | Click en header de nuevo | Card se colapsa |

### TC-09.2: Sin notas
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Episodio sin studyNotes generadas | Seccion de Study Notes no aparece |

---

## TC-10: Compartir Episodio

### TC-10.1: Dialogo de compartir
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | En pagina de proyecto, episodio Ready | Boton Share (icono) junto a "Watch Episode" |
| 2 | Click en boton Share | Modal/dialogo "Share Episode" aparece |
| 3 | Toggle Public/Private | Toggle switch visible. Por defecto: Private (Lock icon) |
| 4 | Texto privado | "Only you can watch this episode" |
| 5 | URL del episodio | Input readonly con URL completa `/watch/[episodeId]` |
| 6 | Boton "Copy" | Copia URL al portapapeles. Toast "Link copied to clipboard" |
| 7 | Boton "Done" | Cierra el dialogo |
| 8 | Click fuera del dialogo | Cierra el dialogo |

### TC-10.2: Toggle publico
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click en toggle (Private -> Public) | Toggle cambia a verde. Globe icon. "Anyone with the link can watch" |
| 2 | Toast | "Episode is now public" |
| 3 | Verificar en DB | `episodes.isPublic = true`, `episodes.publicSlug` tiene valor |

### TC-10.3: Toggle privado
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click en toggle (Public -> Private) | Toggle cambia a gris. Lock icon. "Only you can watch this episode" |
| 2 | Toast | "Episode is now private" |
| 3 | Verificar en DB | `episodes.isPublic = false`, `episodes.publicSlug = null` |

### TC-10.4: Acceso publico
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Copiar URL de episodio publico | URL valida |
| 2 | Abrir URL sin sesion (ventana incognito) | Video player carga correctamente (no requiere auth) |
| 3 | Quiz y study notes accesibles | Ambos funcionan sin auth |

---

## TC-11: Seguridad y Autorizacion

### TC-11.1: Aislamiento de datos entre usuarios
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Usuario A crea proyecto | Visible solo para Usuario A |
| 2 | Usuario B accede a `/dashboard` | No ve proyectos de Usuario A |
| 3 | Usuario B intenta acceder a `/dashboard/projects/[id-de-A]` | "Project not found" o redireccion |

### TC-11.2: Validacion de ownership en API
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Llamar `project.get` con ID ajeno via tRPC | Error o null (no leak de datos) |
| 2 | Llamar `project.delete` con ID ajeno | Error, proyecto no eliminado |
| 3 | Llamar `generation.analyze` con projectId ajeno | Error |
| 4 | Llamar `generation.generateEpisode` con projectId ajeno | Error |
| 5 | Llamar `generation.togglePublic` con projectId ajeno | Error |

### TC-11.3: API sin autenticacion
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Llamar `project.list` sin sesion (ventana incognito) | Error 401/UNAUTHORIZED |
| 2 | Llamar `project.get` sin sesion (ventana incognito) | Error 401/UNAUTHORIZED |
| 3 | POST a `/api/upload` sin sesion (ventana incognito) | Error 401 |
| 4 | Llamar `render.getPublicCompositionProps` sin sesion | Funciona (es public procedure) |
| 5 | Llamar `learning.getQuiz` sin sesion | Funciona (es public procedure) |
| 6 | Llamar `learning.getStudyNotes` sin sesion | Funciona (es public procedure) |

### TC-11.5: Invalidacion de sesion post-logout
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Login con credenciales QA | Sesion activa, dashboard visible |
| 2 | Abrir DevTools > Console | Preparar para ejecutar fetch manual |
| 3 | Hacer logout via "Sign out" | Redireccion a `/login` |
| 4 | Ejecutar `fetch('/api/trpc/project.list')` en consola | Response status 401 (no 200). No devuelve datos |
| 5 | Ejecutar `fetch('/api/upload', {method:'POST'})` en consola | Response status 401 (no 400) |

### TC-11.4: Upload malicioso
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Subir archivo con extension .pdf pero contenido binario malicioso | Extraccion falla graciosamente, no crash |
| 2 | Enviar request de upload sin projectId | Error de validacion |
| 3 | Enviar request de upload con projectId de otro usuario | Error de ownership |

---

## TC-12: Responsividad y UX

### TC-12.1: Mobile (375x812)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Landing page | Texto legible, imagenes escalan, grid 1 columna |
| 2 | Login | Formulario ocupa ancho completo |
| 3 | Dashboard | Proyectos en 1 columna |
| 4 | Crear proyecto | Formulario usable. Grid 3 columnas puede pasar a stack en mobile |
| 5 | Pagina de proyecto | Contenido legible, botones full-width |
| 6 | Progreso de generacion | Barra y steps visibles, no overflow |
| 7 | Video player | Player ocupa ancho completo, aspecto 16:9 mantenido |
| 8 | Quiz | Preguntas y opciones legibles, botones full-width |
| 9 | Study notes | Card colapsable funcional en mobile |

### TC-12.2: Tablet (768x1024)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Landing page | Grid 2 columnas para subjects y styles |
| 2 | Dashboard | Grid 2 columnas para proyectos |
| 3 | Video player | Player con buen tamaño, controles usables |

### TC-12.3: Desktop (1920x1080)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Landing page | Grid completo (4 columnas styles, 2 columnas subjects) |
| 2 | Dashboard | Grid 3 columnas |
| 3 | Sidebar | Fija y visible |
| 4 | Video player | Player grande con max-w-7xl centrado |

---

## TC-13: Rendimiento y Carga

### TC-13.1: Tiempos de carga
| # | Metrica | Criterio de aceptacion |
|---|---------|----------------------|
| 1 | Landing page LCP | < 2.5s |
| 2 | Landing page FCP | < 1.8s |
| 3 | Dashboard (con 10 proyectos) | < 3s |
| 4 | Pagina de proyecto | < 2s |
| 5 | Video player page | < 3s (incluye carga de composicion) |
| 6 | Quiz page | < 2s |
| 7 | Imagenes de landing optimizadas (WebP) | Todas < 500KB |

### TC-13.2: Imagenes
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Verificar que hero.webp usa `priority` (preload) | No layout shift en hero |
| 2 | Verificar lazy loading en imagenes below fold | Solo cargan al hacer scroll |
| 3 | Verificar `next/image` optimization | Servidas via `/_next/image` con parametros de calidad |

---

## TC-14: Edge Cases y Errores

### TC-14.1: Contenido extremo
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | PDF con 1 palabra | Analisis funciona pero genera 1 episodio corto |
| 2 | PDF con 200 paginas | Text chunker divide en chunks. Analisis procesa todo. Multiples episodios generados con coherencia |
| 3 | YouTube video sin subtitulos | Pagina muestra "YouTube transcript extraction is not available yet" con boton para crear nuevo proyecto |
| 4 | Contenido en idioma no soportado | AI hace su mejor esfuerzo o indica limitacion |

### TC-14.2: Errores de red
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Perder conexion durante upload PDF | Error mostrado, upload puede reintentarse |
| 2 | Perder conexion durante generacion | Polling falla, reconecta automaticamente al volver |
| 3 | API timeout durante analisis | Toast de error, boton habilitado para retry |

### TC-14.3: Concurrencia
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Abrir misma pagina de proyecto en 2 tabs | Ambas muestran datos consistentes |
| 2 | Generar episodio en tab 1, ver progreso en tab 2 | Tab 2 muestra progreso via polling |
| 3 | Eliminar proyecto en tab 1, refrescar tab 2 | Tab 2 muestra "Project not found" |

---

## TC-15: Integraciones Externas (Smoke Tests)

> Estos tests verifican que las integraciones con servicios externos funcionan. Requieren API keys validas.

### TC-15.1: Claude API (Anthropic)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Analisis de contenido | Claude Sonnet responde con contentAnalysis + seriesPlan |
| 2 | Generacion de script | Claude Opus genera script valido (pasa validacion) |
| 3 | Generacion de quiz | Claude Sonnet genera 5-7 preguntas validas |
| 4 | Generacion de study notes | Claude Sonnet genera notas estructuradas |
| 5 | Timeout handling | Si Claude tarda >60s, error manejado |

### TC-15.2: fal.ai (Image Generation)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Generar character sheet | URL de imagen valida retornada |
| 2 | Generar panel background | Imagen generada con estilo correcto |
| 3 | Background removal | Imagen sin fondo retornada |

### TC-15.3: Replicate (LTX-2.3 Video)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Generar video clip de panel | URL de video MP4 retornada |
| 2 | Video con camera motion | Movimiento de camara visible en video |

### TC-15.4: ElevenLabs (Audio)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Generar dialogo TTS | Audio MP3/WAV retornado con voz correcta |
| 2 | Generar SFX | Efecto de sonido generado |
| 3 | Generar musica | Track musical generado con duracion correcta |

---

## TC-16: Base de Datos - Integridad

### TC-16.1: Cascada de eliminacion
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Crear proyecto con episodios, panels, audio | Todos los registros existen |
| 2 | Eliminar proyecto | Todos los registros hijos eliminados (episodes, characters, panels, audioTracks, generationJobs) |
| 3 | Verificar en DB directamente | No quedan registros huerfanos |

### TC-16.2: Transiciones de estado
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Proyecto: draft -> analyzing -> planned | Transiciones validas |
| 2 | Episodio: planned -> script -> visuals -> audio -> ready | Transiciones validas en pipeline exitoso |
| 3 | Episodio: cualquier estado -> failed | Posible desde cualquier paso |
| 4 | Episodio: failed -> planned (retry) | Reset de estado al reintentar |

### TC-16.3: Datos de quiz y study notes
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Episodio ready | `quizData` JSONB no null con estructura de preguntas |
| 2 | Episodio ready | `studyNotes` JSONB no null con estructura de notas |
| 3 | Episodio fallido durante quiz step | `quizData` puede ser null (non-critical step). Episodio sigue Ready |

---

## Criterios de Aceptacion Global

| Criterio | Descripcion |
|----------|-------------|
| Funcional | Todos los TC-01 a TC-16 pasan sin errores criticos |
| Seguridad | No hay leaks de datos entre usuarios (TC-11). Public procedures funcionan sin auth |
| Performance | LCP < 2.5s en landing, dashboard < 3s, player < 3s (TC-13) |
| Responsivo | Funcional en mobile, tablet y desktop (TC-12) |
| Errores | Todos los errores muestran feedback al usuario (TC-14) |
| Integraciones | Smoke tests de APIs externas pasan (TC-15) |
| Learning | Quiz interactivo funcional con feedback. Study notes legibles (TC-08, TC-09) |
| Sharing | Toggle public/private funciona. OG tags presentes. Acceso publico sin auth (TC-10) |

---

## Notas para el QA

1. **API Keys**: Necesitaras acceso a las siguientes env vars para tests de integracion: `ANTHROPIC_API_KEY`, `FAL_KEY`, `ELEVENLABS_API_KEY`, `REPLICATE_API_TOKEN`, `DATABASE_URL`
2. **Costes**: Los tests de generacion completa (TC-06) consumen creditos de APIs externas. Limitar a 1-2 ejecuciones completas
3. **Tiempos**: La generacion completa de un episodio tarda entre 3-10 minutos dependiendo de la longitud del contenido y la duracion configurada
4. **Datos de prueba**: Usar PDFs de contenido educativo real (10-50 paginas) para tests representativos
5. **Video player**: El player usa Remotion Player (renderizado client-side). No es un video MP4 pre-renderizado — se compone en tiempo real en el navegador
6. **Quiz generation**: El quiz se genera como paso non-critical en la pipeline. Si falla, el episodio sigue quedando Ready pero sin quiz ni study notes
7. **Public procedures**: Las rutas `/watch/[episodeId]`, `/watch/[episodeId]/quiz` y sus datos (composition props, quiz, study notes) son accesibles sin autenticacion via public tRPC procedures
8. **Series coherence**: Para validar coherencia entre episodios (TC-06.5 paso 4), generar al menos 2 episodios de un mismo proyecto y verificar que el episodio 2 referencia contenido del episodio 1
9. **Sesion post-logout (TC-11.5)**: Verificar siempre desde ventana incognito O inmediatamente tras logout. La sesion debe invalidarse al instante (sin cache). Si se obtiene 200 en endpoints protegidos tras logout, reportar como critico
10. **Validacion formularios**: El formulario de login usa `noValidate` — toda la validacion es JS inline. No deben aparecer tooltips nativos del navegador en ningun caso
11. **Verificar deploy antes de testear**: Antes de iniciar el test, verificar que el ultimo commit esta deployado. Ir a https://github.com/yasnaak/animelearn/commits/main y comparar el ultimo commit con la version en produccion. Si hay commits pendientes de deploy, esperar a que Vercel termine
12. **Responsividad**: Para tests mobile/tablet (TC-12), usar Chrome DevTools > Toggle Device Toolbar (Ctrl+Shift+M) para emular dispositivos. No depender del redimensionamiento del browser
13. **Moneda**: Los precios en la landing page estan en euros (€). Esto es intencional
