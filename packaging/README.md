# 📺 PelisStream v2 - Smart TV Packaging Suite
**Arquitectura y Herramientas Automatizadas de Empaquetado para LG webOS & Samsung Tizen**

Esta suite proporciona scripts de empaquetado nativos, ligeros y de alto rendimiento para generar binarios oficiales de Smart TV sin requerir la instalación obligatoria de los pesados SDKs de fabricante (`ares-cli` o `Tizen Studio`).

---

## 📁 Estructura del Directorio `packaging/`

```
packaging/
├── webos/
│   └── appinfo.json              # Manifiesto oficial webOS TV (com.pelisstream.app v2.0.0)
├── tizen/
│   ├── config.xml                # Manifiesto oficial Tizen TV (http://pelisstream.app/PelisStream v2.0.0)
│   └── certs/                    # Almacén de certificados de firma digital (author & distributor)
├── package-webos.js              # Empaquetador nativo .ipk (Debian ar/tar.gz)
├── package-tizen.js              # Empaquetador y firmador XMLDSig .wgt (W3C Widgets)
├── package-all.js                # Orquestador unificado de empaquetado
└── README.md                     # Guía técnica de arquitectura y despliegue
```

---

## 1. 🟢 LG webOS (.ipk)

### Manifiesto: `packaging/webos/appinfo.json`
Cumple con las especificaciones del webOS Web App Runtime:
- **`id`**: `"com.pelisstream.app"`
- **`version`**: `"2.0.0"`
- **`type`**: `"web"`
- **`main`**: `"index.html"`
- **`resolution`**: `"1920x1080"` (Full HD TV standard)
- **`disableBackHistoryAPI`**: `true` ⚠️ *(VITAL: Evita que webOS intercepte la tecla Back del control remoto como navegación del historial del navegador, permitiendo al motor de navegación espacial de PelisStream gestionar el cierre de modales y diálogos de salida).*
- **`vendor`**: `"PelisStream"`
- **`icon`** / **`largeIcon`** / **`splashBackground`**: `icon.png` (80x80), `largeIcon.png` (130x130), `splash.png` (1920x1080).

### Arquitectura del Script: `package-webos.js`
El formato `.ipk` de webOS es un contenedor de paquetes Debian (`ar` archive) estructurado con:
1. `debian-binary`: Encabezado de versión `2.0\n`.
2. `control.tar.gz`: Metadatos leídos por `opkg` y `appinstalld` en webOS:
   - `Package`: `com.pelisstream.app`
   - `Version`: `2.0.0`
   - `Installed-Size`: Calculado automáticamente en KiB.
   - `webOS-Package-Format-Version`: `2`
3. `data.tar.gz`: Carga útil del televisor:
   - `usr/palm/applications/com.pelisstream.app/`: Contiene los archivos estáticos (`index.html`, `assets/`, `appinfo.json`, `icon.png`, etc.).
   - `usr/palm/packages/com.pelisstream.app/packageinfo.json`: Registro del paquete.

> **Prevención de Errores de Firmware**: El script normaliza los timestamps a la fecha de compilación para evitar el error común de firmware webOS donde timestamps en epoch 0 (`1969-12-31`) hacen fallar al `pkgverifier`.

### Ejecución:
```bash
node packaging/package-webos.js
# Salida: dist-packages/com.pelisstream.app_2.0.0_all.ipk
```

### Opciones CLI:
- `--dist <ruta>`: Directorio con los archivos compilados (default: `../dist`).
- `--out <ruta>`: Directorio de salida (default: `../dist-packages`).
- `--dry-run`: Valida y arma el árbol sin escribir el archivo final `.ipk`.
- `-v, --verbose`: Muestra el registro detallado.

### Instalación en Televisor LG webOS:
```bash
# Vía webOS CLI (si está instalado):
ares-install dist-packages/com.pelisstream.app_2.0.0_all.ipk -d <tv-device-name>
ares-launch com.pelisstream.app -d <tv-device-name>

# Vía webOS Dev Manager (interfaz gráfica):
# Arrastrar y soltar el archivo .ipk generado directamente en la interfaz.
```

---

## 2. 🔵 Samsung Tizen (.wgt)

### Manifiesto: `packaging/tizen/config.xml`
Cumple con la especificación W3C Widget Packaging y las extensiones Samsung Smart TV:
- **`id`**: `"http://pelisstream.app/PelisStream"`
- **`tizen:application id`**: `"PelisStream.PelisStream"`
- **`version`**: `"2.0.0"`
- **`screen-orientation`**: `"landscape"` (Forzado para televisores)
- **`<access origin="*" subdomains="true"/>`**: Permite peticiones de red hacia proveedores y metadatos externos (Cinemeta API).
- **`<tizen:allow-navigation href="*"/>`**: Habilita la reproducción de streams e iframes de proveedores externos.
- **Privilegios**:
  - `http://tizen.org/privilege/internet`: Acceso completo a red/sockets.
  - `http://tizen.org/privilege/tv.inputdevice`: **Imprescindible** para capturar teclas multimedia y flechas del control remoto Samsung Smart Control.
  - `http://tizen.org/privilege/application.launch`: Lanzamiento de la aplicación.

### Arquitectura del Script: `package-tizen.js`
En Tizen TV Web Runtime, un archivo `.wgt` es un archivo ZIP que **exige firmas digitales criptográficas XMLDSig**:
1. `author-signature.xml`:
   - Firma todos los recursos de la aplicación (`config.xml`, `index.html`, `assets/`, etc.).
   - Rol: `http://www.w3.org/ns/widgets-digsig#role-author`.
   - Firmado con la clave privada de Autor (`author.key`).
2. `signature1.xml`:
   - Firma todos los recursos de la aplicación **más** `author-signature.xml`.
   - Rol: `http://www.w3.org/ns/widgets-digsig#role-distributor`.
   - Firmado con la clave privada del Distribuidor (`distributor.key`).

> **Persistencia Criptográfica**: Las credenciales se conservan en `packaging/tizen/certs/`. Si no existen, se generan automáticamente con OpenSSL (RSA 2048-bit, vigencia 10 años). Mantener la misma clave de autor es obligatorio para que el televisor Samsung admita actualizaciones futuras sin error `118, -12`.

### Ejecución:
```bash
node packaging/package-tizen.js
# Salida: dist-packages/PelisStream_2.0.0.wgt
```

### Opciones CLI:
- `--dist <ruta>`: Directorio con los archivos compilados (default: `../dist`).
- `--out <ruta>`: Directorio de salida (default: `../dist-packages`).
- `--author-cert <ruta>`: Certificado X.509 de autor personalizado.
- `--distributor-cert <ruta>`: Certificado X.509 de distribuidor personalizado.
- `--dry-run`: Valida firmas y hashes sin generar el `.wgt`.
- `-v, --verbose`: Muestra el registro detallado.

### Instalación en Televisor Samsung Tizen:
```bash
# 1. En el televisor: Abrir Apps -> teclear "12345" con el control -> Activar Developer Mode -> Ingresar la IP de tu PC -> Reiniciar TV
# 2. Conectar mediante SDB (Smart Development Bridge):
sdb connect <IP_DEL_TELEVISOR>:26101

# 3. Instalar el paquete firmado:
sdb install dist-packages/PelisStream_2.0.0.wgt

# 4. Iniciar la aplicación:
tizen run -p PelisStream.PelisStream
```

---

## 3. 🚀 Empaquetado Unificado

Para generar ambos binarios de Smart TV en un solo paso:
```bash
node packaging/package-all.js
```
O agregando a `package.json`:
```json
"scripts": {
  "package:webos": "node packaging/package-webos.js",
  "package:tizen": "node packaging/package-tizen.js",
  "package": "node packaging/package-all.js"
}
```
