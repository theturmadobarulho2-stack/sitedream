# Implementation Plan — DreamStation Clips LP
_Última atualização: 2026-05-22_

---

## Stack

Next.js 13.4.10 (App Router, SSR/ISR), React 18, GSAP 3.12 + ScrollTrigger, framer-motion 10, Sass modules.

**Página:** `Preloader → Hero → ClipCarousel (3D) → GamesSection → Footer`

**Cor da marca:** `#4db3f6` (azul DreamStation, extraído de `marca/.../azul.svg`)

---

## Decisões fixas

| Decisão | Escolha |
|---|---|
| Hero background | Escuro (#050010) mesmo com o site claro — gradiente de transição no rodapé da seção |
| Carrossel | 3D circular original — versão flat rejeitada |
| Mobile Pong | Overlay "Gire o celular" em portrait ≤768px |
| Jogos no tema claro | Canvas dos 3 jogos adaptado para luz |
| output: 'export' | Removido — Next.js runtime ativo |

---

## Estado dos sprints

| Sprint | Status | Resumo |
|---|---|---|
| 1 — Fundações | ✅ | Bug fixes, tipografia via next/font, tokens CSS, locomotive-scroll removido |
| 2 — Design System | ✅ | Button, FAB, ProgressBar, KbdHint, SectionShell |
| 3 — Carrossel flat | ❌ | Rejeitado — arquivos em ClipCarouselFlat/ (não montados) |
| 4 — Performance | ✅ | clips.js, dynamic imports ssr:false, pausedRef + visibilitychange |
| 5 — A11y & Mobile | ✅ | useReducedMotion no Hero, landscape warning, skip-link |
| 6 — Deploy | ✅ | OG/Twitter metadata, vercel.json cache headers |
| 7 — Tema claro | ✅ | Tokens reescritos, todos os componentes/canvas migrados para branco + #4db3f6 |
| 8 — DreamPizzatron | ✅ | Mini-game de esteira completo, integrado na GamesSection como 3º jogo |
| 9 — Polimento dos jogos | ✅ | Hook useCanvasScale, overflow Pizzatron, perf ClipPong, pause manual, toolbar label |
| 10 — Arte dos jogos | ⏳ | Briefing + produção de assets reais (sprites, backgrounds, ícones) |

---

## Sprint 8 — detalhes relevantes para manutenção

**Arquivos criados:**
- `src/components/DreamPizzatron/index.jsx` — engine canvas, RAF loop, estados
- `src/components/DreamPizzatron/style.module.scss`
- `src/components/DreamPizzatron/ingredients.js` — dados + `generateOrder()`

**Mecânica atual:**
- 1 pizza na esteira por vez (spawna a próxima só quando a atual é concluída ou sai)
- Velocidade: 1.5→3.5 px/frame, +0.2 a cada 5 pizzas corretas
- Meta: 40 pizzas / limite: 5 erros
- Streak bonus: a cada 5 corretas seguidas (+10/+15/.../+35)
- Freestyle a partir da pizza 10, chance 12%, +2pts por ingrediente
- High score em localStorage separado por modo: `dreampizzatron_best_normal` / `dreampizzatron_best_candy`
- Modo Candy: ingredientes doces, +10pts/pizza (vs +5 normal)

**GamesSection:** grid 3 colunas (→2 em ≤900px →1 em ≤600px), image do Dream Flappy: `/dreambabies/happy-kid.png`

---

## Sprint 9 — Polimento técnico dos jogos

### Problemas identificados

| # | Severidade | Onde | O quê |
|---|---|---|---|
| 1 | 🔴 alta | Flappy | Canvas fixo 480×640 portrait extrapola viewport em telas baixas e fica pequeno em telas grandes |
| 2 | 🔴 alta | Pizzatron | Overlay do menu idle ("DREAM PIZZATRON") é cortado: wrapper tem ~220px (altura do canvas) mas o conteúdo do overlay precisa de ~334px, então o topo é clipado pelo `overflow: hidden` |
| 3 | 🔴 alta | Pong | Travadas de framerate — causadas por `shadowBlur` 18-28 em todo frame + 2 iframes YT renderizando em background + criação de gradient a cada flash de gol |
| 4 | 🟡 média | Todos | Sem scaling para `devicePixelRatio` — canvas fica borrado em telas Retina/4K |
| 5 | 🟡 média | Pong | YT IFrame API carrega na mount do componente (~150KB) mesmo se o usuário nunca clicar em jogar |
| 6 | 🟡 média | Pong | Speed cap da bola acontece DEPOIS de bounces de parede — risco de tunneling em sequência rápida |
| 7 | 🟢 baixa | Todos | Sem botão de pause manual — só pausa via `visibilitychange` |
| 8 | 🟢 baixa | Flappy | Sem feedback de toque no mobile (clique funciona mas sem highlight) |
| 9 | 🟢 baixa | Pizzatron | `mistakeFlash` cobre só o `beltArea` em vez do gameWrapper inteiro |

### Plano de execução

#### 9.1 — Sistema responsivo de canvas (criar utility compartilhada)

Criar `src/lib/useCanvasScale.js`:

```js
// Hook que observa o container e retorna a escala atual + dimensões CSS
// Mantém a resolução interna do canvas (W,H) mas escala via CSS transform
// Aplica devicePixelRatio scaling para hi-DPI
export function useCanvasScale(canvasRef, baseW, baseH, mode = 'contain') {
  // mode: 'contain' (Flappy, Pizzatron) ou 'fit-width' (Pong)
  // retorna { cssW, cssH, dpr } via ResizeObserver no parent
}
```

Lógica:
- `cssW = container.width`, `cssH = cssW * (baseH/baseW)` para `fit-width`
- Para `contain`: respeita aspect ratio, encolhe se altura ultrapassar
- Canvas atributo `width = baseW * dpr`, `height = baseH * dpr`, `ctx.scale(dpr, dpr)` 1x na inicialização
- CSS `style.width = cssW + 'px'; style.height = cssH + 'px'`

#### 9.2 — Fix Flappy responsivo

- Aplicar `useCanvasScale(canvasRef, 480, 640, 'contain')`
- `.gameWrapper` ganha `max-height: 100%` e `display: flex; align-items: center`
- Em `.section` dentro de gamesContent: remover paddings, garantir `height: 100%`
- Header colapsável: ocultar em alturas < 600px (`@media (max-height: 600px)`)
- Botão de pause manual no canto superior direito do canvas

#### 9.3 — Fix Pizzatron menu cortado

Causa raiz: gameWrapper tem altura natural ~220px (canvas) e overlay com conteúdo de ~334px é clipado.

Soluções:
- `.gameWrapper { min-height: 480px }` no estado idle/gameover/victory (via classe condicional)
- Alternativa robusta: separar tela inicial em layout próprio (sem ser overlay absoluto sobre o wrapper) — tela cheia centrada quando `status !== 'playing'`
- `.section { min-height: 100svh }` removido (override do gamesContent já force height 100%) — testar
- `mistakeFlash` movido para dentro de gameWrapper (não beltArea)

#### 9.4 — Fix performance Pong

- **Reduzir shadowBlur:** paddles `18 → 8`, bola `28 → 12`
- **Cachear gradientes:** criar grad left/right uma vez no mount, reusar no draw
- **Lazy YT init:** mover criação dos players para dentro de `handleStart` (primeira partida) — economiza ~150KB de JS + render de 2 iframes parados
- **Loader visual:** exibir "Carregando partida..." enquanto YT API e players inicializam (~500ms)
- **Speed cap antes de bounces:** mover cap para depois da física da bola, antes dos checks de colisão
- **`getContext('2d', { alpha: false })`** — opaque canvas é ~15% mais rápido
- **Throttle visibility:** quando `pausedRef.current = true`, pular `draw()` também (atualmente só pula física)

#### 9.5 — Hi-DPI scaling (todos)

Aplicar o mesmo padrão de `useCanvasScale` em Flappy, Pong e Pizzatron — bordas crisp em qualquer densidade de pixel.

#### 9.6 — Pause manual + UX

- FAB de pause/play no canto superior direito do canvas (igual ao Modo Foco da GamesSection)
- Overlay leve `.pauseOverlay` quando pausado: "PAUSADO · clique para continuar"
- Ativável via `P` no teclado e clique no FAB

#### 9.7 — Indicador de jogo ativo na toolbar

- `gameToolbar` ganha label do jogo no centro: "DREAM FLAPPY" / "CLIP PONG" / "DREAM PIZZATRON"
- Útil quando o usuário entra em fullscreen e perde contexto

### Arquivos afetados (Sprint 9)

| Arquivo | O que muda |
|---|---|
| `src/lib/useCanvasScale.js` | **NOVO** — hook responsivo + hi-DPI |
| `src/components/DreamFlappy/index.jsx` | useCanvasScale, getContext alpha:false, pause manual |
| `src/components/DreamFlappy/style.module.scss` | gameWrapper flex, header colapsável |
| `src/components/ClipPong/index.jsx` | shadowBlur reduzido, gradientes cacheados, YT lazy init, loader, speed cap |
| `src/components/ClipPong/style.module.scss` | Loader styles |
| `src/components/DreamPizzatron/index.jsx` | useCanvasScale, layout idle separado, mistakeFlash repositioned |
| `src/components/DreamPizzatron/style.module.scss` | min-height conditional ou layout idle dedicado |
| `src/components/GamesSection/index.jsx` | Label do jogo ativo na toolbar |
| `src/components/GamesSection/style.module.scss` | Estilo do label central |

### Verificação Sprint 9

- [ ] Flappy: canvas cabe inteiro na viewport em 1366×768, 1920×1080, 1280×720, iPad portrait
- [ ] Pizzatron menu: título "DREAM PIZZATRON" e botão COMEÇAR visíveis sem corte
- [ ] Pong: 60 FPS estável em laptop modesto (Intel UHD)
- [ ] Todos os jogos: bordas crisp em display Retina (DPR 2-3)
- [ ] Pong: YT iframes só carregam ao clicar COMEÇAR
- [ ] Pause manual funciona via tecla P e botão FAB
- [ ] Toolbar mostra nome do jogo ativo

---

## Sprint 10 — Arte dos jogos (briefing para produção)

**Premissa:** as imagens atuais dos Dream Babies são placeholders. Produzir arte autoral consistente com a marca DreamStation (azul `#4db3f6`, vibe Y2K limpa, paleta clara). Sprint 10 só roda depois do Sprint 9 — a arquitetura responsiva define as resoluções finais dos assets.

### Princípios visuais (todos os jogos)

- **Paleta principal:** azul `#4db3f6` + variações (`#1a88d4`, `#b3daf9`), brancos quentes, acentos `#f5c400` (amarelo) e `#ff2ec7` (magenta) com moderação
- **Estilo:** flat com sombras suaves, contornos finos (1-2px), vibe Y2K reformulada (cromados leves, gradientes sutis)
- **Formato:** PNG com transparência para sprites; resolução 2x do display (ex: sprite renderizado a 48px → exportar 96×96)
- **Sem realismo fotográfico** — manter linguagem ilustrativa coerente entre os três jogos

### 10.1 — DreamFlappy

**Personagens (Dream Babies)** — substituir PNGs atuais em `public/dreambabies/`:

| Asset | Resolução | Notas |
|---|---|---|
| 10 personagens em pose voadora | 96×96 (display 48) | Mesmo enquadramento, centro do "voo", braços abertos ou estilizados — facilita rotação no canvas. Fundo transparente. Sombra própria leve. |
| Variação de cada personagem em "caindo" (opcional) | 96×96 | Para o momento do game over, expressão diferente |

**Cenário:**

| Asset | Resolução | Notas |
|---|---|---|
| Background parallax — camada distante | 1440×640 | Skyline urbano estilizado, prédios em silhueta azul-claro |
| Background parallax — camada média | 1440×640 | Nuvens estilizadas (formas geométricas suaves), transparência parcial |
| Sprite dos canos (pipe body) | 128×512 | Cano metálico estilizado azul, gradient sutil, tile vertical |
| Sprite das tampas (pipe cap) | 192×64 | Variação topo/base, com leve highlight cromado |

**Lista de personagens atuais:** bearded-man, cat-boy, curly-guy, fisherman, glasses-girl, happy-kid, heart-guy, mustache-man, sailor-boy, side-gaze.

### 10.2 — ClipPong

**Elementos do jogo:**

| Asset | Resolução | Notas |
|---|---|---|
| Paddle esquerdo (player) | 56×400 | Visual neon azul, mais "vivo" que o adversário. Pode ter detalhe central tipo LED |
| Paddle direito (AI/clipe) | 56×400 | Visual azul mais escuro/metálico — distinção clara do player |
| Bola | 64×64 | Esfera branca com glow azul + leve highlight. Pode ter detalhe estilizado (estrela?, hexágono interno?) |
| Troféu (tela campeão) | 256×256 | Troféu cromado estilo Y2K com texto "DREAMSTATION" abaixo ou na base |
| Partículas de gol (opcional) | 32×32 × 3 variantes | Sparkles que sairiam quando a bola entra no gol — animação no canvas |

**Detalhe importante:** os clipes (vídeos) continuam sendo o fundo do canvas. A arte do paddle/bola deve contrastar bem com vídeos coloridos atrás (paleta azul forte + glow ajuda).

### 10.3 — DreamPizzatron

**Esteira e ambiente:**

| Asset | Resolução | Notas |
|---|---|---|
| Sprite da esteira (loop tile horizontal) | 240×120 | Belt metálica azul-claro com setas/dashes em movimento, repetível |
| Bordas da esteira (top/bottom rail) | 1600×16 | Detalhes metálicos das laterais, contornam o canvas |
| Fundo do canvas | 1600×440 | Cenário de cozinha/laboratório estilizado por trás da esteira (sutil, não distrair) |

**Pizza e ingredientes:**

| Asset | Resolução | Notas |
|---|---|---|
| Base de pizza (crua) | 192×192 | Vista de cima, massa clara com borda definida |
| Indicador de pizza ativa | 192×192 | Overlay glow azul aplicável sobre a base (alpha) |
| Ingredientes modo normal — 7 sprites | 96×96 cada | Tomate (vermelho), Branco (creme), Muçarela (amarela), Peixe, Camarão, Cogumelo, Pimenta — visual ilustrativo, não fotorrealista |
| Ingredientes modo Candy — 7 sprites | 96×96 cada | Chocolate, Morango, Granulado, Marshmallow, Jellybean, Alcaçuz, Choco Chips |

**Interface do menu:**

| Asset | Resolução | Notas |
|---|---|---|
| Alavanca do Modo Candy (off) | 128×192 | Alavanca metálica em posição "normal" — ar de console retrô Y2K |
| Alavanca do Modo Candy (on) | 128×192 | Mesma alavanca puxada para baixo, com brilho vermelho/rosa |
| Logo "PIZZATRON" estilizado | 512×128 | Tipografia chunky Y2K, pode aproveitar o título do menu |
| Chef mascote (opcional) | 256×256 | Personagem do Pizzatron — útil na tela idle e gameover |

### 10.4 — Convenções de nomenclatura

```
public/games/
├── flappy/
│   ├── bg-far.png
│   ├── bg-mid.png
│   ├── pipe-body.png
│   ├── pipe-cap.png
│   └── babies/             (substitui /dreambabies)
│       ├── bearded-man.png
│       ├── ... (resto)
├── pong/
│   ├── paddle-player.png
│   ├── paddle-ai.png
│   ├── ball.png
│   ├── trophy.png
│   └── spark-{a,b,c}.png
└── pizzatron/
    ├── belt.png
    ├── belt-rail.png
    ├── bg.png
    ├── pizza-base.png
    ├── pizza-glow.png
    ├── ingredients/
    │   ├── normal-{tomato,white,mozzarella,fish,shrimp,mushroom,pepper}.png
    │   └── candy-{chocolate,strawberry,sprinkles,marshmallow,jellybean,licorice,chocochips}.png
    ├── lever-off.png
    ├── lever-on.png
    ├── logo.png
    └── chef.png  (opcional)
```

### 10.5 — Integração no código (depois dos assets prontos)

- Substituir `drawPipe()` no Flappy por `ctx.drawImage(pipeBody)` + `drawImage(pipeCap)`
- Substituir desenho dos paddles/bola no Pong por sprites
- Substituir `drawIngOnPizza()` no Pizzatron por sprites dos ingredientes
- Preloader de assets: criar utility `useImageBatch(['/games/flappy/bg-far.png', ...])` que retorna objeto `{ images, ready }`
- Esperar `ready === true` antes de iniciar a partida (overlay "Carregando arte...")

### Arquivos afetados (Sprint 10)

| Arquivo | O que muda |
|---|---|
| `public/games/**` | **NOVOS** — todos os assets PNG |
| `src/lib/useImageBatch.js` | **NOVO** — preloader de imagens |
| `src/components/DreamFlappy/index.jsx` | drawPipe usa sprite, parallax background |
| `src/components/ClipPong/index.jsx` | Paddles, bola, troféu como sprites |
| `src/components/DreamPizzatron/index.jsx` | Ingredientes, esteira, alavanca como sprites |
| `src/components/DreamPizzatron/style.module.scss` | Alavanca via background-image (não emoji) |

### Verificação Sprint 10

- [ ] Todos os 10 personagens do Flappy substituídos por sprites consistentes
- [ ] Cenário do Flappy ganha parallax (camada distante + média)
- [ ] Pong: paddles e bola com sprites, troféu na tela de campeão
- [ ] Pizzatron: ingredientes ilustrados, esteira animada, alavanca real do menu
- [ ] Preloader exibe progresso enquanto assets carregam
- [ ] Nenhum asset > 200KB (otimizar via tinypng)
- [ ] Total de assets do bundle dos jogos < 2MB

---

## Tarefas pendentes

- Produzir assets do Sprint 10 (usuário) → Sprint 10 integra no código

---

## Métricas de sucesso

- Sem erros de console em nenhum fluxo
- Lighthouse mobile: Perf ≥ 90, A11y ≥ 95, BP ≥ 95, SEO ≥ 95
- 60 FPS sustentado durante scroll do carrossel
- Build < 250 KB JS gzipped
- Azul `#4db3f6` como cor dominante de interação em 100% dos componentes
