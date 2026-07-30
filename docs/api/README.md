# Capa de API — OpenAPI / Swagger

Esta carpeta documenta la **API REST** del backend (Capa 2 del modelo de documentación).
La documentación se genera automáticamente desde el código con
[springdoc-openapi](https://springdoc.org/), por lo que se mantiene siempre sincronizada
con los endpoints reales.

## Acceso con el backend en ejecución

| Recurso | URL (local) | Descripción |
|---------|-------------|-------------|
| **Swagger UI** | `http://localhost:8080/swagger-ui.html` | Interfaz interactiva para explorar y probar la API |
| **Spec JSON** | `http://localhost:8080/v3/api-docs` | Especificación OpenAPI en JSON |

> ⚠️ **En producción Swagger está deshabilitado** por seguridad. Los backends del
> `docker-compose.yml` arrancan con `SWAGGER_ENABLED=false`, por lo que `/swagger-ui.html`
> y `/v3/api-docs` **no** se sirven. Para consultar la API en producción usa la
> especificación versionada [`openapi.json`](openapi.json). En desarrollo
> (`docker-compose.dev.yml` o ejecución local) Swagger queda habilitado por defecto.

## Autenticación desde Swagger UI

La API usa **JWT (Bearer token)** en dos pasos:

1. `POST /api/v2/funcionarios/login` — con RUT y contraseña. Devuelve un **token de pre-autorización** y la lista de servicios.
2. `POST /api/v2/funcionarios/login/select-service` — con el token de pre-autorización y el servicio elegido. Devuelve el **JWT definitivo**.

Para probar endpoints protegidos en Swagger UI:

1. Ejecuta el login y copia el token final.
2. Pulsa el botón **Authorize** (candado) e introduce el token (sin el prefijo `Bearer`).
3. Ya puedes invocar los endpoints protegidos.

Los endpoints públicos (login, `select-service`, `health`, `info`, y `GET /servicios`) aparecen **sin candado**.

## Especificación versionada

[`openapi.json`](openapi.json) es una copia exportada de la especificación, versionada en el
repositorio para poder revisar cambios de contrato en los Pull Requests y generar clientes.

### Regenerar la especificación

Con el backend en ejecución:

```bash
curl -s http://localhost:8080/v3/api-docs -o docs/api/openapi.json
# (opcional) formatear para diffs legibles
python -c "import json;json.dump(json.load(open('docs/api/openapi.json')),open('docs/api/openapi.json','w'),indent=2,ensure_ascii=False)"
```

## Cómo documentar nuevos endpoints

La documentación sale de anotaciones en el código. Al añadir o modificar un endpoint:

- **Controller:** `@Tag(name, description)` a nivel de clase para agrupar; `@Operation(summary, description)` en cada método; `@ApiResponses`/`@ApiResponse` para los códigos de estado relevantes.
- **Endpoints públicos:** `@SecurityRequirements` (vacío) para indicar que no requieren token.
- **DTOs:** `@Schema(description, example)` en los campos para enriquecer los modelos.

Referencia de implementación: [`FuncionarioController`](../../huap_backend/src/main/java/com/pingeso/HUAP/Controller/FuncionarioController.java)
y la configuración global en
[`OpenApiConfig`](../../huap_backend/src/main/java/com/pingeso/HUAP/Config/OpenApiConfig.java).

> Nota: la mayoría de los controllers ya se documentan automáticamente (springdoc infiere
> rutas, parámetros y modelos). Las anotaciones anteriores mejoran la legibilidad y deben
> añadirse progresivamente al resto de controllers siguiendo el ejemplo de `FuncionarioController`.
