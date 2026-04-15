# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration
## Quick test: Menu / Mi cuenta

1. Instala dependencias y arranca el dev server:

```bash
npm install
npm run dev
```

2. Abre la app (`http://localhost:5173` por defecto) y navega a `/home` o `/calendario`.

3. En el header, abre "MI CUENTA" para ver el panel con Nombre, Rol y Rotativa.

4. Presiona "Cerrar sesión" para simular logout (borra `authToken` y `user` de `localStorage` y redirige a `/login`).

Para enlazar datos reales, guarda un objeto JSON en `localStorage` bajo la clave `user` con campos `nombre`, `rol` y `rotativa`.

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
