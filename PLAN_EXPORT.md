# Plano: exportação PDF e Excel

## Contexto
`handleExportar` em `src/main.ts:340-381` só suporta CSV. PDF e XLSX caem no `else` com o aviso "Exportação para PDF não disponível. Use CSV". Nenhuma biblioteca de exportação está instalada.

## Bibliotecas a instalar
- `jspdf` (PDF)
- `xlsx` (Excel)
- `@types/jspdf` e `@types/xlsx` se existirem e forem necessários para o `tsc` estrito

## Alteração em src/main.ts
- Importar `jsPDF` de `jspdf` e `XLSX` de `xlsx`.
- No `handleExportar`, trocar o `else` por branches `pdf` e `xlsx` que geram o arquivo a partir das mesmas `rows` usadas no CSV.
- Download via `Blob` + `URL.createObjectURL` + `<a download>` (mesmo padrão do CSV).

## Considerações TS estrito
- `noUnusedLocals` / `noUnusedParameters`: não deixar imports ou parâmetros não usados.
- `isolatedModules`: imports de tipo com `import type` quando apropriado.

## Verificação
- `npm run build` (tsc + vite build) deve passar.
- Commit + push para origin/main.
