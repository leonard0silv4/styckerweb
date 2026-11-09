# Estado da entrega

Data: 08/11/2026. Implementação inicial do MVP com foco mobile.

## Implementado

- Importação real JPEG/PNG/WebP, redução antes de processamento e persistência, câmera, paste, leitura de clipboard com fallback e drag/drop.
- Cópia PNG preparada antes do gesto, compartilhamento de arquivo com canShare e downloads.
- Editor Fabric com foto, múltiplos textos editáveis, transformações por toque/alças, ajustes, camadas, bordas e histórico limitado.
- Segmentação ORMBG real em worker; borracha, restauração e recorte retangular; original reduzido preservado.
- Splash com progresso de pesos, inicialização e alternativa manual. Cache de modelo e runtime reutilizado entre aberturas e worker entre recortes.
- Coleção localStorage, escrita atômica da coleção, quota/armazenamento bloqueado, recuperação por registro, duplicação, confirmação de exclusão, estimativa de ocupação.
- Backup JSON v1 com confirmação da quantidade, merge e preservação em caso de falha. Schema em disco reutiliza original quando não há processamento diferente.
- PNG 512 × 512; WebP validado por MIME, assinatura e limite de 100 KB, redução progressiva de qualidade e encoder alternativo.
- Manifest, ícones, fontes locais, shell offline, prompt de atualização fora de edição e README/documentação para agentes.

## Evidências de validação

- `npm test`: 7 testes de armazenamento/backup aprovados.
- `npm run build`: TypeScript e build PWA aprovados; shell precacheado ~1,9 MB descomprimido (modelo/runtime separados).
- Playwright mobile Chromium: importação, texto, PNG, WebP, persistência, reedição, backup e shell/editor offline aprovados.
- Teste opcional com pesos reais: primeiro preparo, inferência, persistência, reabertura sem rede e segunda inferência offline aprovados. Não foi usado um mock da IA.
- Clipboard de imagem/png real no Chromium e encoder WebP WASM com encoder nativo deliberadamente indisponível: aprovados.
- Inspeção visual em 390 px e desktop 1440 px; checagem de ausência de overflow também em 375 px.
- Compatibilidade física de Safari/iPhone, Android, instalação e resultado da colagem no WhatsApp **ainda não testados em aparelhos reais**. Roteiro em `testing.md`.

## Limitações e próximos passos

- Testar qualidade/tempo/memória com fotos e aparelhos variados. Download q8 ~44 MB, motor WASM ~14 MB; o cache pode ser removido pelo sistema.
- Histórico de sliders/texto guarda até 20 mudanças; movimentos do canvas são agrupados ao terminar. Não há gesto de pinça dedicado; zoom está nas alças e no controle da foto.
- Persistência v1 é a primeira versão. Formatos futuros são rejeitados. Uma migração futura precisa ser explícita e testada.
- Foto permanece como camada de base; os textos podem ser reordenados entre si. O recorte manual preserva dimensões para permitir restauração.
- Não há sincronização ou importação nativa de pacotes no WhatsApp; isso exigiria evolução fora deste MVP.
- `npm audit` restante: 4 alertas baixos na cadeia de build Workbox/deepmerge. Não há versão corrigida de deepmerge no registro consultado. Alertas moderados de glob/minimatch foram removidos com override de glob compatível e build verificado. Não afetam uma API de produção, pois o deploy é estático.

## Correção de cache relevante

O Transformers.js consulta metadados opcionais inexistentes, que retornam 404 online. Esses 404 não ficam no cache da biblioteca; offline, uma falha de rede impedia o fallback. O adaptador converte misses HTTP offline em 404 (os arquivos obrigatórios continuam exigindo cache válido), mantendo Data URLs disponíveis. A prova com reabertura sem rede passou após essa correção.
