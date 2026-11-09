# Publicação

- Repo: https://github.com/leonard0silv4/styckerweb
- Provider: GitHub.
- Branch de produção: `main`.
- Vercel project: `styckerweb` (`prj_g5fNa0ssVzps857WGWzrhckRCXFP`).
- Vercel team: `leo07vasps-projects` (`team_VBb22ieA6Abo91Flqc81jE0y`).
- Framework Vite. Node 24. Instalação `npm ci`, build `npm run build`, saída `dist`.
- Sem secrets ou variáveis de ambiente necessárias.

O prebuild copia arquivos WASM da versão instalada de onnxruntime-web para `public/model-runtime`; não versionar binários gerados. O lockfile garante compatibilidade entre JS e WASM.

Antes de publicar: testes de armazenamento, TypeScript/build e fluxo mobile. Confirmar autor do commit com `git log -1 --format=fuller`. O projeto Vercel deve estar vinculado ao GitHub para deploy em push.

Acompanhar deployment até READY. Um preview protegido não equivale a URL pública de produção. Verificar alias de produção, manifest e service worker depois do deploy. Atualizações de modelo devem alterar revisão fixa e documentar possível novo download.
