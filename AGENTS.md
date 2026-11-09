# Orientação para agentes

Leia `docs/README.md`, `docs/architecture.md` e `docs/status.md` antes de alterar o projeto.

## Comandos

- `npm ci`
- `npm run dev`
- `npm test` — invariantes de armazenamento/backup.
- `npm run build` — TypeScript + bundle + service worker.
- `npm run preview -- --port 4173`, em outro terminal `npx playwright test`.

## Regras do produto

- Português do Brasil; mobile-first. Verificar 375–430 px, safe areas e toque.
- Sem backend, cadastro, analytics, upload de fotos, chaves ou serviços pagos.
- Persistência da coleção em localStorage. Não trocar por IndexedDB silenciosamente.
- Manter original reduzido e projeto editável separados da imagem final.
- Nunca apagar dados para liberar espaço. Falha de escrita preserva a coleção e o editor.
- Clipboard recebe PNG preparado antes do gesto. Não prometer importação de figurinha no WhatsApp.
- Modelo e WASM usam Cache API; fotos ficam no aparelho. Modelo tem versão fixa.
- Não recarregar durante edição. Atualização de PWA exige ação fora do editor.
- Validar backup antes de importar. Nunca passar JSON importado direto para Fabric `loadFromJSON`.
- Manter processamento em worker. Não simular remoção de fundo.
- Manter documentação e limitações coerentes com o código e com testes realmente executados.

## Git e autoria

O proprietário autorizou commits exclusivamente com o próprio nome: **Leonardo Rodrigues da Silva**. Use a configuração local do repositório. Não adicione trailers de coautoria de agentes. Não force push. Não altere a configuração global do Git.

## Deploy

Repositório: https://github.com/leonard0silv4/styckerweb
Vercel: build `npm run build`, saída `dist`, Node 24. Sem variáveis de ambiente.
Veja `docs/deployment.md` e confirme alvo/commit antes de publicar.
