# Gaveta: especificação de comportamento

O que a Gaveta precisa fazer, descrito pelo comportamento visto de fora. O
plano e as decisões estão em [docs/PLANO-GAVETA.md](docs/PLANO-GAVETA.md).

## Etapa 1: base da gaveta

**Captura**
- [x] App de barra de menus, sem ícone no Dock.
- [x] Na primeira execução, pergunta uma vez se deve mostrar os prints na hora, explicando as duas escolhas.
- [x] Prints direto na gaveta: os prints vão para `~/Library/Application Support/Gaveta/Capturas`, sem a miniatura flutuante, então chegam na hora. Gravações de tela também.
- [x] Os ajustes anteriores do macOS são guardados e voltam ao desligar a opção, ao sair do app ou se ele for encerrado por sinal (`kill`).
- [x] Sem essa opção ("Manter como está"): observa a pasta onde o macOS salva os prints (a Mesa por padrão) e só aceita arquivos marcados pelo macOS como captura.
- [x] Você continua usando ⌘⇧3, ⌘⇧4, ⌘⇧5 ou qualquer outro app de captura.

**A gaveta**
- [x] Painel na borda direita da tela, em todos os Spaces, sem roubar o foco. Some sobre apps em tela cheia.
- [x] Encostar o ponteiro na borda direita abre a gaveta naquela tela; afastar o ponteiro fecha.
- [x] ⌃⌥G ou o menu abrem e fecham (aberta assim, fica até o ponteiro visitar e sair).
- [x] Clicar fora fecha.
- [x] Um print novo abre a gaveta por um instante.
- [x] O mais novo fica no topo, com quando foi tirado e o tamanho (ou a duração, nas gravações).
- [x] Guarda até 50 prints, com rolagem; passou disso, o mais antigo sai.
- [x] O conteúdo volta ao abrir o app de novo. Prints cujo arquivo sumiu saem sozinhos.
- [x] Estado vazio com uma linha dizendo como tirar um print.

**Gestos**
- [x] Clique: copia a imagem.
- [x] Duplo clique: abre no Pré-Visualização.
- [x] Arrastar para um app: ele recebe uma cópia; o print fica na gaveta.
- [x] Arrastar para uma pasta: guarda a imagem ali; o print sai da gaveta.
- [x] Arrastar para o Lixo, ou clicar no X: descarta (vai para o Lixo se estiver na pasta da Gaveta; senão só sai da gaveta).
- [x] Clique com o botão direito: copiar, abrir, mostrar no Finder, guardar na Mesa e tirar da gaveta.

**Menu e sistema**
- [x] Abrir ao iniciar sessão.
- [x] Instalação em Aplicativos com `scripts/install.sh`.

## Etapa 2: vários prints de uma vez
- [x] Bolinha no canto da miniatura (no hover, ou em todos quando há seleção): clicar seleciona ou tira da seleção.
- [x] ⌘-clique faz o mesmo; ⇧-clique seleciona um intervalo.
- [x] Barra na base: "2 de 6 · Todos · Copiar todos · Limpar"; sem seleção, "Selecionar todos" e a dica da bolinha.
- [x] Selecionar todos também no botão direito.
- [x] Clicar num print selecionado copia todos os selecionados.
- [x] Arrastar um selecionado leva todos juntos, em pilha.
- [x] Copiar todos: um único ⌘V cola os vários, na ordem em que foram tirados. Vários vão como arquivos (os apps colam todos); um só vai também como imagem.
- [x] Botão direito num selecionado: copiar, tirar da gaveta ou limpar a seleção.
- [x] Fechar a gaveta limpa a seleção.
- [ ] ⌘C, ⌘A e Esc pelo teclado (a gaveta não recebe teclado ainda, para não roubar o foco do app em uso).

## Etapa 3: acabamento
- [x] Print novo: a gaveta abre só uma fresta, o print desliza para dentro e ela fecha. Encostar o ponteiro na fresta abre a gaveta inteira.
- [x] Altura que acompanha o conteúdo; passou do máximo, a lista rola.
- [x] Clicar e segurar: abre na Marcação do macOS e salva por cima do arquivo (gravações abrem no app delas).
- [x] Clique forte no trackpad: Visualização Rápida, com as setas passando pelos outros prints.
- [x] Marcação e Visualização Rápida também no botão direito.
- [x] Imagens copiadas também entram na gaveta (opcional, desligado por padrão), ignorando texto, arquivos e conteúdo privado de gerenciadores de senha.
- [x] Trocar o atalho pelo menu (Esc cancela, Delete remove).
- [ ] Idiomas: português e inglês.

## Etapa 3.5: visual de fichário
- [x] A gaveta é a gaveta de um fichário: frente de carvalho com porta-etiqueta de latão (PRINTS), puxador e contador.
- [x] Por dentro, feltro verde; cada print é uma ficha em pé com aba da hora em letra de máquina de escrever.
- [x] Toda ficha mostra o print inteiro, nunca recortado: grande quando a ficha aparece toda, em miniatura ao lado do tipo e do tamanho quando é uma faixa atrás de outras.
- [x] A altura da gaveta é dividida a partir da frente: as fichas mais novas aparecem inteiras e as mais antigas encolhem até uma faixa mínima legível; só depois disso a gaveta rola.
- [x] As abas ficam todas à direita, fora do caminho da miniatura e do texto.
- [x] Passar o mouse numa ficha abre espaço para ela aparecer inteira; a gaveta cresce para baixo, sem mexer no que está sob o ponteiro.
- [x] Ficha selecionada sai um pouco da gaveta, com aba azul; copiar carimba "COPIADO".
- [x] Ficha nova cai na frente e dá um tranco na gaveta.
- [x] Descartar pelo X ou pelo menu: a ficha é puxada para fora da gaveta pela aba e cai girando até sair pela parte de baixo da tela, enquanto as outras fecham o espaço. Com vários selecionados, até 6 saem em sequência. Esvaziar pelo menu e o limite de 50 não animam.
- [x] Print novo voa do lugar onde foi tirado: decola, sobe num arco, encolhe e vira ficha no caminho (papel, aba "agora" e legenda) e entra na gaveta pela fresta, que dá o tranco no pouso.
- [x] Sem a área da captura (imagem copiada, gravação), ou com o sistema pedindo menos movimento, a ficha só cai; numa rajada de prints, no máximo dois voam juntos.
- [x] Ícone com fichas e puxador de latão.
- [x] Abrir e fechar por aviso do sistema (`com.neto.Gaveta.toggle`), para Atalhos e Raycast.

## Etapa 4: landing
- [ ] Página única com o vídeo, os gestos e o download.
- [ ] Figura isométrica da gaveta feita com a skill hairline-create.
