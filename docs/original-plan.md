# PWA de criação de figurinhas para WhatsApp

## Objetivo

Desenvolver uma PWA para celular que permita importar ou colar uma foto, editar, remover o fundo automaticamente, adicionar textos e salvar figurinhas no próprio aparelho.

Usar o Sticker.ly como referência de facilidade de edição, criando identidade visual própria.

A aplicação será hospedada na Vercel, sem backend, autenticação ou armazenamento remoto de imagens.

## Stack

- React com TypeScript e Vite.
- Tailwind CSS.
- Fabric.js para o editor com camadas.
- Zustand para estado do editor.
- vite-plugin-pwa para instalação e funcionamento offline.
- Processamento de imagens no navegador.
- localStorage para persistência do MVP.

Antes de instalar dependências, verificar suas versões, documentação e licenças atuais.

Não criar APIs, banco remoto, login ou serviços pagos.

## Forma de trabalhar

Implementar por etapas, mantendo a aplicação funcional ao final de cada uma.

Começar pela prova de cópia para o WhatsApp antes de construir o editor completo.

Executar verificações de TypeScript e build a cada etapa relevante. Testar regras importantes, especialmente persistência e exportação, sem criar testes que apenas reproduzam a implementação.

Não simular funcionalidades: remoção de fundo, cópia e exportação devem funcionar de verdade. Quando uma capacidade estiver indisponível, informar e oferecer alternativa.

Ao finalizar cada etapa, explicar brevemente:

- O que foi implementado.
- Como executar e testar.
- Quais verificações foram realizadas.
- O que depende de teste em aparelho real.

## 1. Prova de conceito: copiar para WhatsApp

### Contexto já validado

Uma imagem com fundo transparente gerada no ChatGPT foi copiada e colada no WhatsApp de um iPhone.

Ela chegou como figurinha real, com as opções “Adicionar às favoritas” e “Editar figurinha”.

Isso valida esse caminho no aplicativo ChatGPT, mas ainda não comprova o funcionamento da cópia pelo Safari ou pela PWA.

### Implementação inicial

Criar uma tela simples para:

1. Importar uma imagem.
2. Visualizar a transparência.
3. Copiar como PNG transparente.
4. Compartilhar o arquivo quando suportado.
5. Baixar como PNG.

Implementar a cópia com Clipboard API e ClipboardItem, usando `image/png`.

Considerar as restrições de ativação por gesto no Safari:

- Preparar o Blob antes do toque quando possível.
- Acionar a escrita diretamente a partir do clique.
- Evitar operações assíncronas desnecessárias entre o toque e a chamada de cópia.
- Consultar o padrão compatível com Safari para ClipboardItem com Promise, se necessário.

Detectar recursos e tratar recusas ou falhas.

Usar `navigator.canShare({ files })` antes de compartilhar arquivos.

Não usar `document.execCommand` como solução para copiar imagens.

### Textos da interface

Após copiar:
“Imagem copiada. Abra o WhatsApp e cole na conversa.”

Não afirmar que o WhatsApp recebeu uma figurinha: a aplicação não consegue verificar isso.

Se a cópia falhar:
“Não foi possível copiar neste navegador. Tente compartilhar ou baixar a imagem.”

### Validação manual

Documentar um roteiro para:

- Safari no iPhone.
- PWA instalada no iPhone.
- Chrome no Android.
- PWA instalada no Android.

Registrar se a colagem resulta em:

- Figurinha.
- Foto.
- Arquivo.
- Operação indisponível.

Não assumir equivalência entre iPhone e Android.

Continuar a implementação com copiar, compartilhar e baixar disponíveis. Não bloquear o restante do desenvolvimento por falta de aparelho físico.

## 2. Tela inicial

Interface mobile-first, em português do Brasil.

Elementos:

- Nome provisório: “Minhas Figurinhas”.
- Botão principal “Criar figurinha”.
- Importação da galeria.
- Opção separada de câmera quando suportada.
- Área para colar uma imagem.
- Suporte ao evento `paste`.
- Botão “Colar imagem” quando a leitura da área de transferência estiver disponível.
- Arrastar e soltar no desktop.
- Grade “Minhas figurinhas”.
- Estado vazio com instrução simples.
- Acesso a backup e armazenamento.

Aceitar inicialmente JPEG, PNG e WebP.

Para formatos não decodificáveis pelo navegador, mostrar mensagem clara. Não prometer suporte a HEIC sem implementação real.

Ao tocar em uma figurinha, abrir ações:

- Copiar.
- Editar.
- Duplicar.
- Compartilhar.
- Baixar PNG.
- Baixar WebP.
- Excluir.

Confirmar exclusões, permitindo cancelar.

## 3. Editor

### Layout

- Barra superior com voltar, desfazer, refazer e salvar.
- Área central quadrada.
- Fundo quadriculado representando transparência.
- Barra inferior com ferramentas.
- Controles grandes e confortáveis para toque.
- Painéis inferiores para configurações.
- Respeitar áreas seguras do iPhone e teclado virtual.
- Evitar rolagem da página enquanto o usuário manipula o canvas.

O canvas lógico deve ser independente da resolução da tela.

### Camadas

Manter objetos editáveis:

- Foto.
- Textos.
- Máscara de recorte.
- Configuração de borda.

Separar o estado do projeto da imagem final exportada.

### Ferramentas de imagem

- Arrastar.
- Redimensionar.
- Girar.
- Centralizar.
- Ajustar ao quadro.
- Recorte retangular.
- Zoom e posicionamento por toque.
- Restaurar imagem original.
- Remover fundo automaticamente.
- Borracha manual.
- Restaurar partes apagadas.

### Texto

Permitir múltiplas caixas de texto com:

- Edição de conteúdo.
- Fonte.
- Tamanho.
- Cor.
- Alinhamento.
- Contorno com cor e espessura.
- Rotação.
- Redimensionamento.
- Posicionamento.
- Duplicação.
- Exclusão.
- Ordem de camadas.

Usar fontes com licença apropriada, servidas pela própria aplicação para funcionamento offline.

### Borda da figurinha

Aplicar contorno ao assunto recortado:

- Branco por padrão.
- Cor configurável.
- Espessura configurável.
- Prévia em tempo real quando o desempenho permitir.

Não aplicar uma moldura quadrada ao redor do canvas.

### Histórico

Desfazer e refazer operações relevantes.

Agrupar movimentos contínuos em uma única operação de histórico.

Limitar o histórico para evitar consumo excessivo de memória.

## 4. Remoção automática de fundo

Executar localmente no navegador.

Avaliar uma biblioteca/modelo de segmentação apropriado para celulares.

Uma candidata é `@imgly/background-removal`, mas verificar sua licença antes de incorporá-la. Não tratar AGPL como licença permissiva.

Se a biblioteca escolhida impuser condições de distribuição relevantes, explicar a consequência no README e manter o serviço desacoplado para substituição.

Implementar:

- Carregamento sob demanda.
- Progresso real quando disponível.
- Estado de processamento quando não houver percentual.
- Tratamento de falhas.
- Possibilidade de tentar novamente.
- Preservação da imagem original.
- Correção manual do resultado.

Usar worker quando compatível com o mecanismo escolhido.

Redimensionar imagens grandes antes da inferência para controlar memória e tempo de processamento.

Se houver cancelamento apenas visual, ignorar corretamente resultados atrasados; não afirmar que o processamento foi interrompido se a biblioteca não oferecer cancelamento real.

Explicar que o primeiro uso pode exigir download do modelo.

Somente anunciar remoção de fundo offline quando os arquivos necessários tiverem sido armazenados e o comportamento tiver sido validado.

Não enviar fotos para APIs externas.

## 5. Persistência com localStorage

O requisito inicial é usar localStorage.

Não substituir silenciosamente por IndexedDB.

Criar uma interface de armazenamento desacoplada para permitir migração futura.

### Dados

Guardar:

- Identificador.
- Nome opcional.
- Data de criação.
- Data de alteração.
- Versão do esquema.
- Miniatura.
- Imagem final comprimida.
- Dados do projeto necessários para reedição.

Imagens devem ser serializadas como Data URLs.

Evitar duplicar a mesma imagem em vários campos quando não for necessário.

Não persistir:

- Object URLs.
- Histórico completo de desfazer.
- Arquivos originais enormes sem redução.
- Dados temporários de processamento.

### Limitações e comportamento

localStorage tem capacidade pequena e variável entre ambientes. Não prometer quantidade fixa de figurinhas.

Implementar:

- Escrita somente ao salvar ou após debounce apropriado.
- Tratamento de `QuotaExceededError`.
- Tratamento de armazenamento bloqueado.
- Validação de dados ao carregar.
- Recuperação de registros inválidos sem derrubar toda a aplicação.
- Versionamento e migração do formato.
- Preservação dos registros existentes se um novo salvamento falhar.

Se faltar espaço:

- Manter a edição atual aberta.
- Informar o problema.
- Permitir baixar a figurinha ou exportar backup.
- Orientar a excluir itens.
- Nunca apagar figurinhas automaticamente.

Exibir ocupação aproximada dos dados da aplicação, sem apresentar essa estimativa como quota exata do navegador.

Aviso na área de armazenamento:
“As figurinhas ficam neste navegador e aparelho. Limpar os dados do site pode apagar sua coleção. Exporte um backup para guardar uma cópia.”

Sem sincronização entre aparelhos.

## 6. Backup

Permitir exportar e importar um backup JSON versionado.

O backup deve conter a coleção e os recursos necessários para restaurá-la.

Na importação:

- Validar estrutura e tipos.
- Limitar o tamanho aceito para evitar travamento.
- Mostrar quantidade de itens antes de confirmar.
- Mesclar por padrão, evitando sobrescrita silenciosa.
- Tratar identificadores duplicados.
- Verificar espaço e preservar a coleção existente em caso de falha.
- Não executar conteúdo importado.

## 7. Exportação

### PNG

- Fundo transparente.
- Resolução de 512 × 512.
- Usado para cópia e alternativa de download.

### WebP

- 512 × 512.
- Preservar transparência.
- Objetivo de até 100 KB por figurinha estática.
- Ajustar qualidade progressivamente.
- Verificar MIME e tamanho reais do resultado.
- Não renomear um PNG para `.webp`.
- Se o encoder nativo não gerar WebP, usar encoder compatível no navegador.
- Se não atingir o limite, informar e oferecer alternativa.

A exportação de um WebP válido não significa que o WhatsApp importará o arquivo automaticamente como figurinha.

### Cuidados visuais

- Manter proporções.
- Não cortar textos.
- Reservar margem para bordas.
- Esperar fontes carregarem antes de renderizar.
- Exportar sem controles de seleção, fundo quadriculado ou elementos da interface.

## 8. Integração com WhatsApp

No MVP:

- Copiar imagem.
- Compartilhar arquivo quando suportado.
- Baixar PNG.
- Baixar WebP.

Não implementar:

- APIs privadas.
- Automação de conta do WhatsApp.
- Bots.
- Links que prometam importar figurinhas sem mecanismo real.
- Dependência da WhatsApp Business API.

Não prometer que `navigator.share` importa uma figurinha: ele compartilha um arquivo e o destino decide como recebê-lo.

Se a importação direta de pacotes se tornar necessária, documentar como evolução um aplicativo com Capacitor e integração nativa oficial para Android/iOS.

Essa evolução fica fora do MVP.

## 9. PWA e Vercel

Configurar:

- Manifesto.
- Ícones normais e maskable.
- Ícone para tela inicial do iPhone.
- Modo standalone.
- Cores de tema.
- Service worker.
- Cache do shell, fontes e recursos essenciais.
- Funcionamento offline da coleção e editor básico após primeiro carregamento.
- Atualização com aviso ao usuário.

Não recarregar automaticamente durante uma edição.

Distinguir:

- Recursos disponíveis offline.
- Recursos que ainda precisam ser baixados.

Usar caminhos relativos e configurar fallback de rotas se necessário para a Vercel.

Não adicionar backend ou variáveis secretas desnecessárias.

## 10. Desempenho e privacidade

- Corrigir orientação de fotos conforme a decodificação do navegador.
- Reduzir fotos grandes antes de persistir e processar.
- Definir limites de dimensões e tamanho de entrada.
- Liberar Object URLs e recursos temporários.
- Evitar armazenar imagens pesadas no histórico.
- Carregar o mecanismo de remoção de fundo sob demanda.
- Evitar travar a interface.
- Não adicionar analytics ou upload de fotos.
- Não registrar conteúdo das imagens no console.
- Avisar antes de abandonar uma edição não salva.
- Tratar toques repetidos durante processamento e salvamento.

## 11. Organização sugerida

src/
components/
features/
import/
editor/
gallery/
export/
backup/
services/
background-removal/
clipboard/
storage/
image-processing/
stores/
types/
utils/

Manter componentes visuais separados da lógica de processamento, armazenamento e exportação.

## 12. Ordem de implementação

1. Prova de cópia, compartilhamento e download.
2. Estrutura visual e importação.
3. Editor com imagem, textos e histórico.
4. Remoção de fundo e correção manual.
5. Bordas e exportação final.
6. Persistência e galeria.
7. Backup e tratamento de falta de espaço.
8. PWA e offline.
9. Validação mobile e preparação para Vercel.

## Critérios de aceite

- Importar e colar imagens quando suportado.
- Editar foto e múltiplos textos por toque.
- Remover fundo de verdade.
- Corrigir o recorte manualmente.
- Gerar resultado com transparência.
- Copiar PNG com tratamento de incompatibilidade.
- Compartilhar e baixar como alternativas.
- Exportar WebP válido com tamanho verificado.
- Salvar e reabrir projetos no localStorage.
- Recuperar a coleção após fechar o aplicativo.
- Não perder itens existentes quando o espaço acabar.
- Exportar e restaurar backup.
- Instalar como PWA.
- Abrir coleção e editor básico offline.
- Passar nas verificações de TypeScript e build.
- Incluir README com execução local, deploy na Vercel, limitações e roteiro de testes em aparelhos reais.

Comece implementando a etapa 1 e depois avance pelas demais, mantendo as limitações observadas documentadas.
