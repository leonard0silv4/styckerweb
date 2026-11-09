# Arquitetura

SPA React + TypeScript + Vite. Interface com Tailwind v4 e CSS de componentes, ícones Lucide, fontes locais DM Sans e Outfit. Layout começa em celular; desktop usa quadro e painel lado a lado.

## Fluxo principal

`main.tsx` → `App.tsx` → splash → importação/coleção → `Editor.tsx` → armazenamento ou exportação.

- `components/Splash.tsx`: inicia o preparo, acompanha bytes baixados, permite entrada manual e nova tentativa.
- `components/Editor.tsx`: canvas Fabric de 512 × 512, objetos foto/texto, painéis, exportação e salvamento.
- `components/MaskEditor.tsx`: correção sobre pixels, borracha, restauração do original e recorte retangular. Pointer Events e captura de ponteiro.
- `stores/editor.ts`: Zustand com projeto atual, até 20 estados de histórico, desfazer/refazer e dirty flag. Movimentos entram no histórico em `object:modified`, não em cada frame.
- `services/images.ts`: validação/decodificação, redução a 1024 px, contorno alfa, Blob PNG, WebP, clipboard, share e downloads.
- `services/storage.ts`: adapter de localStorage, validação do schema, recuperação por registro, escrita de coleção em uma operação, merge de backups.
- `services/background.ts`: worker compartilhado por sessão, deduplicação do preparo e correlação de respostas.
- `services/background.worker.ts`: Transformers.js, ORMBG q8, inferência WASM em worker, fotos nunca deixam o browser.
- `scripts/copy-runtime.mjs`: copia o runtime WASM compatível das dependências antes de dev/build. Arquivos gerados são ignorados pelo Git.

## Dados

Chave `styckerweb.collection.v1`. Envelope `{version:1, items:Sticker[]}`. Cada registro contém id/nome/datas/versão/thumbnail/final/project. O projeto inclui foto original reduzida, foto processada, transformação da foto, textos editáveis e borda. Recursos são Data URLs restritas a PNG/JPEG/WebP; nunca URLs remotas ou Object URLs persistidas.

Quando original e imagem processada são iguais, o formato em disco/backup usa `image: "@original"` para não duplicar a foto. A leitura expande essa referência antes de validar. Também aceita projetos v1 com a imagem completa, para compatibilidade. A coleção tem limite real variável por navegador; não prometer quantidade fixa.

A validação restringe tipos, cores, tamanhos, transformações e fontes. O editor reconstrói objetos explicitamente, sem desserializar classes Fabric arbitrárias.

## Cache e offline

Service worker precacheia shell, JS, CSS, fontes WOFF2, ícones e encoder WebP. Runtime WASM pesado é mantido por cache do Transformers.js e rota CacheFirst de mesma origem. Modelo usa Cache API da biblioteca, com revisão imutável. Não guardar modelo de IA em localStorage.

Splash prepara modelo em cada abertura, consultando cache antes da rede. Worker permanece carregado para próximos recortes. Cache é específico do domínio, navegador e perfil; não se compartilha entre localhost e produção. O navegador pode removê-lo. Não confundir cache de modelo com backup da coleção.

Atualização de PWA aparece apenas fora do editor. Não há auto reload durante edição. Coleção e editor manual funcionam offline após shell armazenado; recorte automático precisa dos recursos preparados e compatibilidade do aparelho.
