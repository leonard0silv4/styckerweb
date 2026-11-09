# Minhas Figurinhas

**App publicado:** https://styckerweb.vercel.app

PWA em português para criar figurinhas no celular. Importe uma foto, recorte no próprio aparelho, adicione textos, salve na coleção e copie/compartilhe/baixe o resultado.

## Executar

Node 24 e npm.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview -- --port 4173
npx playwright install chromium
npx playwright test
```

## Recursos

- Interface mobile-first com controles por toque e adaptação para desktop.
- Importação JPEG, PNG e WebP, câmera, paste e arrastar/soltar.
- Recorte automático local com ORMBG q8, borracha, restauração e recorte retangular.
- Foto e múltiplos textos editáveis, borda, camadas, desfazer/refazer.
- PNG transparente de 512 × 512; WebP válido até 100 KB quando compressível; copiar e compartilhar com detecção de suporte.
- Coleção em localStorage, backup JSON versionado, validação e proteção contra falhas de quota.
- Instalação como PWA e shell offline. Atualizações não recarregam durante edição.
- Splash com progresso de preparo e cache do modelo para reutilizar nos próximos acessos.

## Limitações importantes

O primeiro preparo baixa ~44 MB do modelo mais o motor WASM. O cache evita repetir esse download, mas pode ser removido pelo navegador. Desempenho e compatibilidade da IA variam por celular. Se o preparo falhar, entre no editor manual. As fotos não são enviadas a um servidor.

A coleção fica neste navegador e aparelho. Limpar dados do site pode apagá-la. Exporte backups. Não há sincronização. O localStorage tem espaço pequeno e variável; se acabar, a edição permanece aberta e os itens existentes são preservados.

Copiar exige suporte do browser e contexto seguro. Compartilhar exige suporte a arquivos. O WhatsApp decide se recebe uma figurinha, foto ou arquivo; este app não garante importação automática de pacotes. Safari/iOS e Chrome/Android precisam de teste físico separado. HEIC não está implementado.

A documentação para continuar o projeto está em [docs/README.md](docs/README.md); agentes devem ler também [AGENTS.md](AGENTS.md). Deploy Vercel: `npm run build`, pasta `dist`, sem variáveis de ambiente. Veja [deploy](docs/deployment.md), [roteiro de testes](docs/testing.md) e [licenças](docs/licenses.md).
