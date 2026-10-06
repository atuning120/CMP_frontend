# Frontend

React 19 · Vite 8 · React Router 7 (`react-router-dom`) · CSS Modules · JavaScript (JSX) · ESLint · pnpm

- Web client that consumes the Backend API (`../Backend`); if an API contract changes, check `../Front-mobile` too.
- Routing: all routes live in `src/router.jsx` (`createBrowserRouter`), mounted in `src/main.jsx` with `RouterProvider`. Layouts render `<Outlet />`; use `Link`/`NavLink`, never `<a href>` for internal routes.
- Structure: one folder per unit, JSX + its styles side by side: `src/pages/<Page>/`, `src/layouts/<Layout>/`, `src/components/<Component>/` (`Name.jsx` + `Name.module.css`).
- Global styles and design tokens (CSS variables) only in `src/index.css`; components never use global classes.

## Styles (CSS Modules + nesting)

- JSX holds structure and behavior only: no inline `style`, no CSS in JS. All visuals go in the sibling `*.module.css`, applied via `className={styles.x}`.
- Class names in camelCase (`styles.navLink`), no element/id selectors.
- One root class per file, named after the component (`.home`, `.layout`); children nested inside it following the JSX tree. Max 3 levels deep.
- Inside a block, use `&` for states and modifiers (`&:hover`, `&.active`) and nest `@media` inside the rule it affects.
- Colors, fonts and shadows come from `var(--token)` in `src/index.css`, never hardcoded.
- Conditional classes: template string (`` `${styles.link} ${styles.active}` ``); `NavLink` uses a `className={({ isActive }) => ...}` function.
- Commands: `pnpm dev`, `pnpm build`, `pnpm lint`
- Before finishing: `pnpm lint` and `pnpm build`

## graphify

- Find code with `graphify query "<q>"`, `graphify explain "<X>"` or `graphify path "<A>" "<B>"`; read `graphify-out/GRAPH_REPORT.md` only for an architecture overview.
- After code changes: `graphify update .`

# Claude Code Configuration

Responde siempre en español. Mantén en inglés (sin traducir) todos los términos técnicos, nombres de herramientas, tecnologías y librerías: API, REST, database, backend, framework, Git, Docker, Linux, Node.js, Python, JavaScript, JSON, etc.
