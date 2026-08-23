# R8 · Con un solo servicio, entrar directo al home

**Estado: aprobado ✅** (visto bueno del usuario, 2026-08-23) · Fecha: 2026-08-23 · Alcance: solo frontend

## Qué se pidió

> "Si es que yo estoy en SOLO UN servicio, no me lleve a esa ventana de elección
> de servicio, sino que directamente al home"

## Contexto: por qué existe esa pantalla

El login es de **dos pasos** por diseño del backend:

1. `POST /funcionarios/login` valida las credenciales y devuelve un
   **preAuthToken** temporal (~5 min) más la lista de servicios del funcionario.
   Todavía no hay JWT: el rol depende del servicio.
2. `POST /funcionarios/login/select-service` canjea ese preAuthToken por el
   **JWT definitivo**, ya con el servicio y el rol activos.

O sea, el paso 2 no es opcional: sin él no hay sesión. Lo que sobra cuando hay
un solo servicio es **pedirle al usuario que elija**, no la llamada.

## Qué se hizo

Cuando el paso 1 devuelve exactamente **un** servicio, la app canjea el
preAuthToken automáticamente por ese servicio y entra al home. La pantalla de
selección solo aparece con dos o más servicios.

Si el canje automático falla (red, token vencido), **no** se traga el error: se
cae al flujo normal y se muestra la pantalla de selección con el mensaje, para
que el usuario pueda reintentar.

## Cómo se hizo

Archivo: `sgt-huap_frontend/src/components/Admin2/Prop4.jsx`.

1. Importar el paso 2: `import { selectService } from "../../services/authService";`
2. Estado para el intervalo del canje: `const [entrandoDirecto, setEntrandoDirecto] = useState(false);`
3. `handleLoginSuccess` pasa a ser `async` y, antes de mostrar la selección:
   ```jsx
   if (preAuthToken && servicios.length === 1) {
     const unico = servicios[0];
     setEntrandoDirecto(true);
     const result = await selectService(preAuthToken, unico.servicioId);
     setEntrandoDirecto(false);
     if (result.success) {
       setServiciosDisponibles(servicios);
       if (unico.nombre) localStorage.setItem("sgt_servicio_activo_nombre", unico.nombre);
       handleServiceSelected(result.userData);
       return;
     }
     // si falla, sigue al flujo normal (pantalla de selección con el error)
   }
   ```
   El `localStorage.setItem` se hace aquí porque `handleServiceSelected` lo
   resuelve mirando `serviciosDisponibles`, que en este punto todavía no se
   actualizó (React agenda el estado, no lo aplica al instante).
4. Mientras dura el canje no se muestra el login (evita doble envío y parpadeo):
   la rama `currentView === "login"` se divide en `&& !entrandoDirecto` (login) y
   `&& entrandoDirecto` (un panel "Entrando…").

**No se tocó** `SelectServiceView`: sigue igual para quienes tienen varios
servicios, y para el cambio de servicio desde dentro (que usa `switchService`
en vez de `selectService`, porque ahí ya hay un JWT válido).

> El botón "Cambiar servicio" se deja visible aunque haya un solo servicio:
> es una acción explícita del usuario, no un paso forzado del login.

## Cómo probarlo

1. Entrar con un usuario de **un solo** servicio (seed: Pablo Garrido
   `30000070-0`, solo Urgencias): debe caer directo en la agenda, sin pantalla
   intermedia.
2. Entrar con un usuario de **varios** servicios: la pantalla de selección debe
   seguir apareciendo igual que antes.
3. Cortar la red justo después de enviar credenciales con un usuario de un solo
   servicio: debe aparecer la pantalla de selección con el mensaje de error, no
   una pantalla trabada.
