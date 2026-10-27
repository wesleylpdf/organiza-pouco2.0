---
name: Correção toast de atualização e version bump deploy
description: Correção dos bugs de toast de atualização não aparecendo e versão não incrementando no deploy do GitHub Pages
type: project
---

## Problema

Usuários não recebiam toast de notificação quando uma nova atualização era deployada em produção, e o versionamento (package.json) nunca era alterado/incrementado após o deploy.

## Causa raiz

1. **Toast não aparecia**: `version.json` era servido em cache pelo GitHub Pages porque `_headers` não tinha regra `no-cache` para `/version.json` e o arquivo `_headers` não era publicado na pasta `dist/` (o `actions/deploy-pages` serve o conteúdo de `dist/`).
2. **Versão não incrementava**: o workflow commitaria o `package.json` com o version bump, mas não fazia push para `main`, então cada deploy lia a mesma versão estática.

## Ação tomada

- `.github/workflows/deploy.yml`: alterou `permissions.contents` de `read` para `write` e adicionou `git push origin HEAD:main || echo "Nothing to push"` após o commit do version bump.
- `_headers`: adicionada regra `Cache-Control: no-cache` para `/version.json`.
- `vite.config.ts`: `closeBundle` do `versionamentoPlugin` agora copia `_headers` para `dist/` (garante que o cabeçalho de no-cache seja publicado no GitHub Pages).
- Commit `f763c8e`: `chore: fix version bump push and cache headers for update toast`

## Verificação

- `npm run build` passou localmente (464 módulos, 5.82s), versão incrementou `2.2.24 → 2.2.25`.
- Push para `main` disparou o workflow de deploy do GitHub Pages.
- Usuário confirmou que funcionou em produção.

## Arquivos alterados

- `.github/workflows/deploy.yml`
- `_headers`
- `vite.config.ts`
- `package.json` (versão 2.2.25)

## Caminho do projeto

`D:\openclaude\organiza-pouco`
