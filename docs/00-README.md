# AnimeLearn — Documentación Técnica

> Transforma cualquier contenido educativo en episodios de motion comic estilo anime.

---

## Documentos

| # | Documento | Qué contiene |
|---|-----------|-------------|
| 01 | **[Prompt Engineering System](./01-prompt-engineering-system.md)** | Los 5 prompts del pipeline (análisis → guión → visual → audio), schemas JSON, patrones narrativos, sistema de QA. **Este es el core IP del producto.** |
| 02 | **[Project Scaffolding](./02-project-scaffolding.md)** | Estructura de carpetas, dependencias, modelo de datos (Drizzle schema), API routes, workflow de Inngest, integraciones externas, env vars. |
| 03 | **[Remotion Composition Design](./03-remotion-composition-design.md)** | Anatomía de un episodio, sistema de parallax, transiciones, sincronización de audio, timing, ejemplo completo de composición. |
| 04 | **[Image Generation Strategy](./04-image-generation-strategy.md)** | Consistencia de personajes, character sheets, generación de paneles, separación de capas, estilos visuales, pipeline de calidad, fallbacks. |
| 05 | **[Claude Code Implementation Guide](./05-claude-code-implementation-guide.md)** | Orden de implementación (14-18 sesiones), prompts para Claude Code, trampas comunes, testing, checklist de lanzamiento. |

---

## Orden de lectura recomendado

1. Empieza por el **01** para entender la lógica del producto
2. Revisa el **02** para tener claro el stack y la estructura
3. Lee el **05** para planificar tus sesiones de desarrollo
4. Consulta el **03** y **04** cuando llegues a esas fases de implementación

## Estimación total

- **Sesiones de Claude Code:** 14-18 sesiones
- **Tiempo estimado:** 8-12 semanas (asumiendo 1-2 sesiones/día)
- **Coste de infra fijo:** ~$100/mes
- **Coste por episodio:** ~$2.50-3.00
- **APIs necesarias:** Anthropic, fal.ai, ElevenLabs, Suno, Stripe, AWS, Supabase
