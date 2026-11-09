# Testes e validação

## Automatizados

```sh
npm test
npm run build
npm run preview -- --port 4173
# Em outro terminal:
npx playwright test
# Inclui download e inferência do modelo real + reabertura offline:
TEST_MODEL=1 npx playwright test
```

Vitest cobre escrita com quota excedida, preservação de coleção inválida, recuperação de registros válidos, schema/tipos seguros, merge de conflitos e roundtrip de projeto e backup.

Playwright usa Chromium com viewport/toque de iPhone 13; isso não substitui Safari físico. Cobre importação, texto, download PNG/WebP com inspeção de dimensões/alpha/formato/tamanho, salvar/reabrir, backup e editor offline. Teste opcional baixa pesos reais, executa inferência e reabre com rede desativada.

Screenshots e downloads são gerados em `test-results/` (ignorado no Git). O teste de cache não usa marca local de “baixado”: precisa de recursos reais armazenados pelo navegador.

## Roteiro obrigatório em aparelhos reais

Executar separadamente: Safari/iPhone; PWA instalada/iPhone; Chrome/Android; PWA instalada/Android. Registrar modelo do aparelho, sistema, navegador, versão do app, data e resultado. Não marcar testes físicos como aprovados com base em emulação.

1. Primeiro acesso conectado: splash, bytes/progresso reais, entrada manual durante preparo. Recusar rede e tentar novamente. Confirmar primeiro download e abertura posterior com cache.
2. Importar JPEG orientado da câmera, PNG transparente e WebP. Testar câmera, paste, leitura da área de transferência e arquivo HEIC rejeitado. Tentar arquivo acima de 20 MB.
3. Arrastar foto sem rolar a página; girar/ampliar pelas alças; ajustar/centralizar; vários textos, teclado aberto, cor, fonte, contorno e ordem; desfazer/refazer.
4. Recortar automaticamente foto com cabelo, objetos e bordas complexas; corrigir com borracha/restauração/retângulo; salvar e reabrir mantendo transparência e textos editáveis.
5. Tocar “Copiar imagem” e colar no WhatsApp. Anotar um dos resultados: **figurinha / foto / arquivo / indisponível**. Confirmar mensagem neutra do app. Repetir a partir da coleção. Negar clipboard e verificar alternativas.
6. Compartilhar: verificar `canShare`, cancelar sem erro, destino real. Baixar PNG e WebP; inspecionar 512 × 512, transparência, MIME e até 100 KB no WebP.
7. Salvar coleção, fechar/reabrir. Duplicar, excluir/cancelar exclusão. Exportar backup, importar com conflitos, cancelar confirmação e importar arquivo inválido.
8. Simular limite de localStorage: guardar antes uma coleção conhecida; provocar `QuotaExceededError`; confirmar itens anteriores intactos, edição aberta, PNG baixável e backup exportável. Testar modo com armazenamento bloqueado.
9. Instalar, abrir em standalone e conferir ícone, safe areas e controles. Após preparo, modo avião: abrir coleção, reedição e recorte automático. Repetir após limpar somente cache de modelo: manual disponível, IA solicita preparo.
10. Publicar atualização enquanto houver edição aberta: não recarregar. Sair/salvar e aplicar atualização pelo aviso. Sair com edição não salva deve pedir confirmação.

## Limites conhecidos

- Cache pode ser removido pelo sistema. Também muda por domínio/perfil/browser.
- Memória, tempo e qualidade de segmentação variam por imagem/aparelho. Primeiro preparo ~44 MB + WASM; a inferência pode ser lenta em aparelhos mais antigos.
- Não há pacote nativo de figurinhas. Evolução para integração oficial Android/iOS exigirá aplicativo nativo/Capacitor, fora deste MVP.
- Backup máximo 20 MB e até 300 registros; restrições intencionais contra travamento. Schema v1 é o único atual; versões futuras são rejeitadas, nunca interpretadas silenciosamente.
