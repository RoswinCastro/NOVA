<div align="center">

# NOVA

### Sistema de gestión de armamento con soporte NFC

Aplicación web destinada al control de armas, cargadores, personal militar, parques y movimientos de entrada y salida mediante una interfaz centralizada.

![React](https://img.shields.io/badge/React-TypeScript-149ECA?logo=react\&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite\&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js\&logoColor=white)
![Express](https://img.shields.io/badge/Express-API-000000?logo=express\&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql\&logoColor=white)
![NFC](https://img.shields.io/badge/Web_NFC-Compatible-5C2D91)

</div>

---

## Descripción

**NOVA** es un sistema web diseñado para facilitar la administración y supervisión del armamento institucional. Permite gestionar armas, cargadores, personal militar, parques y movimientos de entrada y salida desde una plataforma centralizada.

El sistema incorpora lectura de etiquetas mediante **Web NFC**, lo que permite identificar registros utilizando dispositivos móviles compatibles y reducir el tiempo empleado en los procesos de control.

---

## Tabla de contenido

* [Características](#características)
* [Tecnologías](#tecnologías)
* [Arquitectura](#arquitectura)
* [Estructura del proyecto](#estructura-del-proyecto)
* [Requisitos previos](#requisitos-previos)
* [Instalación](#instalación)
* [Configuración de la base de datos](#configuración-de-la-base-de-datos)
* [Variables de entorno](#variables-de-entorno)
* [Ejecución del proyecto](#ejecución-del-proyecto)
* [URLs locales](#urls-locales)
* [Lectura NFC](#lectura-nfc)
* [Roles del sistema](#roles-del-sistema)
* [Scripts disponibles](#scripts-disponibles)
* [Solución de problemas](#solución-de-problemas)
* [Seguridad](#seguridad)
* [Repositorio](#repositorio)

---

## Características

### Gestión administrativa

* Registro y administración de armas.
* Registro y administración de cargadores.
* Gestión del personal militar.
* Gestión de parques de armamento.
* Consulta y actualización de registros.
* Configuración del tema y la interfaz.

### Control de movimientos

* Registro de entrada de armas.
* Registro de salida de armas.
* Consulta del historial de movimientos.
* Seguimiento de los movimientos asociados al personal.
* Identificación de registros mediante etiquetas NFC.

### Acceso por roles

* Separación de funcionalidades según el rol del usuario.
* Acceso administrativo a los módulos de gestión.
* Acceso operativo a los módulos de registro e historial.

---

## Tecnologías

### Frontend

| Tecnología   | Uso                                 |
| ------------ | ----------------------------------- |
| React        | Construcción de la interfaz         |
| TypeScript   | Tipado estático                     |
| Vite         | Entorno de desarrollo y compilación |
| Tailwind CSS | Diseño y estilos                    |
| Axios        | Comunicación con la API             |
| Lucide React | Iconografía                         |

### Backend

| Tecnología      | Uso                                         |
| --------------- | ------------------------------------------- |
| Node.js         | Entorno de ejecución                        |
| Express         | Desarrollo de la API                        |
| MySQL / MariaDB | Base de datos relacional                    |
| mysql2          | Conexión con la base de datos               |
| dotenv          | Gestión de variables de entorno             |
| cors            | Configuración de solicitudes entre orígenes |

### Funcionalidad NFC

| Tecnología  | Uso                                                          |
| ----------- | ------------------------------------------------------------ |
| Web NFC API | Lectura de etiquetas NFC desde dispositivos compatibles      |
| NDEF        | Interpretación de los registros almacenados en las etiquetas |

---

## Arquitectura

El proyecto está dividido en dos aplicaciones principales:

```text
┌──────────────────────────────┐
│          Frontend            │
│ React + TypeScript + Vite    │
└──────────────┬───────────────┘
               │ HTTP / Axios
               ▼
┌──────────────────────────────┐
│           Backend            │
│      Node.js + Express       │
└──────────────┬───────────────┘
               │ mysql2
               ▼
┌──────────────────────────────┐
│        Base de datos         │
│       MySQL / MariaDB        │
└──────────────────────────────┘
```

El frontend se comunica con el backend mediante solicitudes HTTP. El backend procesa las operaciones y consulta la base de datos MySQL o MariaDB.

---

## Estructura del proyecto

```text
Nova-alpha/
├── database/
│   └── control_armamento_nfc.sql
│
├── server/
│   ├── index.js
│   ├── package.json
│   └── .env
│
├── src/
│   ├── app/
│   │   ├── components/
│   │   ├── services/
│   │   └── utils/
│   ├── imports/
│   └── styles/
│
├── package.json
├── vite.config.ts
└── README.md
```

### Directorios principales

| Directorio            | Descripción                                     |
| --------------------- | ----------------------------------------------- |
| `database/`           | Contiene el archivo SQL de la base de datos     |
| `server/`             | Contiene el servidor, la API y su configuración |
| `src/app/components/` | Componentes reutilizables de la interfaz        |
| `src/app/services/`   | Servicios encargados de comunicarse con la API  |
| `src/app/utils/`      | Funciones auxiliares                            |
| `src/imports/`        | Recursos e importaciones del proyecto           |
| `src/styles/`         | Estilos globales y configuraciones visuales     |

---

## Requisitos previos

Antes de instalar el proyecto, asegúrate de contar con:

* [Node.js](https://nodejs.org/) versión 20 o superior.
* npm.
* Git.
* MySQL o MariaDB.
* Un navegador web moderno.
* Chrome en Android para utilizar Web NFC.
* Un dispositivo móvil con NFC para probar la lectura de etiquetas.

Comprueba las versiones instaladas ejecutando:

```bash
node --version
npm --version
git --version
```

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/RoswinCastro/NOVA.git
cd NOVA
```

### 2. Instalar las dependencias del frontend

Desde la carpeta principal:

```bash
npm install
```

### 3. Instalar las dependencias del backend

```bash
cd server
npm install
cd ..
```

---

## Configuración de la base de datos

El proyecto incluye el archivo:

```text
database/control_armamento_nfc.sql
```

Este archivo debe importarse en una base de datos MySQL o MariaDB llamada:

```text
control_armamento_nfc
```

### Opción 1: importar desde la terminal

```bash
mysql -u root -p -e "CREATE DATABASE control_armamento_nfc;"
mysql -u root -p control_armamento_nfc < database/control_armamento_nfc.sql
```

### Opción 2: importar desde phpMyAdmin

1. Abre phpMyAdmin.
2. Crea una base de datos llamada `control_armamento_nfc`.
3. Selecciona la base de datos.
4. Ingresa en la sección **Importar**.
5. Selecciona el archivo `database/control_armamento_nfc.sql`.
6. Ejecuta la importación.

### Opción 3: importar desde MySQL Workbench

1. Abre MySQL Workbench.
2. Conéctate al servidor local.
3. Crea el esquema `control_armamento_nfc`.
4. Abre el archivo `database/control_armamento_nfc.sql`.
5. Ejecuta el script.

---

## Variables de entorno

Crea un archivo llamado `.env` dentro de la carpeta `server`:

```text
server/.env
```

Agrega las siguientes variables:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=control_armamento_nfc
PORT=3000
```

### Descripción de las variables

| Variable      | Descripción                             |
| ------------- | --------------------------------------- |
| `DB_HOST`     | Dirección del servidor de base de datos |
| `DB_USER`     | Usuario de MySQL o MariaDB              |
| `DB_PASSWORD` | Contraseña del usuario                  |
| `DB_NAME`     | Nombre de la base de datos              |
| `PORT`        | Puerto utilizado por el backend         |

> [!IMPORTANT]
> No publiques el archivo `server/.env` en GitHub. Este archivo puede contener credenciales privadas de la base de datos.

Se recomienda agregarlo al archivo `.gitignore`:

```gitignore
server/.env
.env
node_modules/
dist/
```

También puedes crear un archivo `server/.env.example` para documentar las variables necesarias:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=control_armamento_nfc
PORT=3000
```

---

## Ejecución del proyecto

Para utilizar NOVA deben ejecutarse el backend y el frontend simultáneamente.

### Iniciar el backend

Abre una terminal en la carpeta principal y ejecuta:

```bash
cd server
npm run start
```

Para utilizar el modo de desarrollo:

```bash
cd server
npm run dev
```

### Iniciar el frontend

Abre una segunda terminal en la carpeta principal y ejecuta:

```bash
npm run dev
```

---

## URLs locales

Una vez iniciados ambos servicios, estarán disponibles en:

| Servicio | URL                     |
| -------- | ----------------------- |
| Frontend | `http://localhost:5173` |
| Backend  | `http://localhost:3000` |

---

## Lectura NFC

NOVA utiliza la API **Web NFC** para leer etiquetas NFC desde dispositivos compatibles.

### Requisitos habituales

* Dispositivo Android con NFC.
* NFC activado en el dispositivo.
* Navegador Google Chrome compatible.
* Permiso de lectura NFC concedido al navegador.
* Aplicación ejecutada mediante `localhost` o una conexión HTTPS segura.
* Etiqueta NFC compatible con registros NDEF.

> [!NOTE]
> La compatibilidad con Web NFC depende del navegador y del dispositivo. Generalmente, esta funcionalidad está disponible en Chrome para Android y no funciona de la misma manera en navegadores de escritorio o dispositivos iOS.

### Comportamiento de etiquetas vacías

Cuando una etiqueta no contiene registros NDEF útiles, NOVA la interpreta como una etiqueta vacía. En este caso, la aplicación no registra automáticamente ningún movimiento.

### Pruebas sin etiquetas NFC

El resto del sistema puede probarse desde una computadora sin contar con etiquetas NFC. Para comprobar específicamente la lectura NFC se requiere un dispositivo móvil compatible y una etiqueta física.

---

## Roles del sistema

### Administrador

El administrador tiene acceso a los siguientes módulos:

* Gestión de armas.
* Gestión de cargadores.
* Gestión de personal militar.
* Gestión de parques.
* Registro de movimientos.
* Historial de movimientos.
* Configuración y ajustes.

### Usuario

El usuario tiene acceso a:

* Registro de movimientos.
* Historial de movimientos.
* Configuración y ajustes.

---

## Scripts disponibles

### Frontend

Ejecutar el entorno de desarrollo:

```bash
npm run dev
```

Generar la versión de producción:

```bash
npm run build
```

Previsualizar la versión compilada:

```bash
npm run preview
```

### Backend

Iniciar el servidor:

```bash
cd server
npm run start
```

Iniciar el servidor en modo de desarrollo:

```bash
cd server
npm run dev
```

---

## Compilación para producción

Para generar la versión optimizada del frontend:

```bash
npm run build
```

Los archivos compilados se almacenarán en:

```text
dist/
```

Para previsualizar la compilación:

```bash
npm run preview
```

---

## Solución de problemas

### El backend no se conecta a la base de datos

Comprueba que:

* MySQL o MariaDB esté iniciado.
* La base de datos `control_armamento_nfc` exista.
* Las credenciales de `server/.env` sean correctas.
* El usuario de la base de datos tenga permisos.
* El puerto de MySQL no esté siendo utilizado por otra instalación.

### El frontend no se comunica con el backend

Verifica que:

* El backend esté ejecutándose en `http://localhost:3000`.
* La URL de la API esté correctamente configurada.
* La configuración de CORS permita solicitudes desde `http://localhost:5173`.
* No existan errores en la consola del navegador.

### La lectura NFC no funciona

Comprueba que:

* Estás utilizando Chrome en Android.
* El dispositivo tiene NFC.
* El NFC está activado.
* El navegador tiene permiso para utilizar NFC.
* La aplicación está abierta mediante `localhost` o HTTPS.
* La etiqueta contiene información compatible con NDEF.

### El puerto ya está ocupado

Si el puerto `3000` o `5173` está siendo utilizado, identifica el proceso correspondiente o cambia el puerto configurado.

En Windows:

```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :5173
```

---

## Seguridad

Para mantener segura la configuración del proyecto:

* No publiques archivos `.env`.
* No almacenes contraseñas directamente en el código.
* Utiliza credenciales diferentes en producción.
* Limita los permisos del usuario de la base de datos.
* Valida los datos recibidos por el backend.
* Utiliza HTTPS en entornos de producción.
* Mantén actualizadas las dependencias.
* Revisa periódicamente posibles vulnerabilidades:

```bash
npm audit
```

Para aplicar correcciones compatibles:

```bash
npm audit fix
```

---

## Repositorio

Repositorio oficial:

```text
https://github.com/RoswinCastro/NOVA
```

Para descargar futuras actualizaciones:

```bash
git pull origin main
```

Para subir nuevos cambios:

```bash
git add .
git commit -m "descripción de los cambios"
git push origin main
```

---

<div align="center">

**NOVA — Sistema de gestión y control de armamento con tecnología NFC**

</div>
