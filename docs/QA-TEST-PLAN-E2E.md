# AnimeLearn - Plan de Test E2E

**Fecha**: Marzo 2026
**Version**: 1.0
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
| 3 | Verificar estadisticas | "5 min", "4", "30+" visibles debajo de la imagen |
| 4 | Scroll a "How It Works" | 4 tarjetas visibles: Drop Your Material, Pick Your Style, Hit Generate, Watch and Learn |
| 5 | Scroll a "Subject Gallery" | 4 imagenes de subjects visibles (Biology, History, Physics, Literature) con badges |
| 6 | Scroll a "Styles" | 4 tarjetas con imagenes reales: Clean Modern, Soft Pastel, Dark Dramatic, Retro Classic |
| 7 | Scroll a "Features" | 6 feature cards visibles |
| 8 | Scroll a "Pricing" | 3 planes: Free (0), Creator (29/mo), Pro (89/mo). "Popular" badge en Creator |
| 9 | Scroll a CTA final | "Stop Rereading. Start Watching." visible |
| 10 | Verificar footer | Logo, links (How It Works, Pricing, Contact), copyright |

### TC-01.2: Navegacion
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click en "How It Works" (nav) | Scroll suave a seccion How It Works |
| 2 | Click en "Styles" (nav) | Scroll suave a seccion Styles |
| 3 | Click en "Features" (nav) | Scroll suave a seccion Features |
| 4 | Click en "Pricing" (nav) | Scroll suave a seccion Pricing |
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
| 1 | Navegar a `/login` | Formulario de login visible con tabs Sign In / Sign Up |
| 2 | Seleccionar tab "Sign Up" | Formulario muestra campos: Name, Email, Password |
| 3 | Dejar campos vacios y enviar | Mensajes de validacion en cada campo requerido |
| 4 | Introducir email invalido | Mensaje de error de formato email |
| 5 | Introducir password corto (<8 chars) | Mensaje de error de longitud |
| 6 | Completar todos los campos correctamente | Registro exitoso. Redireccion a `/dashboard` |
| 7 | Verificar que se creo `app_profiles` | Tier = "free", episodesUsedThisMonth = 0 |

### TC-02.2: Login con email
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Tab "Sign In" activo | Campos Email y Password |
| 2 | Credenciales incorrectas | Mensaje de error "Invalid credentials" o similar |
| 3 | Credenciales correctas | Login exitoso. Redireccion a `/dashboard` |
| 4 | Refrescar pagina | Sesion persiste, sigue en dashboard |

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

### TC-02.5: Logout
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click en avatar/menu de usuario en sidebar | Menu desplegable visible |
| 2 | Click en "Sign Out" | Sesion cerrada, redireccion a `/login` |
| 3 | Navegar manualmente a `/dashboard` | Redireccion a `/login` (sesion ya no existe) |

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
| 1 | Navegar a `/dashboard/projects/new` | Formulario con campos: Title, Source tabs (PDF/YouTube), Style, Language |
| 2 | Dejar titulo vacio y enviar | Error de validacion en titulo |
| 3 | Escribir titulo: "Biologia Celular" | Campo aceptado |
| 4 | Tab "PDF" seleccionado por defecto | Area de drag & drop visible |
| 5 | Click en area o arrastrar archivo PDF valido (<50MB) | Archivo seleccionado, nombre visible, boton "Change" aparece |
| 6 | Seleccionar estilo "Clean Modern" | Estilo seleccionado visualmente |
| 7 | Seleccionar idioma "Spanish" | Idioma seleccionado |
| 8 | Click en "Create Project" | Loading state en boton. Upload + extraccion de texto |
| 9 | Esperar proceso | Redireccion a pagina de proyecto. Toast de exito |
| 10 | Verificar pagina de proyecto | rawContent visible con preview del texto extraido. Contador de caracteres y tokens |

### TC-04.2: Proyecto con YouTube
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Seleccionar tab "YouTube" | Campo URL aparece |
| 2 | Introducir URL invalida | Error de validacion |
| 3 | Introducir URL valida de YouTube | URL aceptada |
| 4 | Click en "Create Project" | Proyecto creado. Transcripcion extraida en background |

### TC-04.3: Validaciones de upload
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
| 1 | Click en icono de papelera | Dialogo de confirmacion |
| 2 | Confirmar eliminacion | Toast "Project deleted". Redireccion a dashboard |
| 3 | Verificar en dashboard | Proyecto ya no aparece |
| 4 | Cancelar eliminacion | Dialogo se cierra, nada cambia |

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
| 6 | Progreso: Recording voices and music | Icono Music activo. Barra ~68-95% |
| 7 | Progreso: Episode ready | Icono PartyPopper. Barra 100%. Todos los checkmarks verdes |
| 8 | Toast: "Episode generated successfully!" | Badge "Ready" aparece en el episodio |
| 9 | Boton "Watch Episode" aparece | Habilitado |

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

### TC-06.5: Generacion multiples episodios
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Generar episodio 1 hasta completar | Ready |
| 2 | Click en "Generate This Episode" del episodio 2 | Generacion inicia. Episodio 1 sigue en Ready |
| 3 | Verificar que solo un episodio puede generarse a la vez | Boton deshabilitado en otros episodios mientras uno genera |

---

## TC-07: Seguridad y Autorizacion

### TC-07.1: Aislamiento de datos entre usuarios
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Usuario A crea proyecto | Visible solo para Usuario A |
| 2 | Usuario B accede a `/dashboard` | No ve proyectos de Usuario A |
| 3 | Usuario B intenta acceder a `/dashboard/projects/[id-de-A]` | "Project not found" o redireccion |

### TC-07.2: Validacion de ownership en API
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Llamar `project.get` con ID ajeno via tRPC | Error o null (no leak de datos) |
| 2 | Llamar `project.delete` con ID ajeno | Error, proyecto no eliminado |
| 3 | Llamar `generation.analyze` con projectId ajeno | Error |
| 4 | Llamar `generation.generateEpisode` con projectId ajeno | Error |

### TC-07.3: API sin autenticacion
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Llamar cualquier tRPC procedure sin sesion | Error 401/UNAUTHORIZED |
| 2 | POST a `/api/upload` sin sesion | Error 401 |

### TC-07.4: Upload malicioso
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Subir archivo con extension .pdf pero contenido binario malicioso | Extraccion falla graciosamente, no crash |
| 2 | Enviar request de upload sin projectId | Error de validacion |
| 3 | Enviar request de upload con projectId de otro usuario | Error de ownership |

---

## TC-08: Responsividad y UX

### TC-08.1: Mobile (375x812)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Landing page | Texto legible, imagenes escalan, grid 1 columna |
| 2 | Login | Formulario ocupa ancho completo |
| 3 | Dashboard | Proyectos en 1 columna |
| 4 | Crear proyecto | Formulario usable, drag & drop funcional |
| 5 | Pagina de proyecto | Contenido legible, botones full-width |
| 6 | Progreso de generacion | Barra y steps visibles, no overflow |

### TC-08.2: Tablet (768x1024)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Landing page | Grid 2 columnas para subjects y styles |
| 2 | Dashboard | Grid 2 columnas para proyectos |

### TC-08.3: Desktop (1920x1080)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Landing page | Grid completo (4 columnas styles, 2 columnas subjects) |
| 2 | Dashboard | Grid 3 columnas |
| 3 | Sidebar | Fija y visible |

---

## TC-09: Rendimiento y Carga

### TC-09.1: Tiempos de carga
| # | Metrica | Criterio de aceptacion |
|---|---------|----------------------|
| 1 | Landing page LCP | < 2.5s |
| 2 | Landing page FCP | < 1.8s |
| 3 | Dashboard (con 10 proyectos) | < 3s |
| 4 | Pagina de proyecto | < 2s |
| 5 | Imagenes de landing optimizadas (WebP) | Todas < 500KB |

### TC-09.2: Imagenes
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Verificar que hero.webp usa `priority` (preload) | No layout shift en hero |
| 2 | Verificar lazy loading en imagenes below fold | Solo cargan al hacer scroll |
| 3 | Verificar `next/image` optimization | Servidas via `/_next/image` con parametros de calidad |

---

## TC-10: Edge Cases y Errores

### TC-10.1: Contenido extremo
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | PDF con 1 palabra | Analisis funciona pero genera 1 episodio corto |
| 2 | PDF con 200 paginas | Text chunker divide en chunks. Analisis procesa todo |
| 3 | YouTube video sin subtitulos | Error gracioso indicando que no hay transcripcion |
| 4 | Contenido en idioma no soportado | AI hace su mejor esfuerzo o indica limitacion |

### TC-10.2: Errores de red
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Perder conexion durante upload PDF | Error mostrado, upload puede reintentarse |
| 2 | Perder conexion durante generacion | Polling falla, reconecta automaticamente al volver |
| 3 | API timeout durante analisis | Toast de error, boton habilitado para retry |

### TC-10.3: Concurrencia
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Abrir misma pagina de proyecto en 2 tabs | Ambas muestran datos consistentes |
| 2 | Generar episodio en tab 1, ver progreso en tab 2 | Tab 2 muestra progreso via polling |
| 3 | Eliminar proyecto en tab 1, refrescar tab 2 | Tab 2 muestra "Project not found" |

---

## TC-11: Integraciones Externas (Smoke Tests)

> Estos tests verifican que las integraciones con servicios externos funcionan. Requieren API keys validas.

### TC-11.1: Claude API (Anthropic)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Analisis de contenido | Claude Sonnet responde con contentAnalysis + seriesPlan |
| 2 | Generacion de script | Claude Opus genera script valido (pasa validacion) |
| 3 | Timeout handling | Si Claude tarda >60s, error manejado |

### TC-11.2: fal.ai (Image Generation)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Generar character sheet | URL de imagen valida retornada |
| 2 | Generar panel background | Imagen generada con estilo correcto |
| 3 | Background removal | Imagen sin fondo retornada |

### TC-11.3: Replicate (LTX-2.3 Video)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Generar video clip de panel | URL de video MP4 retornada |
| 2 | Video con camera motion | Movimiento de camara visible en video |

### TC-11.4: ElevenLabs (Audio)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Generar dialogo TTS | Audio MP3/WAV retornado con voz correcta |
| 2 | Generar SFX | Efecto de sonido generado |
| 3 | Generar musica | Track musical generado con duracion correcta |

---

## TC-12: Base de Datos - Integridad

### TC-12.1: Cascada de eliminacion
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Crear proyecto con episodios, panels, audio | Todos los registros existen |
| 2 | Eliminar proyecto | Todos los registros hijos eliminados (episodes, characters, panels, audioTracks, generationJobs) |
| 3 | Verificar en DB directamente | No quedan registros huerfanos |

### TC-12.2: Transiciones de estado
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Proyecto: draft -> analyzing -> planned | Transiciones validas |
| 2 | Episodio: planned -> script -> visuals -> audio -> ready | Transiciones validas en pipeline exitoso |
| 3 | Episodio: cualquier estado -> failed | Posible desde cualquier paso |
| 4 | Episodio: failed -> planned (retry) | Reset de estado al reintentar |

---

## Criterios de Aceptacion Global

| Criterio | Descripcion |
|----------|-------------|
| Funcional | Todos los TC-01 a TC-12 pasan sin errores criticos |
| Seguridad | No hay leaks de datos entre usuarios (TC-07) |
| Performance | LCP < 2.5s en landing, dashboard < 3s (TC-09) |
| Responsivo | Funcional en mobile, tablet y desktop (TC-08) |
| Errores | Todos los errores muestran feedback al usuario (TC-10) |
| Integraciones | Smoke tests de APIs externas pasan (TC-11) |

---

## Notas para el QA

1. **API Keys**: Necesitaras acceso a las siguientes env vars para tests de integracion: `ANTHROPIC_API_KEY`, `FAL_KEY`, `ELEVENLABS_API_KEY`, `REPLICATE_API_TOKEN`, `DATABASE_URL`
2. **Costes**: Los tests de generacion completa (TC-06) consumen creditos de APIs externas. Limitar a 1-2 ejecuciones completas
3. **Tiempos**: La generacion completa de un episodio tarda entre 3-10 minutos dependiendo de la longitud del contenido
4. **Datos de prueba**: Usar PDFs de contenido educativo real (10-50 paginas) para tests representativos
5. **Features pendientes**: El boton "Watch Episode" (TC-06.1 paso 9) aun no tiene pagina de reproduccion (Fase 6.8). El video no se renderiza aun (solo se ensamblan props de Remotion)
