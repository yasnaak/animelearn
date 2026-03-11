# AnimeLearn — Guia de QA E2E

**Fecha**: Marzo 2026
**Version**: 4.0
**Plataforma**: https://animelearn.vercel.app
**Repo**: https://github.com/yasnaak/animelearn

---

## Credenciales de Test

| Rol | Metodo |
|-----|--------|
| QA Tester | Login con Google (cuenta personal del analista) |

> Si necesitas una cuenta sin Google, pide credenciales al equipo.

---

## Prerequisito

1. Ir a https://github.com/yasnaak/animelearn/commits/main
2. Confirmar que el ultimo commit esta desplegado (la URL de Vercel debe coincidir con el commit mas reciente)
3. Abrir DevTools (F12) > Console para detectar errores JS durante las pruebas

---

## A. LANDING PAGE

### A-01: Navegacion y estructura visual
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Abrir `https://animelearn.vercel.app/` | Hero visible: titulo "Study Smarter With Anime Episodes", imagen de hero, botones "Try It Free" y "See How It Works". NO hay boton de play sobre la imagen |
| 2 | Hacer scroll hacia abajo lentamente | Cada seccion aparece con animacion suave (fade-in + slide-up). Secciones: How It Works, Any Subject, Pick Your Anime Vibe, Built for How You Actually Learn, Pricing, CTA final, Footer |
| 3 | Click en "How It Works" en nav | Scroll suave hasta la seccion correspondiente |
| 4 | Click en "Pricing" en nav | Scroll suave hasta la seccion de pricing |
| 5 | Click en "Examples" en nav | Navega a `/examples` |
| 6 | Volver a landing, verificar footer | Links funcionales: How It Works, Pricing, Contact (mailto) |

### A-02: Responsive
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Abrir landing en viewport 375px (mobile) | Layout adaptado: nav colapsable o simplificada, cards en 1 columna, texto legible |
| 2 | Abrir landing en viewport 768px (tablet) | Layout intermedio coherente, sin overflow horizontal |
| 3 | Abrir landing en viewport 1920px (desktop) | Layout completo, 3-4 columnas donde corresponde |

### A-03: Pricing section
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Scroll a Pricing | Dos planes visibles: Creator (29 EUR/mo) y Pro (89 EUR/mo). NO hay plan Free |
| 2 | Verificar features Creator | 5 episodes/month, 1080p, 4 styles, Full voice, Priority rendering, Email support |
| 3 | Verificar features Pro | Unlimited episodes, 4K, 4 styles, Full voice, Series continuity, Priority support, MP4 download |
| 4 | Click "Start Creating" (Creator) | Navega a `/login` |
| 5 | Click "Go Pro" (Pro) | Navega a `/login` |
| 6 | Verificar texto debajo del pricing | Link "Check out our example episodes" navega a `/examples` |

---

## B. AUTENTICACION

### B-01: Login con Google
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click "Sign In" o "Get Started" desde landing | Pagina `/login` visible con boton de Google |
| 2 | Click "Continue with Google" | Flujo OAuth de Google, tras login exitoso redirige a `/dashboard` |
| 3 | Verificar sidebar | Nombre del usuario, avatar (si disponible), menu con Projects y Settings |

### B-02: Redirect con sesion activa
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Con sesion activa, navegar manualmente a `/login` | Redireccion automatica a `/dashboard` |

### B-03: Logout
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click en menu de usuario en sidebar | Opcion dice "Sign out" (no "Log out") |
| 2 | Click "Sign out" | Redirige a landing. Navegar a `/dashboard` redirige a `/login` |

### B-04: Proteccion de rutas
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Sin sesion, navegar a `/dashboard` | Redirige a `/login` |
| 2 | Sin sesion, navegar a `/dashboard/projects/new` | Redirige a `/login` |
| 3 | Sin sesion, navegar a `/dashboard/settings` | Redirige a `/login` |

---

## C. PROYECTO CON PDF

### C-01: Crear proyecto con PDF
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Dashboard > "New Project" (o enlace a `/dashboard/projects/new`) | Formulario visible con tabs PDF / YouTube |
| 2 | Tab "PDF Upload" seleccionado por defecto | Zona de drag & drop visible con texto "Drag & drop a PDF here" |
| 3 | Escribir titulo: "Biology 101 Test" | Campo titulo acepta texto |
| 4 | Seleccionar estilo "Dark Dramatic", idioma "English", duracion "~3 minutes" | Dropdowns funcionan correctamente |
| 5 | Subir un PDF real de contenido educativo (>2 paginas) | Archivo aparece con nombre, icono check verde, tamanio en MB |
| 6 | Click "Create Project" | Spinner "Processing PDF...", luego toast con "PDF processed: X pages, XK characters", redirige a pagina del proyecto |
| 7 | Verificar pagina del proyecto | Titulo visible, metadata (PDF, tokens), boton "Generate This Episode" para episodio 1 |

### C-02: Validaciones de formulario PDF
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Intentar enviar sin titulo | Toast de error "Please enter a project title" |
| 2 | Intentar enviar sin archivo PDF | Toast de error "Please select a PDF file" |
| 3 | Intentar subir un archivo .txt o .jpg | Toast de error "Only PDF files are supported" |
| 4 | Subir un PDF de >50MB (si disponible) | Toast de error "File too large (max 50MB)" |

---

## D. PROYECTO CON YOUTUBE

### D-01: Crear proyecto con YouTube
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | New Project > Tab "YouTube URL" | Campo de URL visible, texto "We extract the transcript automatically. The video must have captions enabled." |
| 2 | Titulo: "Khan Academy Physics", URL: pegar URL de un video YouTube con subtitulos | Campos aceptan input |
| 3 | Click "Create Project" | Spinner "Extracting transcript...", luego toast con "YouTube transcript extracted: X min video, XK characters", redirige a proyecto |
| 4 | Verificar pagina del proyecto | Source type muestra "YouTube", contenido extraido visible |

### D-02: Validaciones YouTube
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Tab YouTube, dejar URL vacia, click "Create Project" | Toast: "Please enter a YouTube URL" |
| 2 | Escribir "https://google.com" | Toast: "Please enter a valid YouTube URL" |
| 3 | Escribir URL de video privado o sin subtitulos | Error descriptivo (transcript not available) |

**URLs de test sugeridas:**
- Con subtitulos: `https://www.youtube.com/watch?v=SzJ46YA_RaA` (Khan Academy)
- Sin subtitulos: buscar un video corto sin CC

---

## E. GENERACION DE EPISODIO

### E-01: Pipeline completo
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | En pagina de proyecto (PDF o YouTube), click "Generate This Episode" para Ep. 1 | Barra de progreso aparece con steps visibles |
| 2 | Observar progreso | Steps avanzan: Writing script > Creating characters > Visual prompts > Video clips > Audio direction > Voice & music > Quiz & notes > Finishing. Porcentaje incrementa |
| 3 | Esperar a que termine (~3-5 min para ep. de 3 min) | Status cambia a "Ready". Boton "Watch Episode" aparece |
| 4 | Click "Watch Episode" | Navega a `/watch/[episodeId]` |

### E-02: Verificar episodio generado
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Pagina `/watch/[episodeId]` | Header con titulo de serie y episodio. Remotion Player visible con controles |
| 2 | Click play en el Player | Video anime se reproduce: imagenes/video clips, dialogos con audio, musica de fondo, subtitulos |
| 3 | Verificar controles | Play/pause, barra de progreso, fullscreen, todo funcional |
| 4 | Debajo del player | Synopsis del episodio, metadata (serie, episodio X de Y, duracion), boton "Download MP4" |

### E-03: Quota / limites
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Con cuenta free, verificar Settings | Plan "Free" visible, "X / 1 episodes this month" |
| 2 | Si ya se genero 1 episodio este mes, intentar generar otro | Error: "You've reached your monthly limit of 1 episode. Upgrade your plan to generate more." |

---

## F. WATCH PAGE — FUNCIONALIDADES DE APRENDIZAJE

### F-01: Quiz
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | En watch page, verificar CTA de quiz | Card con icono cerebro, texto "Test your knowledge", N questions, boton "Take Quiz" |
| 2 | Click "Take Quiz" | Navega a `/watch/[episodeId]/quiz`. Primera pregunta visible |
| 3 | Responder todas las preguntas | Cada pregunta muestra opciones, feedback tras responder (correcto/incorrecto + explicacion) |
| 4 | Terminar quiz | Pagina de resultados con score, desglose por pregunta |

### F-02: Flashcards
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | En watch page, verificar CTA de flashcards | Card con icono, texto "Review with flashcards", N cards, boton "Study Now" |
| 2 | Click "Study Now" | Navega a `/watch/[episodeId]/flashcards`. Primera card visible con pregunta (front) |
| 3 | Click en la card | Card se voltea mostrando la respuesta (back) |
| 4 | Botones de grado visibles (0-5) | 6 botones: Forgot, Hard, Difficult, Ok, Good, Easy. Colores de rojo a verde |
| 5 | Click en un grado | Avanza a siguiente card. Barra de progreso avanza |
| 6 | Completar todas las cards | Pantalla "Session Complete" con conteo de cards revisadas, botones "Review Again" y "Back to Episode" |
| 7 | Click "Review Again" | Reinicia sesion desde card 1 |

### F-03: Study Notes
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | En watch page, verificar seccion Study Notes | Card colapsable con icono libro |
| 2 | Click para expandir | Contenido: Summary, Key Concepts (con nombre + definicion + importancia), Key Takeaways, Review Questions |

### F-04: Download MP4
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | En watch page, verificar boton "Download MP4" | Boton visible debajo de metadata del episodio |
| 2 | Click "Download MP4" | Navegador inicia descarga o muestra error si render no disponible en el server |

---

## G. COMPARTIR EPISODIO

### G-01: Toggle publico + compartir
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | En pagina del proyecto, buscar toggle de visibilidad del episodio | Toggle "Public"/"Private" visible |
| 2 | Activar toggle a "Public" | Toast de confirmacion. URL compartible generada |
| 3 | Copiar URL del episodio, abrir en ventana incognito (sin sesion) | Episodio se carga y reproduce sin login requerido |
| 4 | Desactivar toggle a "Private" | Episodio ya no es accesible sin login |

---

## H. SETTINGS / BILLING

### H-01: Pagina de Settings
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Dashboard > Settings | Pagina carga. Seccion "Current Plan" con badge (Free/Creator/Pro), icono, uso de episodios (X/Y this month) |
| 2 | Verificar barra de uso | Barra de progreso muestra episodios usados vs limite. Para "Unlimited" no hay barra |
| 3 | Verificar opciones de upgrade | Cards de Creator (29 EUR) y Pro (89 EUR) con features y botones "Upgrade to Creator"/"Upgrade to Pro" |

### H-02: Checkout flow (solo si Stripe keys configuradas)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Click "Upgrade to Creator" | Redirige a Stripe Checkout con plan correcto (29 EUR/mo) |
| 2 | Completar checkout con tarjeta de test (4242...) | Redirige a Settings con `?success=1`, banner verde "Subscription activated successfully" |
| 3 | Plan cambia a "Creator" | Badge actualizado, limite cambia a 5 episodios/mes |
| 4 | Click "Manage Subscription" | Abre Stripe Customer Portal |

---

## I. EXAMPLES PAGE

### I-01: Pagina de ejemplos
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Navegar a `/examples` | Header: "Example Episodes", descripcion "See what AnimeLearn can create" |
| 2 | Si hay episodios publicos | Grid de cards con: titulo, serie, estilo, duracion, synopsis |
| 3 | Click en una card | Navega a `/watch/[episodeId]`, episodio se reproduce |
| 4 | Si no hay episodios publicos | Mensaje "No example episodes yet" con boton "Back to Home" |

---

## J. EDGE CASES Y ERRORES

### J-01: URLs invalidas
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Navegar a `/watch/uuid-invalido` | Pagina "Episode Not Found". Tab title: "Episode Not Found — AnimeLearn". NO error 500 |
| 2 | Navegar a `/watch/00000000-0000-0000-0000-000000000000` | Pagina "Episode not found" (UUID valido pero no existe) |
| 3 | Navegar a `/ruta-que-no-existe` | Pagina 404 de Next.js |

### J-02: Errores de red
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Con DevTools > Network > Offline, intentar crear proyecto | Error manejado, toast descriptivo, no crash |
| 2 | Con DevTools > Network > Slow 3G, cargar landing | Pagina carga progresivamente, imagenes con lazy loading |

### J-03: Delete proyecto
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | En lista de proyectos, click en icono de eliminar | Dialogo de confirmacion "Are you sure?" |
| 2 | Confirmar eliminacion | Proyecto desaparece de la lista, toast de confirmacion |
| 3 | Navegar directamente a URL del proyecto eliminado | Pagina muestra que no se encuentra |

---

## K. UX / UI GENERAL

### K-01: Checklist visual
| Item | Verificar |
|------|-----------|
| Dark theme | Toda la app usa dark theme consistente (fondo negro/zinc, texto zinc/white) |
| Tipografia | Fuentes legibles, jerarquia clara (h1 > h2 > p) |
| Iconos | Lucide icons consistentes, tamanos apropiados |
| Loading states | Spinner visible en todas las operaciones async (crear proyecto, generar, checkout) |
| Toast notifications | Aparecen en esquina, desaparecen automaticamente, colores correctos (verde=exito, rojo=error) |
| Botones disabled | Botones se deshabilitan durante operaciones (evitar doble click) |
| Links | Todos los links internos funcionan, no hay links rotos |
| Console errors | No errores JS criticos en consola durante uso normal |

---

## Criterio de Aceptacion Global

- **Todas las secciones A-K** deben pasar sin errores criticos
- Errores cosmeticos se reportan pero no bloquean
- Screenshots para cada bug encontrado
- Para cada bug, reportar: seccion, paso, resultado esperado vs real, screenshot, URL, y severidad (CRITICO / MEDIO / MENOR / COSMETICO)
