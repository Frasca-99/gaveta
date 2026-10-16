# Landing da Gaveta: estrutura

Uma página só, minimalista, que faz uma coisa: mostrar que a Gaveta guarda
seus prints e deixa você mandar vários de uma vez, e levar ao download.

## Para quem

Quem vive mandando print: dev, QA, suporte, quem preenche chamado e quem
conversa com cliente. Público brasileiro, texto em português.

## Direção visual

Minimalista, como uma página de catálogo: muito branco, traço fino e uma
única cor de destaque, tirada do próprio app.

| Papel | Cor | Uso |
|---|---|---|
| Página | `#FFFFFF` | Fundo |
| Tinta | `#1B1B19` | Títulos e texto |
| Grafite | `#6B6B66` | Texto de apoio |
| Linha | `#DCDCD6` | Divisórias e o traço das figuras |
| Feltro | `#1F4A3A` | A única cor: botão, links e o traço em destaque das figuras |

- **Texto:** a fonte do próprio Mac (SF Pro), porque é um app de Mac.
- **Etiquetas:** fonte de máquina de escrever (Courier Prime), só nas etiquetas das seções, como as abas das fichas do app.
- **Assinatura:** cada seção começa com uma **etiqueta em forma de aba de ficha**, e o topo tem a **gaveta desenhada em traço**, que responde ao mouse.
- **Cuidado para não cair no padrão:** sem fundo creme, sem serifa grande e sem cor neon.

## Seções

```
 Gaveta                                        GitHub   Baixar
 ─────────────────────────────────────────────────────────────
  Seus prints,                ┌───────────────────────────┐
  numa gaveta.                │  gaveta em traço fino      │
                              │  (hairline): as fichas     │
  Escolha vários e cole       │  se abrem sob o mouse      │
  todos de uma vez.           └───────────────────────────┘
  [ Baixar para Mac ]  macOS 14+ · grátis · código aberto
 ─────────────────────────────────────────────────────────────
  [aba] Como funciona
  ┌───────────────────────────────────────────────────────┐
  │  a máquina da Gaveta (Anatomy): o print entra, vira   │
  │  ficha, você escolhe várias e elas saem juntas        │
  └───────────────────────────────────────────────────────┘
  1 Tire o print · 2 Ele cai na gaveta · 3 Escolha vários · 4 Cole todos
 ─────────────────────────────────────────────────────────────
  [aba] Gestos            clique copia · bolinha seleciona · ...
 ─────────────────────────────────────────────────────────────
  [aba] Só no seu Mac     Sem conta. Sem internet.
 ─────────────────────────────────────────────────────────────
  Luiz Paulo Frasca Neto · código aberto (MIT) · GitHub
```

1. **Topo:** o nome e os links para o GitHub e o download.
2. **Abertura:** título, uma frase, o botão de download e a figura da hairline.
3. **Como funciona:** a figura da Anatomy e os 4 passos numerados (aqui o número faz sentido, porque é uma sequência real).
4. **Gestos:** lista curta, em duas colunas.
5. **Só no seu Mac:** privacidade em duas frases.
6. **Rodapé:** autor, licença e GitHub.

## As figuras

**Abertura, com a hairline:** uma figura em traço fino, que responde ao mouse e lê bem pequena. Opções no fim do documento.

**Como funciona, com a Anatomy:** uma máquina de verdade cujo funcionamento é a ideia. Um obturador de câmera solta o print, que cai na gaveta de fichas. Um braço levanta as fichas que você escolher, e elas saem juntas por uma fenda, prontas para colar. Passar o mouse escolhe as fichas, e o mostrador diz "3 fichas · um ⌘V cola as 3". Leva cerca de 2 horas para ficar pronta.

## Como cada skill entra

| Skill | Papel na landing |
|---|---|
| frontend-design | Direção de arte: cores, fontes, layout e a assinatura |
| hairline-create | Figura da abertura |
| anatomy | Figura do "Como funciona" |
| refactoring-ui, better-layout | Hierarquia, espaços e alinhamento |
| better-typography | Escala de texto, largura das linhas, carregamento das fontes |
| better-colors, oklch-skill | Paleta em OKLCH e contraste |
| better-writing | Os textos, em português simples |
| better-ui, make-interfaces-feel-better, emil-design-eng, design-engineering | Detalhes, hover e movimento com moderação |
| better-accessibility, web-design-guidelines | Acessibilidade e revisão final |
| impeccable | Crítica e polimento do conjunto |
| ui-ux-pro-max | Conferência de padrões para landing de app |

## Técnica

- Página estática, em `site/` dentro do repositório, sem framework.
- Publicada na Vercel, primeiro como prévia privada e depois no ar.
- **Download:** o app ainda não é assinado pela Apple. Até lá, o botão leva ao GitHub (quando ele voltar a ser público), ou mostra "Em breve".
- **Vídeo:** um vídeo curto de você selecionando 3 prints e colando num chat. Fica para depois que o app estiver assinado.

## Etapas

1. Estrutura aprovada (este documento).
2. Instalar a Anatomy.
3. Figura da abertura com a hairline.
4. Figura do "Como funciona" com a Anatomy.
5. A página, passando pelas skills de layout, texto, cor e tipografia.
6. Revisão de acessibilidade e polimento.
7. Prévia na Vercel e, aprovada, no ar.

## Figura da abertura: opções

- **Fichário.** Uma gaveta de catálogo meio aberta, com sete fichas em pé e abas em degraus. O mouse escolhe uma ficha: ela sobe e as vizinhas se afastam. O mostrador diz há quanto tempo o print foi tirado ("há 5 min").
- **Fresta.** Um gaveteiro fechado com uma fenda no topo. O mouse perto da fenda faz uma ficha deslizar para dentro e a gaveta abrir um pouco. O mostrador conta as fichas ("6 fichas").
- **Gaveta vazia.** A gaveta aberta e vazia, com só a aba de destaque, para a seção final ("tire o primeiro print"). Mais calma e mais curta.
