# R5 · Refrescar la página no expulsa al login

**Estado: aprobado ✅** (visto bueno del usuario, 2026-08-23) · Fecha: 2026-08-23 · Alcance: solo frontend

## Qué se pidió

> "Quiero que si actualizo la página no me devuelva al login si ya estoy
> logeado, sino que a la página en la que ya estoy"

## Diagnóstico (el porqué del bug)

La sesión NUNCA se perdía: el JWT (`jwt_token`) y los datos del usuario
(`user_data`) viven en `localStorage`, y `AuthContext` los rehidrata al montar
(bloqueando el render con "Cargando..." hasta terminar). Lo que se perdía era
la **navegación**: la app no usa rutas reales (react-router monta el mismo
componente `Prop4` en todas las rutas) y la vista vive en un
`useState("login")` — todo refresh nacía en login aunque la sesión estuviera
intacta.

## Qué se hizo

En `sgt-huap_frontend/src/components/Admin2/Prop4.jsx`:

1. **Arranque según sesión**: la vista inicial ya no es siempre `"login"`; un
   helper `leerNavGuardada(user)` decide al montar: sin sesión → login; con
   sesión → la última vista guardada, o `"agenda"` si no hay nada guardado.
2. **Persistencia de navegación**: un `useEffect` guarda en
   `sessionStorage["sgt_nav_state"]` la vista actual, el tab activo y los siete
   estados de "retorno" (a dónde vuelve cada botón atrás). `sessionStorage` es
   por pestaña y sobrevive al refresh; una pestaña nueva parte limpia en agenda.
3. **Whitelist con chequeo de rol**: solo se restauran vistas conocidas y
   permitidas para el rol rehidratado (`vistaPermitida`), con los mismos gates
   que usa Perfil: paneles/vistas de administración solo con
   `rolSistema ADMINISTRADOR`, jefatura solo con rol `JEFATURA`, etc. Una vista
   desconocida (p. ej. renombrada en un deploy posterior, o storage manipulado)
   o ya no permitida (cambio de servicio en otra pestaña) cae a `"agenda"` en
   vez de dejar la pantalla en blanco o mostrar un panel sin privilegios. Los
   destinos de retorno guardados pasan por la misma validación. Las vistas del
   flujo de autenticación (`login`, `select_service`, `pending_registration`)
   nunca se restauran: dependen del `preAuthToken` (~5 min) que por diseño no
   se persiste.
4. **Logout** limpia `sgt_nav_state`.
5. **Fix acompañante — "Cambiar servicio" tras refresh**: la lista de servicios
   del usuario solo vivía en memoria (se poblaba en el login), así que tras un
   refresh el botón "Cambiar servicio" no hacía nada. Ahora
   `handleBackToServiceSelection` cae a `auth.user.servicios` (persistido en
   `user_data`; `AuthContext` ahora lo expone en `loadUser` y `updateUser` —
   archivo `src/context/AuthContext.jsx`), normalizando las dos formas
   (`{servicioId, nombre}` del login y `{idServicio, nombreServicio}` del
   perfil). El cambio de servicio sin `preAuthToken` ya estaba soportado por
   `SelectServiceView` vía `switchService` (usa el JWT vigente).

Token expirado: sin trabajo nuevo — `AuthContext` no restaura usuario si `exp`
venció (se arranca en login) y en caliente los interceptores de axios hacen
`clearAuth()` + redirect.

## Cómo probarlo

1. Entrar, ir al calendario, refrescar (F5): debes seguir en el calendario.
2. Ir a Perfil → refrescar: sigues en Perfil. El botón "Cambiar servicio" debe
   funcionar después del refresh (usuarios multi-servicio).
3. Cerrar sesión → refrescar: login. Abrir pestaña nueva ya logueado: agenda.
4. Como médico, forzar en la consola
   `sessionStorage.setItem('sgt_nav_state','{"view":"admin"}')` y refrescar:
   debe caer a la agenda, no al panel de administración.
