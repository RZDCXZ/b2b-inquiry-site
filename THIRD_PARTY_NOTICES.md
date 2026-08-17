# Third-party notices

Torquelis 应用代码和自有展示素材没有随仓库授予开源许可证。下表只记录本项目直接使用的第三方软件、字体与运行镜像；这些项目仍适用各自许可证。确切解析版本由 `pnpm-lock.yaml` 锁定，完整传递依赖可在安装后用 `corepack pnpm licenses list --json` 检查，其许可证文本随对应的 `node_modules/<package>` 包分发。

## Runtime software and fonts

| Package / asset | Version | License | Source |
| --- | --- | --- | --- |
| Barlow Condensed, Inter, Noto Sans SC via Fontsource | 5.3.0 packages | OFL-1.1 | [Fontsource font files](https://github.com/fontsource/font-files) |
| `@pdf-lib/fontkit`, `pdf-lib` | 1.1.1, 1.17.1 | MIT | [pdf-lib](https://github.com/Hopding/pdf-lib) |
| `@phosphor-icons/react` | 2.1.10 | MIT | [Phosphor Icons](https://github.com/phosphor-icons/react) |
| `@prisma/adapter-pg`, `@prisma/client` | 7.9.1 | Apache-2.0 | [Prisma](https://github.com/prisma/prisma) |
| `better-auth` | 1.6.27 | MIT | [Better Auth](https://github.com/better-auth/better-auth) |
| `dotenv` | 17.4.2 | BSD-2-Clause | [dotenv](https://github.com/motdotla/dotenv) |
| `exceljs` | 4.4.0 | MIT | [ExcelJS](https://github.com/exceljs/exceljs) |
| `next` | 16.3.0 | MIT | [Next.js](https://github.com/vercel/next.js) |
| `pg` | 8.23.0 | MIT | [node-postgres](https://github.com/brianc/node-postgres) |
| `react`, `react-dom` | 19.2.8 | MIT | [React](https://github.com/facebook/react) |
| `zod` | 4.4.3 | MIT | [Zod](https://github.com/colinhacks/zod) |

## Development and verification tools

| Package group | Version | License | Source |
| --- | --- | --- | --- |
| `@playwright/test` | 1.62.1 | Apache-2.0 | [Playwright](https://github.com/microsoft/playwright) |
| `@tailwindcss/postcss`, `tailwindcss` | 4.3.3 | MIT | [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) |
| `@types/node`, `@types/pg`, `@types/react`, `@types/react-dom` | package.json / lockfile | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| `eslint`, `eslint-config-next` | 9.39.5, 16.3.0 | MIT | [ESLint](https://github.com/eslint/eslint), [Next.js](https://github.com/vercel/next.js) |
| `pdfjs-dist` | 6.2.108 | Apache-2.0 | [PDF.js](https://github.com/mozilla/pdf.js) |
| `prettier` | 3.9.6 | MIT | [Prettier](https://github.com/prettier/prettier) |
| `prisma` | 7.9.1 | Apache-2.0 | [Prisma](https://github.com/prisma/prisma) |
| `tsx` | 4.23.12 | MIT | [tsx](https://github.com/privatenumber/tsx) |
| `typescript` | 6.0.3 | Apache-2.0 | [TypeScript](https://github.com/microsoft/TypeScript) |
| `vitest` | 4.1.10 | MIT | [Vitest](https://github.com/vitest-dev/vitest) |

## Database image and demonstration assets

- `postgres:18-alpine` uses the PostgreSQL License and is pinned in `compose.yaml` and CI by image digest. Source and image notices are published by the [Docker Official Image](https://hub.docker.com/_/postgres) and [PostgreSQL](https://www.postgresql.org/about/licence/).
- `product-ui/public/assets/*.png` were created specifically for this fictional portfolio demonstration with generative image tooling. They are not third-party stock or real manufacturer assets. `product-ui/public/assets/manifest.json` records provenance, intended use and SHA-256 for each file; its license boundary does not grant reuse rights.
- Generated product specification PDFs contain project-authored fictional data and a persistent demonstration watermark. They do not bundle a supplier document, certification, test report or customer asset.
