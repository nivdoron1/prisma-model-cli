# Prisma Model CLI Generator 🛠️

A lightweight CLI tool to auto-generate a scalable folder structure for your Prisma models using TypeScript. It creates boilerplate files for each model, including:

- `service.ts` – Service layer based on a generic Prisma service
- `controller.ts` – Controller extending a base controller
- `routes.ts` – REST API routes using Express
- `<Model>.ts` – Wrapper class exposing service, controller, and routes
- `index.ts` – Centralized exports for all models

---

## 📦 Generated Structure

```

models/
├── index.ts
├── User/
│   ├── User.ts
│   ├── controller.ts
│   ├── routes.ts
│   └── service.ts
├── Store/
│   ├── Store.ts
│   ├── controller.ts
│   ├── routes.ts
│   └── service.ts
├── Transaction/
│   ├── Transaction.ts
│   ├── controller.ts
│   ├── routes.ts
│   └── service.ts
├── TransactionProduct/
│   ├── TransactionProduct.ts
│   ├── controller.ts
│   ├── routes.ts
│   └── service.ts
...

```

---

## 🚀 Installation

1. **Clone or download the CLI script:**

   ```bash
   git clone https://github.com/your-org/prisma-model-cli.git
   cd prisma-model-cli

````

2. **Make it executable:**

   ```bash
   chmod +x prisma-model-cli
   ```

3. **(Optional) Add to global path:**

   ```bash
   sudo ln -s $(pwd)/prisma-model-cli /usr/local/bin/prismagen
   ```

---

## ⚙️ Usage

Make sure your Prisma schema is defined at `./prisma/schema.prisma`.

Run the CLI:

```bash
./prisma-model-cli
```

Or globally if symlinked:

```bash
prismagen
```

The script will:

* ✅ Parse all `model` declarations in `schema.prisma`
* ✅ Create a folder under `models/<ModelName>/` for each model
* ✅ Generate `service.ts`, `controller.ts`, `routes.ts`, and `<Model>.ts`
* ✅ Add an export in `models/index.ts` (only if not already present)
* ⚠️ Skip files if they already exist to prevent overwriting

---

## 🧪 Example Output for Model `TransactionProduct`

```ts
// models/TransactionProduct/TransactionProduct.ts
import TransactionProductService from './service';
import TransactionProductController from './controller';
import TransactionProductRoutes from './routes';

export default class TransactionProducts {
  public service = TransactionProductService;
  public controller = TransactionProductController;
  public routes = TransactionProductRoutes;

  constructor() {}
}
```

---

## 📄 Requirements

* Node.js + TypeScript project
* Prisma properly set up
* Base classes:

  * `GenericPrismaService`
  * `BaseController`
  * `createBaseRoutes`

---

## 🧠 Notes

* The CLI is **idempotent**: It won't overwrite existing files.
* You can modify the script to support `--force` or custom schema paths if needed.

---

## 📬 Contribute

PRs welcome! Add features like:

* Custom template folders
* ESM/TS compatibility flags
* Integration with code formatters

---

## 🪪 License

MIT © 2025 Your Name / Org

```

Let me know if you'd like a Hebrew version, CLI flags like `--model User`, `--force`, or auto-detection of `tsconfig.json` paths.
