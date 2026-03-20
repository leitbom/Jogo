# Guia Definitivo: Implementação de Sprites e Efeitos Sonoros no Tactical Shooter

Este documento contém todas as instruções e detalhes técnicos para a preparação e alocação de arquivos de mídia (imagens e sons) no jogo. Ao seguir esta estrutura, o código engine (no `public/index.html`) será capaz de carregar e reproduzir os arquivos automaticamente.

---

## 1. Estrutura de Diretórios Obrigatória

Todos os recursos visuais e sonoros do jogo devem estar localizados dentro da pasta `public/assets/`. O servidor Express já expõe a pasta `public/`, o que torna estes arquivos acessíveis diretamente pelos clientes através da URL `/assets/...`.

A estrutura exata deve ser a seguinte:

```text
Jogo/
└── public/
    └── assets/
        ├── sprites/
        │   ├── agents/
        │   ├── weapons/
        │   └── fx/
        └── sounds/
            ├── bgm/
            ├── sfx/
            └── voice/
```

*(Se as pastas não existirem, crie-as manualmente antes de colocar os arquivos).*

---

## 2. Padrões Técnicos e Formatos

Para garantir performance e consistência visual, siga estas regras ao criar ou exportar os arquivos:

### 2.1. Sprites (Imagens e Animações)
- **Formato:** `.png` (Obrigatório, para suportar transparência/Canal Alpha).
- **Folhas de Sprite (Spritesheets):** As animações devem ser exportadas preferencialmente em uma **tira horizontal** (uma linha única de frames, da esquerda para a direita). 
  - *Exemplo:* Uma animação de "Caminhar" com 6 frames de 64x64 pixels resultará em um arquivo `.png` de 384x64 pixels.
- **Resolução:** O jogo usa uma lógica Top-Down (visão de cima). O centro do sprite deve originar o seu eixo no meio geométrico da imagem. Recomendado: `128x128` ou `256x256` para Agentes.
- **Rotação:** O Sprite "Base" (Frame 0 de Idle ou Caminhada) deve estar **apontando para a direita (0 graus ou Eixo X positivo)**. O código do jogo rotacionará essa imagem dinamicamente para o local onde o mouse estiver apontando.

### 2.2. Áudio (Sons e Músicas)
- **Música (BGM):** `.mp3` (Tamanho menor, ideal para loops de fundo).
- **Efeitos (SFX):** `.mp3` ou `.wav`. Sons muito cursivos (ex: tiros) podem ser `.wav` para evitar atraso de compressão, mas arquivos pequenos `.mp3` funcionam perfeitamente na web atual.

---

## 3. Nomenclatura Estrita de Arquivos

O motor lógico (Engine) fará o carregamento (`preload`) em lote destes arquivos. Mantenha as nomenclaturas exatas apresentadas abaixo (tudo em letras minúsculas).

### 3.1. Sprites dos Agentes
Pasta: `public/assets/sprites/agents/`

Cada Agente deve ter pelo menos duas animações base (Idle e Walk) e uma representação morto (Dead).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CATEGORIA: PLAYER (Agentes Específicos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Arquivo               Frames  FPS   Loop   Frame (px)   Sheet total (px)   Notas
  ─────────────────────────────────────────────────────────────────────────────────
  fable_idle.png           4     8    SIM    128 × 128     512 × 128         Respirando (arma em repouso)
  fable_walk.png           8    16    SIM    128 × 128    1024 × 128         Andando / Movimento Padrão
  fable_dead.png          10    12    NÃO    128 × 128    1280 × 128         One-shot ao morrer
  fate_idle.png            4     8    SIM    128 × 128     512 × 128         Respirando (arma em repouso)
  fate_walk.png            8    16    SIM    128 × 128    1024 × 128         Andando / Movimento Padrão
  fate_dead.png           10    12    NÃO    128 × 128    1280 × 128         One-shot ao morrer
  foul_idle.png            4     8    SIM    128 × 128     512 × 128         Respirando pesado
  foul_walk.png            8    16    SIM    128 × 128    1024 × 128         Passos lentos / Movimento
  foul_dead.png           10    12    NÃO    128 × 128    1280 × 128         One-shot ao morrer

**Configuração no Código:** Quando eu editar o `index.html`, adicionarei parâmetros associados no objeto `AGENTS` para definir o número de frames e velocidade mapeados exatamente desta tabela.

### 3.2. Sprites das Armas e Objetos
Pasta: `public/assets/sprites/weapons/` e `public/assets/sprites/fx/`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CATEGORIA: ARMAS E CHÃO (Weapons)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Arquivo               Frames  FPS   Loop   Frame (px)   Sheet total (px)   Notas
  ─────────────────────────────────────────────────────────────────────────────────
  ak47.png                 1     -    -       64 × 64       64 × 64          Arma visual (se aplicável ao chão)
  deagle.png               1     -    -       64 × 64       64 × 64          Handgun
  minigun.png              1     -    -       64 × 64       64 × 64          Foul
  knife.png                1     -    -       64 × 64       64 × 64          Melee

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CATEGORIA: HABILIDADES & FX (Efeitos e Utilitários)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Arquivo               Frames  FPS   Loop   Frame (px)   Sheet total (px)   Notas
  ─────────────────────────────────────────────────────────────────────────────────
  shield.png               8    12    SIM    256 × 256    2048 × 256         Escudo de Energia (Foul) em loop dinâmico
  camera.png               4     8    SIM     48 × 48      192 × 48          Câmera colocada na parede (Fate)
  tower.png                6     8    SIM     56 × 56      336 × 56          Torreta ativa girando (Fate)
  grenade_he.png           8    20    SIM     32 × 32      256 × 32          Granada em voo e quicando
  grenade_flash.png        8    20    SIM     32 × 32      256 × 32          Bomba de luz em voo
  explosion_sheet.png     14    24    NÃO    128 × 128    1792 × 128         Grande explosão HE · one-shot
  muzzle_flash.png         5    30    NÃO     48 × 48      240 × 48          Flash rápido de disparo · ponta da arma

### 3.3. Efeitos Sonoros (SFX)
Pasta: `public/assets/sounds/sfx/`

*Tiros (Um som individual, sem delay no começo do áudio):*
- `shoot_ak47.mp3`
- `shoot_deagle.mp3`
- `shoot_minigun.mp3`
- `shoot_tower.mp3`
- `knife_slash.mp3`
- `knife_hit.mp3` (Som gordo para Backstab ou acerto)

*Habilidades / Mecânicas:*
- `he_bounce.mp3` (Granada quicando)
- `he_explode.mp3` (Explosão pesada)
- `flash_explode.mp3` (Estouro de luz + Zumbido)
- `tower_build.mp3` (Som metálico/mecânico)
- `camera_place.mp3`
- `shield_up.mp3` (Foul ativando escudo)
- `shield_reflect.mp3` (Bala batendo no escudo de energia)
- `reload.mp3` (Tirando e pondo carregador comum)
- `empty_click.mp3` (Sem bala na agulha)

*Movimentação:*
- `step_default.mp3` (Passo seco no chão)
- `hit_flesh.mp3` (Agente levando dano)
- `death.mp3` (Ou gemidos independentes, `death_fable.mp3`)

### 3.4. Música (BGM)
Pasta: `public/assets/sounds/bgm/`

- `lobby_theme.mp3` (Toca no Menu e Seleção de Sala)
- `combat_theme.mp3` (Ritmo acelerado, toca durante o `Survival`)
- `victory_theme.mp3` (Toca no Endgame)

---

## 4. O Sistema de *AssetManager* no Código

Foi integrado ao jogo um objeto arquitetural chamado `AssetManager`. Ele executa três fases essenciais:
1. **Preload:** Todos os links gerados por nomes exatos (ex: chamando `/assets/sprites/agents/fable_idle.png`) serão inseridos numa fila.
2. **Loading Screen:** Antes do jogo permitir que você sequer se mova para o Lobby, o jogo fará o download destas imagens. Ele exibirá para o jogador a barra preenchendo.
3. **Fallback Automático (À Prova de Falhas):** Como alguns arquivos podem estar pendentes (ou você ainda não os desenhou), o sistema aceita **FALHAS**.
   - Se o `fable_idle.png` não for encontrado (ex: erro 404 gerado pelo Express), o Engine fará log visual no terminal e, na hora do Render, desenhará o "Círculo com triângulo branco" antigo por cima (o fallback primitivo).
   - Isso permite que você vá testando as imagens **gradualmente**. Põe as armas e vê, mas deixa os Agentes como bolinhas no início; o código não irá quebrar!

## 5. Exemplo de Configuração de Animação

No `public/index.html`, o Objeto `AGENTS` passa a suportar propriedades visuais:

```javascript
fable: {
  /* Status Base... */
  // ...
  
  // Parâmetros de Sprite
  sprite: {
    idle: { url: 'fable_idle.png', frames: 4, speed: 0.15 },
    walk: { url: 'fable_walk.png', frames: 8, speed: 0.12 },
    dead: { url: 'fable_dead.png', frames: 1, speed: 0 },
    scale: 1.2,           // Escalar o sprite caso tenha saido pequeno demais no arquivo PNG
    offsetY: 0            // Opcional para correção do "Pivot"
  }
}
```

O `render() loop` usa `Clock.now()` (para garantir taxa constante e independente de lag) e seleciona o frame cortando os eixos de contexto nativos do HTML5 `ctx.drawImage()`.

### Vamos preparar o código!

Para completar ambas as solicitações, a partir da leitura deste guia, eu já comecei as modificações no `index.html`. Criarei o `AssetManager`, inserirei áudios no `onKeyQ` e `fireBullet`, e prepararei o `drawRemotePlayers` e `drawPlayer` com lógica de spritesheets baseada em `Date.now()`.
