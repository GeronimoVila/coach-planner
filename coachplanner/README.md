# 🏆 CoachPlanner - Sistema de Gestión Deportiva

<p align="left">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

---

## 📝 Visión General
**CoachPlanner** es una solución FullStack diseñada para optimizar la reserva de clases y la gestión de créditos en centros deportivos. El sistema resuelve la problemática de la vigencia de pagos mediante un motor de créditos con lógica **FIFO** (First-In, First-Out).

---

## 💡 Desafíos Técnicos Resueltos
> [!IMPORTANT]
> **Lógica de Créditos FIFO:** Implementación de un algoritmo en el backend para descontar automáticamente los créditos más próximos a vencer, asegurando transparencia para el alumno.

* **Arquitectura de Datos:** Diseño de un modelo relacional complejo con **Prisma** para manejar categorías de usuarios, organizaciones y cronogramas semanales.
* **Manejo de Concurrencia:** Lógica de reservas diseñada para prevenir el *overbooking* asegurando la integridad del saldo y cupos de la clase.
* **Estructura Monorepo:** Organización escalable utilizando **pnpm workspaces** para separar la API, la Web y la base de datos.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, Shadcn/UI |
| **Backend** | NestJS, Node.js |
| **Persistencia** | PostgreSQL + Prisma ORM |
| **Infraestructura** | Docker & Docker Compose |
| **Gestor de Paquetes** | pnpm |

---

## 📂 Estructura del Proyecto
* **`apps/api`**: Servidor NestJS. Contiene los módulos de autenticación, reservas y gestión de usuarios.
* **`apps/web`**: Aplicación frontend construida con Next.js.
* **`packages/database`**: Capa de datos que gestiona el esquema de Prisma y las migraciones.

---

## 🔧 Instalación y Setup Local

### 1. Requisitos Previos
* **Node.js** (v18 o superior)
* **pnpm** (`npm install -g pnpm`)
* **Docker Desktop** (Debe estar iniciado)

### 2. Preparación del Entorno
Clona el repositorio e instala las dependencias desde la raíz:
```bash
git clone [https://github.com/GeronimoVila/coach-planner.git](https://github.com/GeronimoVila/coach-planner.git)
cd coach-planner
pnpm install
```

Configura el entorno: Copia los archivos de ejemplo y ajusta las variables si es necesario:
```bash
cp .env.example .env
# Repetir en apps/api y packages/database si se requiere configuración específica
```

### 3. Base de Datos e Infraestructura
Levanta PostgreSQL mediante Docker:
```bash
docker compose up -d
```

Sincroniza el esquema de la base de datos:
```bash
pnpm --filter database prisma migrate dev
```

### 4. Ejecución del Sistema
Para que la aplicación funcione, debes iniciar ambos servicios en terminales separadas:

Terminal A (Backend):
```bash
cd apps/api
pnpm run start:dev
```

Terminal B (Frontend):
```bash
cd apps/web
pnpm dev
```


### 🧪 Datos de Prueba (Seed)
Tras ejecutar las migraciones, puedes acceder con las siguientes credenciales de prueba:

| Rol | Usuario / Email | Contraseña | Acción Sugerida |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@coachplanner.com` | `admin123` | Gestionar clases y créditos |
| **Alumno** | `alumno@test.com` | `user123` | Reservar y cancelar clases |


## 🚀 Funcionalidades del MVP

✅ Gestión de Créditos: Carga manual por parte del Admin y control de vencimientos.

✅ Reservas Inteligentes: Validación automática de categoría y saldo antes de confirmar.

✅ Panel de Control: Dashboard para que el profesor gestione el cronograma semanal.

✅ Notificaciones: Sistema integrado para avisar sobre cambios en las clases.