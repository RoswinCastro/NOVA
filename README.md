# NOVA

Sistema de gestion de armas, personal y movimientos con soporte de lectura NFC.

## Funcionalidades

- Gestion de armas
- Gestion de cargadores
- Gestion de personal militar
- Registro de entrada y salida de armas
- Historial de movimientos
- Gestion de parques
- Ajustes de tema e interfaz
- Lectura NFC desde dispositivos compatibles

## Tecnologias

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Axios
- Lucide React

### Backend
- Node.js
- Express
- MySQL / MariaDB
- mysql2
- dotenv
- cors

## Estructura del proyecto

```text
Nova-alpha/
├─ database/
│  └─ control_armamento_nfc.sql
├─ server/
│  ├─ index.js
│  ├─ package.json
│  └─ .env
├─ src/
│  ├─ app/
│  │  ├─ components/
│  │  ├─ services/
│  │  └─ utils/
│  ├─ imports/
│  └─ styles/
├─ package.json
├─ vite.config.ts
└─ README.md
