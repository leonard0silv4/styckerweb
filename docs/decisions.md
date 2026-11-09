# Decisões técnicas

1. **Mobile-first**: controles ≥44 px, quadro quadrado independente do viewport, safe areas, barra inferior e painéis compactos. Não usar a versão desktop apenas reduzida.
2. **Privacidade local**: zero backend e zero upload de imagens. Downloads do modelo consultam Hugging Face; as fotos não acompanham essas requisições.
3. **ORMBG quantizado**: `onnx-community/ormbg-ONNX`, licença Apache-2.0, variante q8 (~44,3 MB) e WASM (~14 MB descomprimido). Evita as obrigações AGPL da candidata IMG.LY e a restrição não comercial do BRIA RMBG.
4. **Splash e cache**: pedido posterior do proprietário. Preparar na abertura, mostrar progresso real de download e fase de inicialização sem inventar percentual de inferência. Permitir editor manual. Reutilizar Cache API e worker por sessão.
5. **localStorage obrigatório no MVP**: adapter desacoplado, schema versionado. Sem expurgo automático. Qualquer migração futura precisa preservar dados e exigir plano de compatibilidade.
6. **Exportação honesta**: PNG sempre transparente; WebP com MIME/assinatura/tamanho verificados, encoder WASM alternativo se nativo não funcionar. Compartilhar arquivo não significa importação automática como sticker no WhatsApp.
7. **Projeto próprio, sem JSON Fabric externo**: registros aceitam apenas campos permitidos. Fotos e textos são reconstruídos explicitamente.
8. **Offline com atualização consentida**: prompt de nova versão fora de edição; fontes locais. Sem reload inesperado.
9. **Autoria**: commits apenas com nome do proprietário, sem coautoria de ferramentas.
