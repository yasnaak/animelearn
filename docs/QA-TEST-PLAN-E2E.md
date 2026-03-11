# AnimeLearn - Verificacion Final QA

**Fecha**: Marzo 2026
**Version**: 3.0
**Plataforma**: https://animelearn.vercel.app
**Repo**: https://github.com/yasnaak/animelearn

---

## Credenciales de Test

| Rol | Email | Password |
|-----|-------|----------|
| QA Tester | `qa@animelearn.com` | `AnimeTest2026!` |

---

## Prerequisito

Antes de ejecutar los tests, verificar que el commit `e91ab56` esta desplegado en produccion:
1. Ir a https://github.com/yasnaak/animelearn/commits/main
2. Verificar que el ultimo commit coincide con la version en produccion
3. Si hay commits pendientes de deploy, esperar a que Vercel termine

---

## Verificaciones (VF-01 a VF-04)

> En rondas anteriores se ejecuto el E2E completo (TC-01 a TC-16) y se encontraron 4 bugs. Los 4 estan corregidos. Esta ronda verifica que los fixes funcionan en produccion.

### VF-01: UUID invalido en /watch (ex BUG-001 CRITICO)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Navegar a `https://animelearn.vercel.app/watch/uuid-invalido` | Pagina muestra "Episode not found". Title del tab: "Episode Not Found — AnimeLearn". NO error 500 |
| 2 | Navegar a `https://animelearn.vercel.app/watch/00000000-0000-0000-0000-000000000000` | Pagina muestra "Episode not found". NO error 500 |

### VF-02: Redirect /login con sesion activa (ex BUG-002 MEDIO)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Login con credenciales QA (qa@animelearn.com / AnimeTest2026!) | Dashboard visible |
| 2 | Navegar manualmente a `/login` | Redireccion automatica a `/dashboard` (no se muestra el formulario de login) |

### VF-03: Validacion inline en formulario login (ex BUG-003 MENOR)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Navegar a `/login` (sin sesion, ventana incognito) | Formulario de login visible |
| 2 | Dejar campos vacios y click en "Sign in" | Mensaje inline en rojo: "Email is required". NO tooltip nativo del navegador |
| 3 | Escribir "test@" y click en "Sign in" | Mensaje inline en rojo: "Please enter a valid email address". NO tooltip nativo |
| 4 | Escribir "test@test.com", password "123" y click en "Sign in" | Mensaje inline en rojo: "Password must be at least 8 characters". NO tooltip nativo |
| 5 | Empezar a escribir en cualquier campo tras un error | Mensaje de error desaparece al escribir |

### VF-04: Texto "Sign out" en sidebar (ex BUG-004 COSMETICO)
| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Login y abrir menu de usuario en sidebar | Opcion dice "Sign out" (NO "Log out") |

---

## Criterio de aceptacion

Los 4 tests (VF-01 a VF-04) deben pasar. Si alguno falla, reportar con captura de pantalla.
