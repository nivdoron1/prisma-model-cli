# 📦 PrismaGen CLI

**PrismaGen** is a flexible CLI tool that auto-generates a scalable API structure from your `schema.prisma` file.

Supports:

* ✅ NestJS (TypeScript)
* ✅ Express (TypeScript or JavaScript)
* ✅ TypeScript API Client via Swagger/OpenAPI

---

## 🚀 Installation

```bash
npm install -g prisma-model-cli
````

install locally:

```bash
npm install prisma-model-cli
```

---

## 🔧 Usage

```bash
prismagen
```

You can also use flags to skip the interactive dialog:

### ▶️ CLI Options

| Command                           | Description                                                |
| --------------------------------- | ---------------------------------------------------------- |
| `prismagen`                       | Launch interactive API structure dialog                    |
| `prismagen --express`             | Generate Express API structure (TypeScript)                |
| `prismagen --express --output-js` | Generate Express API structure (JavaScript)                |
| `prismagen --nestjs`              | Generate NestJS API structure (TypeScript)                 |
| `prismagen generate swagger`      | Generate NestJS structure and Swagger-based TypeScript SDK |
| `prismagen --help` or `-h`        | Show CLI help                                              |
| `prismagen --version` or `-v`     | Show installed version                                     |

---

## 📁 Output Structure

Depending on your schema, PrismaGen will create folders under `/models/<model-name>/` containing:

* `controller.ts` / `controller.js`
* `service.ts` / `service.js`
* `dto/` (for NestJS only)
* `routes/` (for Express)
* `baseController`, `baseService`, and shared types

Example:

```
models/
  └── user/
      ├── user.controller.ts
      ├── user.service.ts
      ├── dto/
      │   ├── create-user.dto.ts
      │   └── update-user.dto.ts
```

---

## 🧬 Generate Swagger TypeScript Client

To generate a TypeScript SDK using `openapi-generator-cli` from your running NestJS Swagger endpoint:

```bash
prismagen generate swagger
```

You'll be prompted to:

1. Enter the Swagger JSON URL (defaults to `http://localhost:3000/api-json`)
2. Choose the output directory (defaults to `../client/src/app/api`)

The CLI will:

* Run NestJS model generation via `run.ts`
* Validate the Swagger endpoint is reachable
* Generate a TypeScript Axios client via OpenAPI Generator

---

## ⚙️ Prerequisites

Ensure your project has:

* Prisma installed and set up:

  ```bash
  npm install prisma @prisma/client
  npx prisma init
  ```

* A valid `schema.prisma` in `/prisma/schema.prisma`

Run:

```bash
npx prisma generate
```

---

## 🧠 How It Works

1. Parses all models from your Prisma schema.
2. Generates base CRUD logic (`BaseController`, `GenericPrismaService`).
3. Outputs language-specific files based on the selected mode.
4. Optionally, generates a Swagger client using `openapi-generator-cli`.

---

## 🛠 Dev Setup (if modifying CLI)

1. Clone this repo

2. Build the CLI:

   ```bash
   npm install
   npm run build
   ```

3. Link it globally to use `prismagen` from anywhere:

   ```bash
   npm link
   ```

---

## 🧩 Future Features

* Support for custom middleware
* Soft deletes
* Swagger docs out of the box
* Authentication scaffolding (JWT, session-based)

---

## 📬 Issues / Contributions

Open issues or PRs on [GitHub](https://github.com/nivdoron1/prisma-model-cli.git)

We welcome contributions!
