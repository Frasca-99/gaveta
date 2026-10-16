# Plano da Gaveta

Uma gaveta na borda direita da tela que guarda cada print que você tira,
com o diferencial no centro da interação: juntar vários prints e mandar
todos de uma vez.

## O que a pesquisa mostrou

- **O nome "Gaveta" está livre:** nenhum app de Mac com esse nome apareceu.
- **A ideia de "prateleira na borda da tela" já existe para arquivos em geral:** Yoink (borda esquerda), Dropover, Dockside (ao lado do Dock), Unclutter (puxado do topo).
- **Para prints, existe o Shotty:** prints recentes num menu da barra de menus.
- **Nenhum deles junta as três coisas:** print na hora (sem miniatura), gaveta só de prints e **selecionar vários e colar ou arrastar todos de uma vez**. É aí que entramos.

## Decisões

- **Lado:** borda direita, que costuma estar livre (o Yoink usa a esquerda).
- **Clique copia;** a bolinha, o ⌘-clique e o ⇧-clique selecionam. O gesto mais rápido continua sendo o mais comum.
- **Visual de fichário:** a gaveta de um catálogo de fichas, com frente de carvalho, etiqueta e puxador de latão, feltro verde por dentro e cada print como uma ficha em pé com a aba da hora. Foi escolhido entre três direções (fichário, gaveta de mesa e vidro com puxador), que estão em [prototipos/](prototipos/).
- **Toda ficha mostra o print inteiro,** nunca recortado: grande quando há espaço, em miniatura quando a ficha é uma faixa atrás das outras.
- **Só prints:** sem arquivos e sem textos copiados, para não virar mais um gerenciador de área de transferência.

## Como funciona

**Abrir**
- Encostar o ponteiro na borda direita, no meio da tela, por um instante.
- Ou ⌃⌥G (dá para trocar no menu).
- Ou pelo ícone na barra de menus, ou pelo aviso `com.neto.Gaveta.toggle` (Atalhos, Raycast).

**Print novo chegando**
- Ele voa do lugar onde foi tirado, vira ficha no caminho e entra pela fresta da gaveta, que dá um tranco no pouso.

**Gestos**

| Gesto | O que faz |
|---|---|
| Clique | Copia o print |
| Bolinha, ⌘-clique ou ⇧-clique | Seleciona vários |
| Selecionar todos / Copiar todos | Na barra da base; um único ⌘V cola os vários |
| Arrastar um selecionado | Leva todos os selecionados juntos |
| Duplo clique | Abre no Pré-Visualização |
| Clicar e segurar | Abre na Marcação |
| Clique forte | Visualização Rápida |
| Arrastar para pasta, app ou Lixo | Move, envia uma cópia ou descarta |
| X ou botão direito | Tira da gaveta: a ficha é puxada para fora e cai pela tela |

## Onde entra a skill hairline-create

A hairline-create desenha uma figura isométrica em traço fino, interativa, como uma página HTML. Ela não constrói a interface nativa do app, que é Swift. O lugar dela é:

- **Herói da landing:** uma gaveta isométrica que se abre quando o ponteiro chega perto, com fichas de print dentro.
- **Estado vazio na landing ou no README:** a gaveta vazia, composta e com um ponto de destaque.

## Próximos passos

1. **Landing:** página única com o vídeo, os gestos e o download, com a figura da hairline-create.
2. **Distribuição:** assinatura e notarização da Apple, versão para Mac Intel.
3. **Gravações de tela:** cortar a gravação ao clicar e segurar.
