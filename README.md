# EventFlow - Gestión de Espacios y Recursos Técnicos (Laboratorio N° 08)

## 1. Descripción del proyecto

EventFlow es un sistema para gestionar espacios de centros de convenciones y los recursos técnicos asignados a cada espacio. Implementa una API RESTful con Django REST Framework y un cliente web nativo (HTML, CSS, JavaScript Vanilla) llamado **EventFlow Control Room** que consume la API en tiempo real.

El sistema garantiza:
- Integridad referencial entre espacios y recursos técnicos (on_delete=PROTECT).
- Validaciones estrictas en backend (aforo > 0, costos > 0, stock >= 0, códigos patrimoniales únicos con formato, campos obligatorios).
- Lecturas públicas (GET) y escrituras protegidas con autenticación por token (POST/PUT/PATCH/DELETE).
- Configuración explícita de CORS para el cliente web.
- Sin secretos expuestos en el repositorio.
- Panel de administración personalizado con tema oscuro "EventFlow".

## 2. Tecnologías utilizadas

- **Backend:** Python 3, Django 6.1.x, Django REST Framework 3.18.x, django-cors-headers 4.9.x, python-dotenv
- **Frontend:** HTML5 semántico, CSS moderno, JavaScript Vanilla (fetch API). Prohibidos frameworks de componentes.
- **Base de datos:** SQLite (por simplicidad académica)

## 3. Estructura de carpetas

```
tarea08/
├── .env
├── .env.example
├── .gitignore
├── README.md
├── requirements.txt
├── manage.py
├── eventflow/           # Configuración Django
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── gestion_eventos/     # App principal (Espacios y Recursos Técnicos)
│   ├── admin.py
│   ├── models.py
│   ├── serializers.py
│   ├── tests.py
│   ├── urls.py
│   ├── views.py
│   └── migrations/
├── templates/           # Plantillas propias (personalización del admin)
│   └── admin/
│       └── base_site.html
├── static/              # Estáticos propios
│   └── css/
│       └── admin_custom.css
└── frontend/            # Cliente web "EventFlow Control Room"
    ├── index.html
    ├── styles.css
    └── app.js
```

## 4. Instalación del entorno virtual

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

## 5. Instalación de dependencias

```powershell
pip install -r requirements.txt
```

## 6. Configuración del archivo .env

Copiar `.env.example` a `.env` y ajustar valores si fuera necesario:

```powershell
Copy-Item .env.example .env
```

Variables relevantes:
- SECRET_KEY: Clave secreta de Django
- DEBUG: True para desarrollo
- ALLOWED_HOSTS: 127.0.0.1,localhost
- CORS_ALLOWED_ORIGINS: http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5510,http://localhost:5510

**Nota de seguridad:** El archivo `.env` está incluido en `.gitignore`. Nunca subir secretos reales al repositorio.

## 7. Migraciones

```powershell
python manage.py migrate
```

## 8. Creación del superusuario

```powershell
python manage.py createsuperuser
```

(O usar las credenciales demo: `admin` / `admin123` si ya fueron creadas durante desarrollo).

## 9. Ejecución del servidor Django

```powershell
python manage.py runserver 127.0.0.1:8000
```

El servidor quedará disponible en: http://127.0.0.1:8000/

> La raíz `/` no define vista propia (404 esperado). La API vive en `/api/` y el panel en `/admin/`.

## 10. Forma de abrir el cliente web

El frontend debe servirse mediante un **servidor HTTP** (no abrir `file://` directamente), para que CORS funcione correctamente. El backend acepta tanto `:5500` como `:5510` como orígenes permitidos.

### Opción A: `http.server` (recomendado en este equipo)

```powershell
python -m http.server 5510 --directory frontend --bind 127.0.0.1
```

Abrir en el navegador: http://127.0.0.1:5510/

### Opción B: VS Code Live Server

1. Abrir `frontend/` en VS Code
2. Instalar la extensión "Live Server" (ritwickdey.LiveServer)
3. Clic derecho sobre `index.html` → "Open with Live Server"
4. Se abrirá en http://127.0.0.1:5500/

> Si el puerto 5500 aparece ocupado/reservado por Windows (error `WinError 10013`), usar la Opción A en 5510.

## 11. Panel de administración

El panel de administración de Django está disponible y **personalizado**:

- URL: http://127.0.0.1:8000/admin/
- Credenciales demo: `admin` / `admin123`
- Título del sitio, encabezado y colores se definen en:
  - `eventflow/urls.py` (`admin.site.site_header`, `site_title`, `index_title`)
  - `templates/admin/base_site.html` (branding propio)
  - `static/css/admin_custom.css` (tema oscuro ámbar/cian, alineado con la web)

Ver la sección 23 para más detalle.

## 12. Endpoints de la API

Rutas registradas con `DefaultRouter` bajo el prefijo `/api/`.

| Método | URL | Acción | Auth |
|---|---|---|---|
| GET | /api/espacios/ | Listar espacios | Pública |
| POST | /api/espacios/ | Crear espacio | Token |
| GET | /api/espacios/<id>/ | Detalle espacio | Pública |
| PUT | /api/espacios/<id>/ | Actualizar completo | Token |
| PATCH | /api/espacios/<id>/ | Actualizar parcial | Token |
| DELETE | /api/espacios/<id>/ | Eliminar espacio* | Token |
| GET | /api/recursos/ | Listar recursos | Pública |
| POST | /api/recursos/ | Crear recurso | Token |
| GET | /api/recursos/<id>/ | Obtener recurso | Pública |
| PUT | /api/recursos/<id>/ | Actualizar completo | Token |
| PATCH | /api/recursos/<id>/ | Actualizar parcial | Token |
| DELETE | /api/recursos/<id>/ | Eliminar recurso | Token |
| Auth (DRF) | POST | /api-token-auth/ | Obtener token | No |

> Las lecturas son públicas; las escrituras requieren TokenAuthentication.
> (\*) DELETE de un espacio con recursos asociados responde **409 Conflict** (ver sección 19).

## 12.1. Ejemplos de cuerpos JSON

### Crear Espacio

```json
{
  "nombre": "Auditorio Central",
  "ubicacion_bloque": "Bloque A",
  "aforo_maximo": 200,
  "estado_operativo": "OPERATIVO"
}
```

Estados válidos: OPERATIVO, MANTENIMIENTO, FUERA_DE_SERVICIO. `aforo_maximo` debe ser > 0.

### Crear Recurso Técnico

```json
{
  "nombre_equipo": "Consola digital",
  "codigo_inventario": "EV-SON-001",
  "costo_alquiler_mantenimiento": "250.00",
  "cantidad_stock": 3,
  "espacio": 1
}
```

- `codigo_inventario`: formato `EV-[A-Z]{3}-[0-9]{3}` (se normaliza a mayúsculas). Único.
- `costo_alquiler_mantenimiento`: decimal con max_digits=10, decimal_places=2, estrictamente > 0.
- `cantidad_stock`: >= 0 (entero).
- `espacio`: FK obligatoria. Debe existir. No se permite eliminar un espacio con recursos asociados (on_delete=PROTECT).

### Respuesta GET /api/recursos/ (con detalle de espacio)

```json
{
  "id": 1,
  "nombre_equipo": "Consola digital",
  "codigo_inventario": "EV-SON-001",
  "costo_alquiler_mantenimiento": "250.00",
  "cantidad_stock": 3,
  "espacio": 1,
  "espacio_detalle": {
    "id": 1,
    "nombre": "Auditorio Central",
    "ubicacion_bloque": "Bloque A"
  }
}
```

## 12.2. Uso de la API desde el navegador (Browsable API)

La API incluye la **Browsable API** de Django REST Framework: una interfaz web para ejecutar GET/POST/PUT/PATCH/DELETE sin usar curl ni Postman.

1. Abrir en el navegador: http://127.0.0.1:8000/api/
2. Aparece el índice con los recursos (Espacios, Recursos).
3. Para operaciones de escritura, hacer clic en **"Log in"** (arriba a la derecha) e ingresar `admin` / `admin123` (o `tester` / `tester123`).
4. Dentro de un recurso (p. ej. `/api/espacios/`):
   - Botón **GET**: lista los registros.
   - Formulario inferior (**HTML form**): completar campos y pulsar **POST** para crear.
   - En el detalle (`/api/espacios/<id>/`): formularios **PUT / PATCH** y botón **DELETE**.

Notas:

- Los **GET son públicos**; las escrituras requieren sesión autenticada (`IsAuthenticatedOrReadOnly`).
- El orden de renderers mantiene **JSON primero**, de modo que el cliente web (`:5510`) y los clientes de API siguen recibiendo JSON; el navegador (`Accept: text/html`) recibe HTML.
- Requiere `SessionAuthentication` (ya configurada) y las rutas `/api/auth/`.

## 13. Ejemplos de autenticación

### Obtener token

```bash
curl -X POST http://127.0.0.1:8000/api-token-auth/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"
```

Respuesta:

```json
{"token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
```

### Usar token en peticiones protegidas

```bash
curl -X POST http://127.0.0.1:8000/api/espacios/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -d '{"nombre":"Sala Pruebas","ubicacion_bloque":"Bloque B","aforo_maximo":80,"estado_operativo":"OPERATIVO"}'
```

## 14. Ejemplos de todos los filtros

| Filtro | URL | Descripción |
|---|---|---|
| espacio | GET /api/recursos/?espacio=1 | Recursos del espacio con id=1 |
| costo_min | GET /api/recursos/?costo_min=100 | costo_alquiler_mantenimiento >= 100 |
| costo_max | GET /api/recursos/?costo_max=500 | costo_alquiler_mantenimiento <= 500 |
| costo_min+costo_max | GET /api/recursos/?costo_min=100&costo_max=500 | Rango entre 100 y 500 |
| search (espacios) | GET /api/espacios/?search=auditorio | Busca en nombre y ubicación |
| search (recursos) | GET /api/recursos/?search=consola | Busca en nombre_equipo, codigo_inventario y nombre de espacio |

## 15. Pruebas automatizadas

```powershell
python manage.py test gestion_eventos
```

Cubren: lecturas públicas, bloqueos sin auth, operaciones con token, 404, filtros (espacio/costo_min/costo_max/rango/search), `espacio_detalle` y protección contra eliminación de espacio con recursos asociados.

## 16. Decisiones de seguridad e integridad referencial

- **Autenticación:** `rest_framework.authtoken` (TokenAuthentication). Lecturas públicas, escrituras requieren token. Configurado junto con SessionAuthentication para el panel admin.
- **Permisos:** `IsAuthenticatedOrReadOnly` aplicado globalmente.
- **CORS:** django-cors-headers con `CORS_ALLOWED_ORIGINS` explícito (5500 y 5510). No se usa `CORS_ALLOW_ALL_ORIGINS`.
- **Integridad referencial:** `on_delete=models.PROTECT` en FK `RecursoTecnico.espacio` → impide eliminar un espacio con recursos asociados.
- **Validación backend:** Validaciones explícitas en `Model.clean()` y en `Serializer.validate_*` (defensivas). No confiar solo en el frontend.
- **Seguridad:** SECRET_KEY/DEBUG vía `.env`; `.env` en `.gitignore`; `.env.example` con valores seguros. Sin credenciales hardcodeadas.
- **Unicidad + formato:** `codigo_inventario` único + regex `^EV-[A-Z]{3}-[0-9]{3}$`, normalizado a mayúsculas.
- **Estados controlados:** Solo OPERATIVO, MANTENIMIENTO, FUERA_DE_SERVICIO.

## 17. Lista de capturas recomendadas para evidencias

- **Backend/API:** GET /api/espacios/, GET /api/recursos/, POST exitoso (con token), PUT/PATCH exitoso, DELETE exitoso, error 400 por datos inválidos, bloqueo 401/403 sin autenticación, 404 con ID inexistente, respuesta con `espacio_detalle`, filtros por espacio/costos.
- **Panel Admin Django:** listados de Espacios/Recursos con list_display, search_fields, list_filter, y el **tema oscuro personalizado** aplicado.
- **Cliente web:** vista Resumen (KPIs + módulos), panel Espacios (crear, editar y eliminar), panel Inventario (crear, editar y eliminar + selector de espacios + filtros + tabla), panel Actividad&Auth (obtener token + estado API), notificaciones de éxito y errores del backend (incluye 409 al borrar espacio con recursos), estados de carga.
- **Pruebas:** salida de `manage.py test gestion_eventos` con `OK` y 11 tests.

## 18. Limitaciones conocidas y posibles mejoras

**Limitaciones actuales:**
- El cliente web usa localStorage solo para guardar el token (demo). No implementa refresh/expiración.
- Filtros manuales con `get_queryset()` (suficiente para la consigna). Podría migrarse a django-filter si se amplía.
- Validación de decimales: se exige hasta 2 decimales (no se acepta 3+).
- El puerto 5500 puede estar reservado por Windows; se recomienda 5510 (ambos permitidos por CORS).

**Mejoras posibles:**
- Añadir paginación DRF (PageNumberPagination) para listados grandes.
- CRUD completo desde frontend (editar/eliminar) con confirmaciones.
- Validación frontend más estricta para el código patrimonial en tiempo real.
- Manejo de errores con mensajes más descriptivos por campo.
- Dockerización para despliegue uniforme.

## 19. Integridad referencial: on_delete = PROTECT

- En `gestion_eventos/models.py`, el campo `RecursoTecnico.espacio` usa `on_delete=models.PROTECT`.
- Impide eliminar un `Espacio` que tenga `RecursoTecnico` asociados.

### Comportamiento al intentar eliminar un espacio con recursos asociados

Al intentar eliminar un Espacio con recursos asociados vía API (`DELETE /api/espacios/<id>/`), la respuesta es:

```
Código HTTP: 409 Conflict
```

```json
{"detail": "No se puede eliminar este espacio porque tiene recursos técnicos asociados."}
```

## 20. Resultados de las pruebas

Comando: `python manage.py test gestion_eventos`

```text
Creating test database for alias 'default'...
Found 11 test(s).
System check identified no issues (0 silenced).
...........
----------------------------------------------------------------------
Ran 11 tests in 24.355s
OK
Destroying test database for alias 'default'...
```

11/11 OK.

## 21. Variables de entorno y seguridad

- SECRET_KEY, DEBUG, ALLOWED_HOSTS y CORS_ALLOWED_ORIGINS se leen desde `.env` con python-dotenv.
- Valor de respaldo de desarrollo para SECRET_KEY (`dev-secret-key`) solo para uso local; nunca clave real en producción.
- `.env` excluido en `.gitignore` (incluye `env/`, `.env`, `venv/`, `.venv/`, `__pycache__/`, `*.py[cod]`, `*.sqlite3`, `*.db`, `staticfiles/`, `media/`, `*.log`).
- Solo se entrega `.env.example` con valores ficticios/ejemplo, sin credenciales reales.

## 22. Personalización del panel de administración

El admin de Django **no se modifica dentro del virtualenv**. Se personaliza sobrescribiendo plantillas y estáticos en el propio proyecto. Estructura utilizada:

```
templates/admin/base_site.html   # branding + carga del CSS propio
static/css/admin_custom.css      # tema oscuro (ámbar/cian)
```

Configuración necesaria en `eventflow/settings.py`:

```python
TEMPLATES = [{
    ...,
    'DIRS': [BASE_DIR / 'templates'],
    'APP_DIRS': True,
    ...
}]

STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
```

Branding en `eventflow/urls.py`:

```python
admin.site.site_header = "EventFlow · Administración"
admin.site.site_title = "EventFlow"
admin.site.index_title = "Centro de Control"
```

`templates/admin/base_site.html` extiende `admin/base.html` y sobreescribe:

- `{% block branding %}`: logo/texto "EventFlow · Centro de Control".
- `{% block title %}`: título de la pestaña.
- `{% block extrastyle %}`: carga `css/admin_custom.css` con `{% static %}`.

`static/css/admin_custom.css` define el tema oscuro reutilizando las variables CSS nativas del admin (`--header-bg`, `--body-bg`, `--accent`, `--link-fg`, `--primary`, etc.), forzando el esquema oscuro con `color-scheme: dark`. No se reemplazan plantillas internas de Django.

Pulido adicional en `gestion_eventos/admin.py`:

- `list_per_page = 25`, `save_on_top = True`
- `date_hierarchy = 'creado_en'` en Espacio
- `list_editable` para `estado_operativo` (Espacio) y `cantidad_stock` (Recurso)
- `autocomplete_fields = ('espacio',)` en Recurso

**Importante (desarrollo):** si el panel muestra "Sin estilos" u hojas de 404, verificar que `STATICFILES_DIRS` apunta a `BASE_DIR / 'static'` y que existe `static/css/admin_custom.css`.

## Comprobación final

- [x] Proyecto Django funcional, migraciones aplicadas
- [x] Modelos con validaciones, FK PROTECT, unicidad código inventario
- [x] Admin configurado con filtros/búsqueda + tema oscuro personalizado
- [x] API DRF con ModelViewSet + router + filtros manuales
- [x] Serializers con espacio_detalle + validaciones defensivas
- [x] TokenAuth + IsAuthenticatedOrReadOnly (lecturas públicas, escrituras protegidas)
- [x] CORS explícito vía .env (5500 y 5510)
- [x] Frontend Vanilla "EventFlow Control Room" (HTML/CSS/JS) con CRUD (crear, editar, eliminar) consumiendo API real
- [x] Browsable API de DRF habilitada para GET/POST/PUT/PATCH/DELETE desde el navegador
- [x] Pruebas APITestCase cubriendo casos requeridos (11/11 OK)
- [x] .env.example, .gitignore, requirements.txt actualizados
