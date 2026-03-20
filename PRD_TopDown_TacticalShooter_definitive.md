# PRD — Top-Down Tactical Shooter (MVP)

**Versao:** 2.0
**Data:** 2026-03-01

## 1. Visao Geral do Produto

| Campo                 |           Valor                                          |
|-----------------------|----------------------------------------------------------|
| Genero                | Top-down shooter tatico multiplayer (estilo Valorant 2D) |
| Plataforma            | Browser (PC — Windows, Mac, Linux)                       |
| Jogadores por partida | Ate 4 (FFA) ou 2v2 (equipas)                             |
| Modos de jogo         | Survival (2-4 jogadores)                                 |
| Modo MVP              | Survival                                                 |
| Condicao de vitoria   | Ultimo jogador vivo vence                                |
| Personagens (MVP)     | 3 — Fable (Assalto), Fate (Inteligência), Foul (Tanque). |
| Referencias           | BulletEcho, Hotline Miami, Valorant                      |
| Equipa                | 2 desenvolvedores (JS/Node.js)                           |
| Timeline estimada     | 6-8 meses                                                |

### 1.1 Proposta de Valor

Jogo tático e estratégico multiplayer online com gerenciamento de recursos (munição finita, stamina, habilidades). Cada personagem possui caracteristicas únicas e imutáveis, levando ao jogador escolher aquele que se adapta melhor ao seu estilo de jogo. Para o MVP teremos apenas 3 personagens para representar alguma variedade de jogabilidade, por exemplo Foul é um tanque que possui habilidades defensivas e capacidade de contra-ataques com seu escudo refletor de tiros, podendo, dependendo da habilidade do jogador causar dano ao inimigo sem gastar balas. Já Fable possui uma mecânica mais básica voltada pelo controle pela artilharia constante, podendo intercalar timings de recarga com seus explosivos e gerando aberturas nas defesas inimigas. Quanto a Fate, por ser um personagem fisicamente mais frágil, pode recorrer às suas habilidades para conseguir informação, atrair inimigos e se garantir contra mais de 1 inimigo caso necessário.

### 1.2 Core Loop (In-game)

Spawn → Explorar (ouvir passos) → Encontrar inimigo → Decidir: engajar ou recuar?
→ Combate (gerir municao, stamina, posicao) → Kill ou Fuga → Repetir

### 1.3 Modos de Jogo

O jogo suporta multiplos modos com diferentes niveis de complexidade. Inspiracao principal: **BulletEcho** — agentes com habilidades unicas, combate tatico, informacao e posicionamento sao tao importantes quanto aim.

Todos os modos sao construidos a partir de **feature toggles** (ver 1.5) — o mesmo motor suporta desde um FFA casual ate um modo ultra-realista. A diferenca entre modos e apenas configuracao.

#### Estrutura: Tipo de Partida + Objetivo + Feature Toggles

Um modo de jogo e a combinacao de tres coisas:

MODO = Tipo de Partida + Objetivo + Feature Toggles

Exemplo: "Competitive Search & Destroy"
  Tipo: Equipas 5v5
  Objetivo: Search & Destroy (plantar/desarmar bomba)
  Toggles: skills ON, friendly fire ON, economy ON


**Tipos de Partida:**

| Tipo                   | Descricao                                                                  |
|------------------------|----------------------------------------------------------------------------|
| **FFA (Free For All)** | Todos contra todos. Sem equipas                                            |
| **Equipas (Team)**     | Tamanho configuravel: 1v1, 2v2, 3v3, 4v4, **5v5**. Dano amigo configuravel |

Parametro `team_size` define o numero de jogadores por equipa (1 a 5). FFA usa `team_size: 1`.

**Objetivos (Win Conditions):**

| Objetivo                         | Descricao                                                                              | Requer no mapa                        |
|----------------------------------|----------------------------------------------------------------------------------------|---------------------------------------|
| **Eliminacao**                   | Ultimo jogador/equipa vivo(a) vence. Sem respawn                                       | Spawn points                          |
| **Kill Limit**                   | Primeiro a atingir X kills vence. Com respawn                                          | Spawn points                          |
| **Tempo**                        | Equipa/jogador com mais kills quando o tempo acaba. Com respawn                        | Spawn points                          |
| **Controle de Area**             | Controlar zona(s) marcada(s) no mapa. Pontos por tempo de controle                     | Spawn points + Zonas de controle      |
| **Search & Destroy**             | Atacantes plantam bomba num bomb site. Defensores impedem/desarmam. Rounds sem respawn | Spawn points + Bomb sites             |
| **Extraccao**                    | Uma equipa deve levar um objeto/VIP ate um ponto de extraccao                          | Spawn points + Pontos de extraccao    |
| **Dominio**                      | Zona segura encolhe progressivamente. Ultimo vivo ganha                                | Spawn points                          |
| **Captura de Bandeira** (futuro) | Roubar bandeira inimiga e trazer ate a base                                            | Spawn points + Bases de bandeira      |
| **VIP** (futuro)                 | Uma equipa protege um jogador VIP (HP reduzido), outra tenta elimina-lo                | Spawn points + Ponto de extraccao VIP |

**Zonas de mapa para objetivos** — estas areas sao desenhadas no Map Editor (ver PRD_Map_Editor.md) e exportadas no JSON:
- **Zona de controle (KoTH):** Area retangular. Quando todos os jogadores na zona sao de uma equipa, comeca a contagem
- **Bomb site:** Area retangular. Atacante dentro da area pode iniciar plantacao (segura tecla, ~4s). Defensor pode desarmar (~7s)
- **Ponto de extraccao:** Area retangular. Jogador/VIP precisa de entrar e permanecer ~3s para vencer

#### Modo 1: Survival (Solo)

| Parametro       | Valor                                        |
|-----------------|----------------------------------------------|
| Conceito        | Combate puro                                 |
| Tipo de partida | FFA ou Equipas (qualquer tamanho)            |
| Objetivo        | Eliminacao (default) ou Kill Limit           |
| Personagens     | Todos disponiveis                            |
| Ideal para      | Jogadores que preferem partidas rápidas solo |
| Quando          | Modo MVP — primeira implementacao            |

#### Modo 2: King of the Hill (Equipas)

| Parametro           | Valor                                                                        |
|---------------------|------------------------------------------------------------------------------|
| Conceito            | Controlar zona(s) marcada(s) no mapa. Pontuacao por tempo de controle        |
| Tipo de partida     | Equipas (default 2v2, suporta ate 5v5)                                       |
| Objetivo            | Controle de Area                                                             |
| Respawn             | Sim, configuravel (default 5s)                                               |
| Condicao de vitoria | Primeira equipa a atingir X pontos (configuravel)                            |
| Zonas               | 1-3 zonas de controle marcadas no mapa                                       |
| Contestacao         | Se jogadores de ambas equipas estao na zona, e "contestada" — ninguem pontua |
| Skills              | Configuravel via feature toggle                                              |
| Quando              | Pos-MVP                                                                      |

#### Modo 3: Search & Destroy (Equipas)

| Parametro           | Valor                                                          |
|---------------------|----------------------------------------------------------------|
| Conceito            | Atacantes tentam plantar bomba. Defensores impedem ou desarmam |
| Tipo de partida     | Equipas (default 5v5)                                          |
| Objetivo            | Search & Destroy                                               |
| Rounds              | Best of X (configuravel, default BO13 — primeiro a 7 rounds)   |
| Troca de lado       | A cada metade                                                  |
| Respawn             | **Nao** — eliminado = fora do round                            |
| Condicao de vitoria | Primeira equipa a vencer x rounds (configuravel)               |
| Tempo por round     | Configuravel (default 90s)                                     |
| Bomba site          | 2 bomb sites no mapa (A e B)                                   |
| Plantar bomba       | Atacante dentro do bomb site, segura tecla (default 4s)        |
| Tempo de detonacao  | Apos plantar, bomba explode em X segundos (default 40s)        |
| Desarmar            | Defensor no bomb site, segura tecla (default 7s)               |
| Skills              | Configuravel via feature toggle                                |
| Quando              | Pos-MVP                                                        |

**Condicoes de vitoria por round:**
- Atacantes: plantar bomba e ao final do timer ela explode, OU eliminar todos os defensores
- Defensores: desarmar bomba, OU eliminar todos os atacantes antes de eles plantarem a bomba, OU tempo acaba sem bomba plantada

#### Custom Games

O host pode criar partidas totalmente customizadas combinando **qualquer modo** com **qualquer feature toggle**:

Exemplo: "Realistic Deathmatch"
  Modo base: Deathmatch
  + Visao turva por HP: ON
  + Recoil agressivo: ON
  + Voice chat proximidade: ON
  + Skills: OFF
  + Friendly fire: ON

Exemplo: "Casual Tactical"
  Modo base: Tactical
  + Skills: ON
  + Friendly fire: OFF
  + HP regenera: ON
  + HUD completo: ON

Exemplo: "Sniper Only Survival"
  Modo base: Survival
  + Armas permitidas: apenas Sniper
  + FOV override: 60° (mais estreito)
  + Alcance visao: 600u (mais longe)
  + Velocidade do jogador: 150 u/s (mais lento)

####  Exemplo visual de Selecao de Modo no Lobby

┌──────────────────────────────────────────────────────────┐
│                   SELECIONAR MODO                        │
│                                                          │
│  Tipo: ( ) FFA    (•) Equipas                            │
│                                                          │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│  │ GUNFIGHT  │ │ TACTICAL  │ │ SURVIVAL  │ │DEATHMATCH │ │
│  │ Apenas    │ │ Tiro +    │ │ Ultimo    │ │ Respawn   │ │
│  │ Tiro      │ │ Skills    │ │ vivo      │ │ + Kills   │ │
│  │ [Futuro]  │ │ [Futuro]  │ │ [Ativo]   │ │ [Futuro]  │ │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐               │
│  │ REALISTIC │ │ KING OF   │ │  CUSTOM   │               │
│  │ Hardcore  │ │ THE HILL  │ │  Config.  │               │
│  │ Sem HUD   │ │ 2v2 Area  │ │  livre    │               │
│  │ [Futuro]  │ │ [Futuro]  │ │ [Futuro]  │               │
│  └───────────┘ └───────────┘ └───────────┘               │
│                                                          │
│  Feature Toggles:                                        │
│  [•] Skills OFF  [ ] Friendly Fire [ ] Realistic Vision  |
│  [ ] Proximity Chat  [ ] Fatigue  [ ] Aggressive Recoil  │
└──────────────────────────────────────────────────────────┘

### 1.4 Sistema de Personagens , Visão (FOV) e Skills

Inspirado diretamente no Valorant: cada jogador escolhe um **agente** (personagem) com habilidades únicas. A escolha do agente define o papel na equipa e o estilo de jogo.

**Status atual:** Os 3 agentes do MVP (Fable, Fate, Foul) tem equipamentos funcionais definidos no PRD_Characters_v2.md. Skills avancadas (pos-MVP) serao iteradas com playtesting.

#### Filosofia de Design

- Skills **complementam** o combate, nao o substituem — um jogador fraco não compensa com skills.
- Cada skill tem **custo tatico**: usar uma skill produz som, tem cooldown, e te deixa vulnerável durante a animaçãoo
- Skills devem criar **decisoes interessantes**, não vantagens automáticas
- O jogo deve ser divertido e balanceado MESMO sem skills.

#### Personagens Atuais

| Personagem | Classe (MVP)   | Equipamentos MVP                            | Skills/Habilidades   |
|------------|----------------|---------------------------------------------|----------------------|
| **Fable**  | (Assalto)      | Rapido, AK-47, sem colete, baixo HP efetivo | Granada HE ×4        |
| **Fate**   | (Inteligência) | Visao estreita, Desert Eagle, colete leve   | Camera, Drone, Torre |
| **Foul**   | (Tanque)       | Lento, Minigun, colete pesado, HP alto      | Escudo, Flash tatica |


#### Deployables (Drones, Robos, Torretas)

Deployables sao entidades que o jogador coloca/lanca e controla remotamente. **Enquanto controla um deployable, o jogador fica parado e vulneravel.**

| Parametro       | Descricao                                                                                      |
|-----------------|------------------------------------------------------------------------------------------------|
| Ativacao        | Jogador usa a skill, deployable spawna na sua posicao ou e lancado                             |
| Controle        | Camera muda para o deployable. Jogador controla com WASD + mouse. Personagem fica imovel       |
| Duracao         | Tempo limite configuravel (default 8-15s dependendo do tipo)                                   |
| Cancelar        | Jogador pode sair do controle a qualquer momento (tecla E). Deployable fica imovel ou desativa |
| Vulnerabilidade | O personagem real pode ser morto enquanto controla o deployable                                |
| Destruicao      | Deployables podem ser destruidos por tiros (HP baixo, 1-3 tiros)                               |
| Visao           | Deployable tem seu proprio cone FOV (geralmente mais estreito, ~60°)                           |
| Som             | Deployables fazem barulho — posicional, alertam inimigos                                       |

#### Visão (FOV), ou "lanterna"

O cone FOV, pode ser considerado como a "lanterna", é visível para todos os jogadores, portanto é um recurso tático imprescindível para todos os personagens e padrão para todos no quesito de maximum range, mas se diferenciando na questão do angulo de abertura do cone para cada personagem.
A lanterna possui um efeito de fade, ou seja, conforme a "luz" for se distanciando do personagem que a emite mais fraca é sua intensidade, proporciando uma sensação de realismo e podendo ser usada com mais precisão como recurso de informação tática.

#### Interacao Skills + Cone FOV

O cone FOV cria oportunidades únicas para skills:
- **Smokes** bloqueiam raios do cone — criam escuridao real, nao apenas visual
- **Flashes** so afetam jogadores que tem a flash dentro do seu cone de visao (olhar para o lado evita)
- **Recon** revela inimigos mesmo fora do cone — informacao extremamente valiosa
- **Traps** sao invisiveis fora do cone — recompensam jogadores atentos

### 1.5 Sistema de Configuracao (Feature Toggles)

**Principio fundamental: TUDO no jogo e configuravel via parametros.** Os modos de jogo sao apenas presets de configuracao. Custom Games permite ajustar tudo.

O servidor carrega um JSON de configuracao por partida. Cada parametro tem um valor default e pode ser sobrescrita pelo modo de jogo ou pelo host em Custom Games.

#### Feature Toggles (booleanos)

| Toggle                        | Default | Descricao                                                  |
|-------------------------------|---------|------------------------------------------------------------|
| `skills_enabled`              | false   | Habilidades de agentes ativadas                            |
| `equipment_enabled`           | false   | Equipamentos de agentes ativados (granadas, escudos, etc.) |
| `friendly_fire`               | false   | Tiros em aliados causam dano                               |
| `proximity_voice`             | false   | Voice chat por proximidade (inimigos ouvem)                |
let lastTime = performance.now();

function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  update(dt);
  render();
  updateHUD();

  requestAnimationFrame(loop);
}

| `minimap_last_known_duration` | 5       | Segundos que "?" de ultima posicao permanece no minimapa   |
| `gadget_detection_range`      | 30      | Distancia (u) a partir da qual inimigos veem gadgets       |

#### Parametros Numericos

**Visao:**

| Parametro                  | Default | Notas                                          |
|----------------------------|---------|------------------------------------------------|
| `vision_distance`          | 800     | Alcance maximo do cone de visao (unidades)     |
| `vision_fov`               | 70      | Abertura do cone em graus                      |
| `vision_fov_crouched`      | 90      | FOV quando agaixado                            |
| `vision_fov_running`       | 60      | FOV quando correndo                            |
| `vision_blur_hp_threshold` | 0.25    | % de HP abaixo do qual visao comeca a degradar |
| `vision_blur_intensity`    | 0.7     | Intensidade maxima do blur a 0 HP              |

**Visao por arma (override do FOV enquanto equipada):**

| Arma         | `weapon_fov` | `weapon_vision_distance` | Notas                                      |
|--------------|--------------|--------------------------|--------------------------------------------|
| Desert Eagle | 75°          | 800 u                    | Mais 5° de ângulo de visão                 |
| AK-47        | 80°          | 800 u                    | Mais 10° de ângulo e visão                 |
| Minigun      | 85°          | 800 u                    | Mais 15° de ângulo de visão                |
| Melee        | 110°         | 800 u                    | Mais 40° de ângulo de visão                |

**Partida e Equipa:**

| Parametro              | Default       | Notas                                                                               |
|------------------------|---------------|-------------------------------------------------------------------------------------|
| `team_size`            | 2             | Jogadores por equipa (1-5)                                                          |
| `max_players`          | 10            | Total de jogadores na partida                                                       |
| `objective`            | "elimination" | elimination, kill_limit, time, area_control, search_destroy, extraction, domination |
| `kill_limit`           | 15            | Kills para vencer                                                                   |
| `match_time_limit`     | 300           | Segundos de partida                                                                 |
| `round_time`           | 90            | Segundos por round                                                                  |
| `rounds_to_win`        | 7             | Rounds para vencer (Search & Destroy)                                               |
| `respawn_time`         | 3             | Segundos ate renascer                                                               |
| `bomb_plant_time`      | 4             | Segundos para plantar bomba                                                         |
| `bomb_defuse_time`     | 7             | Segundos para desarmar bomba                                                        |
| `bomb_detonation_time` | 40            | Segundos ate bomba explodir                                                         |


**Presets por Modo:**

Cada modo de jogo é um JSON de configuração carregado pelo servidor no momento de criar a partida. O servidor faz merge do preset com qualquer override do host (Custom Games). Parametros ausentes usam o valor default da tabela de Feature Toggles.

```json
{
  "survival": {
    "label": "Survival",
    "description": "FFA — último vivo vence. Zona encolhe após 60s.",
    "objective": "elimination",
    "team_size": 1,
    "max_players": 4,
    "skills_enabled": false,
    "equipment_enabled": true,
    "friendly_fire": false,
    "respawn_enabled": false,
    "zone_enabled": true,
    "zone_start_delay_s": 60,
    "zone_damage_per_s": 5,
    "hp_regen": true,
    "hit_markers": true,
    "hud_minimal": false,
    "minimap_enabled": false,
    "deployables_enabled": true,
    "round_based": false
  },

  "king_of_the_hill": {
    "label": "King of the Hill",
    "description": "2v2 — controle a zona central. Primeiro a 100 pontos vence.",
    "objective": "area_control",
    "team_size": 2,
    "max_players": 4,
    "skills_enabled": false,
    "equipment_enabled": true,
    "friendly_fire": false,
    "respawn_enabled": true,
    "respawn_time_s": 5,
    "area_control_points_to_win": 100,
    "zone_enabled": false,
    "hp_regen": true,
    "hit_markers": true,
    "hud_minimal": false,
    "minimap_enabled": true,
    "deployables_enabled": true,
    "round_based": false
  },

  "search_and_destroy": {
    "label": "Search & Destroy",
    "description": "5v5 por rounds — atacantes plantam bomba, defensores impedem.",
    "objective": "search_destroy",
    "team_size": 5,
    "max_players": 10,
    "skills_enabled": false,
    "equipment_enabled": true,
    "friendly_fire": true,
    "respawn_enabled": false,
    "round_based": true,
    "rounds_to_win": 7,
    "round_time_s": 90,
    "bomb_plant_time_s": 4,
    "bomb_defuse_time_s": 7,
    "bomb_detonation_time_s": 40,
    "zone_enabled": false,
    "hp_regen": false,
    "hit_markers": true,
    "hud_minimal": false,
    "minimap_enabled": true,
    "deployables_enabled": true,
    "economy_enabled": false
  },

  "deathmatch": {
    "label": "Deathmatch",
    "description": "FFA com respawn ilimitado — primeiro a 15 kills vence.",
    "objective": "kill_limit",
    "team_size": 1,
    "max_players": 4,
    "kill_limit": 15,
    "match_time_limit_s": 300,
    "skills_enabled": false,
    "equipment_enabled": true,
    "friendly_fire": false,
    "respawn_enabled": true,
    "respawn_time_s": 3,
    "zone_enabled": false,
    "hp_regen": true,
    "hit_markers": true,
    "hud_minimal": false,
    "minimap_enabled": false,
    "deployables_enabled": true,
    "round_based": false
  },

  "realistic": {
    "label": "Realistic",
    "description": "Hardcore — sem HUD, sem regen, dano amigo, fadiga.",
    "objective": "elimination",
    "team_size": 2,
    "max_players": 4,
    "skills_enabled": false,
    "equipment_enabled": false,
    "friendly_fire": true,
    "respawn_enabled": false,
    "zone_enabled": true,
    "zone_start_delay_s": 60,
    "zone_damage_per_s": 5,
    "hp_regen": false,
    "hit_markers": false,
    "hud_minimal": true,
    "minimap_enabled": false,
    "deployables_enabled": false,
    "round_based": false,
    "vision_blur_on_hit": true,
    "aggressive_recoil": true,
    "breathing_sounds": true,
    "proximity_voice": false
  },

  "custom": {
    "label": "Custom",
    "description": "Configuração livre pelo host — qualquer combinação de parametros.",
    "objective": "elimination",
    "team_size": 1,
    "max_players": 4,
    "skills_enabled": false,
    "equipment_enabled": true,
    "friendly_fire": false,
    "respawn_enabled": false,
    "zone_enabled": false,
    "hp_regen": true,
    "hit_markers": true,
    "hud_minimal": false,
    "minimap_enabled": false,
    "deployables_enabled": true,
    "round_based": false,
    "_note": "Todos os campos acima podem ser sobrescritos pelo host. O servidor valida limites minimos e maximos de cada parametro."
  }
}
```


## 2. Arquitetura Tecnica

### 2.1 Stack

| Camada                         | Tecnologia                                                                      |
|--------------------------------|---------------------------------------------------------------------------------|
| Frontend (UI/Menus)            | React ou Next.js                                                                |
| Renderizacao do Jogo           | Em aberto (Canvas 2D, PixiJS, ou outra lib 2D)                                  |
| API REST (matchmaking, contas) | Node.js + Fastify                                                               |
| Servidor de Jogo (partidas)    | Node.js (processo separado) + WebSocket                                         |
| Protocolo de Rede              | WebSocket (TCP). Arquitetura modular para futura migracao a WebRTC DataChannels |
| Hosting                        | VPS (DigitalOcean, regiao Sao Paulo)                                            |

### 2.2 Modelo de Rede

┌─────────────┐     HTTP/REST      ┌──────────────────┐
│   Browser   │ ←───────────────→  │  API Fastify     │
│   (Cliente) │                    │  (Matchmaking,   │
│             │     WebSocket      │   Lobby, Auth)   │
│             │ ←───────────────→  ├──────────────────┤
│             │                    │  Game Server     │
│             │                    │  (Logica de      │
└─────────────┘                    │   Partida)       │
                                   └──────────────────┘


**Servidor autoritativo:** O servidor e a unica autoridade sobre o estado do jogo. O cliente envia apenas inputs (teclas pressionadas, posicao do mouse). O servidor valida e propaga o estado.

**Tick rate:** 30 Hz (50ms por tick).

**Client-side prediction:** O cliente aplica inputs de movimento imediatamente e corrige quando recebe atualizacao do servidor. Obrigatório para fluidez com WebSocket TCP.

**Capacidade alvo:** 10 partidas simultaneas no MVP (40 jogadores total).

### 2.3 Fluxo de Dados — Exemplo de Tiro

```
1. Cliente: jogador pressiona LMB
2. Cliente: envia comando {type: "shoot", mouseAngle: 45.2, tick: 1234}
3. Cliente: mostra muzzle flash local (feedback imediato)
4. Servidor: recebe comando, valida (tem municao? cooldown ok?)
5. Servidor: cria projetil no mundo com posicao, direcao, velocidade
6. Servidor: no proximo tick, atualiza posicao do projetil, verifica colisoes
7. Servidor: envia estado atualizado (posicao projetil, municao restante)
8. Todos os clientes: renderizam projetil, atualizam HUD
9. Servidor: projetil colide com jogador → calcula dano, envia evento de hit
10. Cliente do alvo: mostra indicador de dano, screen shake
11. Cliente do atirador: mostra hit marker
```

### 2.4 Resolucao e Renderizacao

| Parametro                       | Valor                        |
|---------------------------------|------------------------------|
| Resolucao base (canvas interno) | 640 x 360 px                 |
| Upscaling                       | Via CSS, mantem aspect ratio |
| Resolucao alvo do display       | 1920 x 1080 (fator 3x)       |
| Estilo visual                   | Pixel art 2D                 |

### 2.5 Diagrama de Processos

┌──────────────────────────────────────────────────────┐
│                    VPS (Sao Paulo)                   │
│                                                      │
│  ┌─────────────┐          ┌────────────────────┐     │
│  │ Fastify API │ ←─REST─→ │   Matchmaking      │     │
│  │ :3000       │          │   Service          │     │
│  └─────────────┘          └────────┬───────────┘     │
│                                    │ spawn           │
│                           ┌────────▼───────────┐     │
│                           │  Game Server #1    │     │
│                           │  :4001 (WS)        │     │
│                           └────────────────────┘     │
│                           ┌────────────────────┐     │
│                           │  Game Server #2    │     │
│                           │  :4002 (WS)        │     │
│                           └────────────────────┘     │
│                           │  ...ate #10        │     │
└──────────────────────────────────────────────────────┘

## 3. Camera e Perspetiva

| Parametro              | Valor                                                      |
|------------------------|------------------------------------------------------------|
| Angulo                 | 90° puro (perpendicular ao chao)                           |
| Tipo                   | Segue o jogador, centrada                                  |
| Deslocamento por mouse | Nao                                                        |
| Zoom                   | Fixo (varia de acordo com o personagem)                    |
| Campo de visao         | Cone de 70° na direcao do mouse, alcance 800u              |
| Oclusao por paredes    | Sim — raycasting contra paredes no cone de visao           |

**Nota:** O cone FOV com raycasting inclui oclusao básica por paredes. O servidor calcula visibilidade e so envia posicoes de jogadores dentro do cone visivel de cada cliente. Os cones FOV são visíveis para todos no jogo.

## 4. Personagens

**Referencia completa:** Ver **PRD_Characters_v2.md** para todos os detalhes de stats, armas, equipamentos e JSONs de configuracao.

### 4.1 Sistema de Sprites (3 Layers)

Cada personagem e composto por 3 camadas renderizadas em sequencia:

Camada 3 (topo):  Cabeca    → roda 360° na direcao do mouse
Camada 2 (meio):  Corpo     → 8 direcoes, animacoes de acao (atirar, recarregar, melee, escudo)
Camada 1 (base):  Pernas    → 8 direcoes, animacoes de movimento (idle, walk, run, crouch)

As 8 direcoes de movimento sao relativas ao facing do personagem:
- Frente, Frente-Esquerda, Esquerda, Tras-Esquerda, Tras, Tras-Direita, Direita, Frente-Direita

O facing (direcao para onde o personagem olha/aponta) e determinado pela posicao do mouse.

### 4.2 Resumo dos Personagens MVP

| Personagem | Arquetipo               | HP Efetivo | Velocidade (walk) | Hitbox          | Arma         | Equipamento                |
|------------|-------------------------|------------|-------------------|-----------------|--------------|----------------------------|
| **Fable**  | Assalto / DPS           | 100        | 220 u/s           | Media (24×24u)  | AK-47        | Granada HE ×4              |
| **Fate**   | Inteligência / Precisão | 130        | 190 u/s           | Media (24×24u)  | Desert Eagle | Camera, Drone, Torre       |
| **Foul**   | Tanque / Supressao      | 160        | 150 u/s           | Grande (32×32u) | Minigun      | Escudo Balistico, Flash ×2 |

**Sistema de hitbox:** Labels com dimensoes implicitas definidas em PRD_Characters_v2.md (secao 2.6). A hitbox reduz para 90% ao agaixar (ex: Media 24×24 → 19×19 em crouch).

### 4.3 Identidades de Combate

**Fable** e o personagem de entrada agressiva. Sem colete, AK-47 com maior DPS sustentado e 4 granadas HE para zoning e eliminacao de cobertura. Precisa de engajar rápido e sair antes que a resposta chegue. Fraqueza critica: 100 HP e hitbox média sem protecao extra. 


  // Corpo (círculo principal)
  // contorno externo escuro
  ctx.beginPath();
  ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fill();

  // corpo
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  const bodyGrad = ctx.createRadialGradient(-r*0.3, -r*0.3, 0, 0, 0, r);
  bodyGrad.addColorStop(0, lighten(a.color, 30));
  bodyGrad.addColorStop(1, a.color);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // borda do corpo
  ctx.strokeStyle = darken(a.color, 30);
  ctx.lineWidth   = 2;
  ctx.stroke();

  // highlight
  ctx.beginPath();
  ctx.arc(-r * 0.28, -r * 0.28, r * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fill();

  ctx.restore();

### 5.2 Armas Brancas (Melee)

Todos os personagens tem acesso à arma melee realizando a troca com input "Q". 
Ao trocar para a melee o player pode atacar com LMB.
O sistema de armas brancas e universal — a arma branca especifica por personagem será definida em iteracao futura (pos-MVP).

**No MVP:** Ao trocar para arma branca LMB executa um ataque melee genérico com os parametros abaixo.

| Propriedade                      | Melee Generico (MVP)              |
|----------------------------------|-----------------------------------|
| Dano                             | 30                                |
| Velocidade de ataque             | 0.4s entre ataques                |
| Alcance                          | ~45 u (frontal)                   |
| Efeito especial                  | Backstab (ver 5.3)                |
| Lock de movimento durante ataque | ~0.25s                            |
| Stagger no alvo                  | 0.3s (nao pode atacar nem correr) |

**Pos-MVP — armas brancas unicas por personagem (a definir):**

| Personagem | Arma branca sugerida | Dano | Notas                      |
|------------|----------------------|------|----------------------------|
| Fable      | Faca                 | 25   | Mais rapida, backstab x2   |
| Fate       | Faca de combate      | 30   | Media, backstab x1.5       |
| Foul       | Porrete / Coronhada  | 40   | Mais lenta, knockback alto |

### 5.3 Backstab

O backstab aplica dano multiplicado quando o atacante ataca pelas costas do alvo. 
Outros efeitos de armas melee também precisam acertar as costas do alvo para sua ativação.

**Calculo:** Baseado na rotacao do modelo do alvo (a direcao para onde esta olhando).

        Frente do alvo (0°)
              \u2191
         _____|_____
        /     |     \
       / N\u00c3O  | N\u00c3O  \
      /  BS   |  BS   \
     |________|________|  ← 90° esquerda / 90° direita
      \       |       /
       \ BACK | BACK /
        \STAB | STAB/
         \____|____/
              \u2193
        Tras do alvo (180°)

Backstab zone: 135° a 225° (arco de 90° centrado nas costas)

Se o atacante estiver dentro da zona de backstab no momento do impacto, o dano e multiplicado por **2x**.

No MVP, backstab aplica-se ao melee generico de todos os personagens (multiplicador 2x sobre dano base do melee).

### 5.4 Troca de Arma

- Tecla: **Q**
- Duracao da animacao de troca: **0.5s**
- Durante a troca, o jogador **nao pode atacar**
- **RMB** sempre executa melee — independentemente da arma equipada. Se a arma de fogo esta ativa, o ataque melee e rapido e volta automaticamente para a arma de fogo
- Nao e possivel cancelar uma recarga em progresso trocando de arma

## 6. Sistema de Combate

### 6.1 Projeteis

As balas sao **objetos fisicos** com posicao e velocidade. Não são hitscan.

| Propriedade | Descricao                                                                                                  |
|-------------|------------------------------------------------------------------------------------------------------------|
| Criacao     | No servidor, quando valida o comando de tiro                                                               |
| Trajetoria  | Linha reta na direcao do mouse (com spread aplicado)                                                       |
| Velocidade  | A definir (suficientemente rapida para parecer "bala" e para ser impossível de se desviar em campo aberto) |
| Colisao     | Testada a cada tick do servidor contra jogadores e paredes                                                 |
| Destruicao  | Ao colidir com jogador, parede, ou ultrapassar o alcance maximo                                            |
| Penetracao  | Apenas Desert Eagle atravessa paredes penetraveis (75% dano)                                               |
| Ricochete   | Algumas habilidades (como escudo refletor do Foul) e armas (pós MVP) possuirão este efeito                 |

**Risco tecnico — Tunneling:** A velocidades altas, projeteis podem "saltar" paredes finas entre ticks. Solucao: usar swept collision (ray cast do ponto anterior ao ponto atual).

### 6.2 Spread e Recoil

O spread e o angulo de desvio aleatorio aplicado a cada tiro. O recoil e o spread **acumulado** por tiros consecutivos.

**Spread base (por estado de movimento):**

| Estado   | AK-47         | Desert Eagle | Minigun       |
|----------|---------------|--------------|---------------|
| Parado   | 2.5°          | 1.0°         | 7.0°          |
| Andando  | 3.5° (+40%)   | 1.6° (+60%)  | 9.1° (+30%)   |
| Correndo | 6.25° (+150%) | 2.5° (+150%) | 17.5° (+150%) |
| Agaixado | 1.25° (×0.5)  | 0.5° (×0.5)  | 3.5° (×0.5)   |

**Recoil (acumulado por tiro sustentado):**

| Parametro               | AK-47 | Desert Eagle | Minigun |
|-------------------------|-------|--------------|---------|
| Recoil por tiro         | +1.8° | +3.0°        | +0.1°   |
| Recoil maximo acumulado | +8°   | +6°          | +2°     |
| Recuperacao             | 5°/s  | 8°/s         | 20°/s   |

Spread total = spread_base × movement_mult × crouch_mult + recoil_acumulado

### 6.3 Dano, Stagger e Colete

**Ordem de absorcao de dano:**
1. Armor absorve primeiro (Fate: 30 armor, Foul: 60 armor)
2. Quando armor = 0, dano vai direto ao HP

**Efeitos ao receber dano:**
- **De arma de fogo:** Leve knockback na direcao do impacto (~10-20 u). Nao interrompe acoes.
- **De arma branca:** Stagger de **0.2s** — alvo nao pode atacar nem correr, mas pode mover-se lentamente.

### 6.4 TTK (Survival) — Referencia

Cenario: todos os tiros acertam, alvo parado, sem spin-up.

| Atacante              | Alvo           | Tiros | Tempo aprox. |
|-----------------------|----------------|-------|--------------|
| Fable (AK, 25 dmg)    | Fable (100 HP) | 4     | 0.3s         |
| Fable (AK, 25 dmg)    | Fate (130 HP)  | 6     | 0.5s         |
| Fable (AK, 25 dmg)    | Foul (160 HP)  | 7     | 0.6s         |
| Fate (DE, 50 dmg)     | Fable (100 HP) | 2     | 0.4s         |
| Fate (DE, 50 dmg)     | Fate (130 HP)  | 3     | 1.2s         |
| Fate (DE, 50 dmg)     | Foul (160 HP)  | 4     | 2.0s         |
| Foul (Minigun, 8 dmg) | Fable (100 HP) | 13    | 0.52s*       |
| Foul (Minigun, 8 dmg) | Fate (130 HP)  | 17    | 0.68s*       |
| Foul (Minigun, 8 dmg) | Foul (160 HP)  | 20    | 0.80s*       |

*\* Minigun: tempo real maior por spin-up 0.8s e spread alto (muitos tiros erram a distancia).*

### 6.5 Morte

Quando HP chega a 0:
1. Jogador morre, sprite muda para cadaver
2. Cadaver permanece visivel por 5 segundos
3. Jogador entra em **modo espectador**
4. Nao ha respawn no modo Survival

## 7. Mapa

### 7.1 Especificacoes

| Parametro                             | Valor                                           |
|---------------------------------------|-------------------------------------------------|
| Dimensões da imagem                   | 1024 x 1024 px                                  |
| Dimensões do mundo (unidades de jogo) | 1024 x 1024 u (1 pixel = 1 unidade)             |
| Número de mapas (MVP)                 | 1                                               |
| Estilo                                | Mistura de areas abertas e corredores           |
| Spawn points                          | 4, distribuidos equidistantes nos cantos/bordas |

### 7.2 Formato do Mapa

Cada mapa e composto por dois elementos:

1. **Imagem do mapa** — Ficheiro de imagem 1024x1024 px (chao, paredes, decoracoes)
2. **Ficheiro de coordenadas (JSON)** — Coordenadas e dimensoes de todos os elementos de colisao e interacao

```json
{
  "name": "Map_01",
  "version": 2,
  "size": { "width": 1024, "height": 1024 },
  "config": {
    "vision_distance": 400,
    "vision_fov": 100,
    "ambient_sound": "industrial"
  },
  "walls": [
    { "x": 100, "y": 200, "width": 300, "height": 20 },
    { "x": 500, "y": 100, "width": 20, "height": 400 }
  ],
  "windows": [
    { "x": 500, "y": 300, "width": 40, "height": 20 }
  ],
  "lowObstacles": [
    { "x": 300, "y": 400, "width": 40, "height": 40 }
  ],
  "penetrableWalls": [
    { "x": 200, "y": 300, "width": 10, "height": 80, "material": "thin_plaster" }
  ],
  "spawnPoints": [
    { "x": 100, "y": 100, "team": "A" },
    { "x": 924, "y": 100, "team": "A" },
    { "x": 100, "y": 924, "team": "B" },
    { "x": 924, "y": 924, "team": "B" }
  ],
  "objectiveZones": [
    { "id": "bombA", "type": "bomb_site", "label": "A", "x": 200, "y": 200, "width": 120, "height": 120 },
    { "id": "bombB", "type": "bomb_site", "label": "B", "x": 700, "y": 700, "width": 120, "height": 120 },
    { "id": "koth1", "type": "control_zone", "label": "Centro", "x": 440, "y": 440, "width": 144, "height": 144 },
    { "id": "extract1", "type": "extraction_point", "label": "Extraccao", "x": 900, "y": 100, "width": 80, "height": 80 }
  ]
}
```

**Nota:** `penetrableWalls` e um novo campo para paredes que a Desert Eagle e outras armas futuras pode atravessar. Marcadas visualmente com textura distinta no mapa.

### 7.3 Elementos do Mapa

| Elemento            | Bloqueia Movimento | Bloqueia Visao  | Bloqueia Projeteis                      | Representacao Visual                 |
|---------------------|--------------------|-----------------|-----------------------------------------|--------------------------------------|
| Parede              | Sim                | Sim             | Sim                                     | Sprite opaco                         |
| Parede penetravel   | Sim                | Sim             | **Parcialmente** (Desert Eagle 60% dmg) | Sprite com textura distinta          |
| Janela              | Sim                | Não             | Sim                                     | Sprite com vidro                     |
| **Obstaculo baixo** | **Sim**            | **Condicional** | **Não**                                 | Topo diferente: caixas, muros baixos |
| Chao                | Não                | Não             | Não                                     | Tile de chao                         |
| Spawn point         | Não                | Não             | Não                                     | Marcador visual, desaparece          |

**Obstaculos baixos:** De pé = não obstáculo, vê por cima (FOV passa). Agaixado = obstáculo, bloqueia FOV como uma parede normal.

## 8. Movimento e Stamina

### 8.1 Movimento

| Parametro                   | Fable   | Fate    | Foul    |
|-----------------------------|---------|---------|---------|
| Velocidade base (andar)     | 220 u/s | 190 u/s | 175 u/s |
| Velocidade corrida (Shift)  | 374 u/s | 323 u/s | 291 u/s |
| Velocidade agaixado (Ctrl)  | 132 u/s | 114 u/s | 110 u/s |
| Direcão                     | 360°    | 360°    | 360°    |
| Colisão entre jogadores     | Sim     | Sim     | Sim     |
| 

### 8.2 Stamina

| Parametro                     | Fable | Fate  | Foul |
|-------------------------------|-------|-------|------|
| Stamina maxima                | 100   | 110   | 90   |
| Consumo ao correr             | 20/s  | 20/s  | 20/s |
| Tempo de corrida maximo       | 5.0s  | 5.5s  | 4.5s |
| Delay para regen (apos parar) | 1.0s  | 1.0s  | 1.0s |
| Velocidade de regen           | 15/s  | 15/s  | 15/s |
| Tempo de regen completa       | 6.7s  | 10.0s | 8.0s |

Quando a stamina chega a 0, o jogador volta automaticamente a velocidade base. Nao pode voltar a correr ate a stamina regenerar acima de 10. Permitindo que ele corra por meio segundo.

### 8.3 Agachar (Crouch)

Tecla: **Ctrl** (toggle)

| Parâmetro     | Valor                             |
|---------------|-----------------------------------|
| Velocidade    | 50% da velocidade base            |
| Spread        | 0.5x multiplicador (mais preciso) |
| Hitbox        | Reduzida para 90% do total        |
| Visão (FOV)   | Ampliada para 90°                 |
| Som de passos | ~50% do volume ao andar           |
| Transição     | 0.15s para agaixar/levantar       |

**Interacao com obstáculos baixos:**
- **De pé:** Raios do cone passam por cima — ve o que esta do outro lado
- **Agaixado:** Obstáculo bloqueia a visao completamente
- Movimento bloqueado sempre (de pe ou agaixado)

```
DE PE:                          AGAIXADO:
  \u2605 ──────→ \u2593\u2593\u2593 ──────→ \u25cb      \u2605 ──────→ \u2593\u2593\u2593 \u2715
  jogador   caixa   ve o       jogador   caixa  NAO ve
            (baixa) inimigo              (baixa) nada
```

### 8.4 Som de Passos

| Acao   | Alcance (Fable) | Alcance (Fate) | Alcance (Foul) | Notas                           |
|--------|-----------------|----------------|----------------|---------------------------------|
| Parado | 0               | 0              | 0              | Silencioso                      |
| Andar  | ~200 u          | ~220 u         | ~260 u         | Colete pesado = mais barulhento |
| Correr | ~500 u          | ~550 u         | ~650 u         | Revela posicao claramente       |


## 9. Sistema de Visao e Audio

### 9.1 Visao (MVP — Cone FOV com Raycasting)

```
                          alcance maximo
                         \u2571     (400 u)
                        \u2571          │
                       \u2571  ZONA     │
              \u00b7\u00b7\u00b7\u00b7\u00b7\u00b7\u00b7\u2571  VISIVEL    │
          \u00b7\u00b7\u00b7       \u2571              │
      \u2605 ─────────────────────────→ │  ← direcao do mouse
          \u00b7\u00b7\u00b7       \u2572              │
              \u00b7\u00b7\u00b7\u00b7\u00b7\u00b7\u00b7\u2572             │
                       \u2572  ~100°   │
                        \u2572  total  │
                         \u2572        │

  \u2605 = jogador (centro do cone)
  Tudo fora do cone = escuridao (fog of war)
```

| Parâmetro              | Valor default                 | Notas                                                                        |
|------------------------|-------------------------------|------------------------------------------------------------------------------|
| Alcance máximo         | 800 u                         | Configurável por mapa e por arma                                             |
| Abertura do cone (FOV) | 60°                           | Varia por personagem, estado e arma                                          |
| Fora do cone           | Escuridão total (fog of war)  | Renderiza apenas cones FOV com Raycasting de outros jogadores e deployables  |
| Raycasting             | ~180-200 raios por frame      | Para bordas suaves                                                           |
| Server-side            | Servidor calcula visibilidade | So envia posições de jogadores visíveis                                      |

### 9.2 Visao (Futuro — Melhorias)

- **Visao periferica**: zona extra de ~30° de cada lado com visibilidade reduzida (~50% opacidade)
- **Iluminacao dinamica**: fontes de luz no mapa independentes do cone do jogador
- **Indicadores sonoros visuais**: sons fora do cone criam indicador direcional sutil no HUD
- **FOV dinamico fluido**: transicao suave entre estados em vez de override instantaneo

### 9.3 Audio Direcional

O som é a **ferramenta primária** para localizar inimigos fora da visão.

#### 9.3.1 Sons de Movimento

| Fonte                 | Alcance                                    | Notas                                                            |
|-----------------------|--------------------------------------------|------------------------------------------------------------------|
| Passos (andar)        |  200-260 u (varia por personagem e colete) | Foul (colete pesado) ouve-se a ~260u, Fable (sem colete) a ~200u |
| Passos (correr)       |  500-650 u                                 | Foul revela posição mesmo a grande distância                     |
| Passos por superfície | Varia                                      | Sons distintos: concreto (seco), metal (metálico), grama (suave) |
| Aterrar               |  250 u                                     | Mais alto para Foul                                              |

#### 9.3.2 Sons de Combate — Armas de Fogo

| Fonte                  | Alcance | Notas                                                         |
|------------------------|---------|---------------------------------------------------------------|
| Tiro (AK-47)           | 900 u   | Rajada automática, som mecânico pesado                        |
| Tiro (Desert Eagle)    | 850 u   | Estalo seco e potente, semi-auto                              |
| Tiro (Minigun)         | 950 u   | Barulho constante e inconfundível — revela Foul completamente |
| Spin-up da Minigun     | 400 u   | Som de rotação mecânica antes de disparar — alerta inimigos   |
| Recarga                | 200 u   | Som mecânico                                                  |
| Troca de arma          | 150 u   | Som mecânico curto                                            |
| Dry fire               | 50 u    | Click de pente vazio                                          |
| Bala whizz (near miss) | Local   | Assobio quando bala passa perto (~30u)                        |
| Impacto em parede      | 300 u   | Varia por material                                            |

#### 9.3.3 Sons de Combate — Melee

| Fonte               | Alcance    | Notas                         |
|---------------------|------------|-------------------------------|
| Swing melee         | 100-120 u  | Swish no ar                   |
| Impacto melee (hit) | 150 u      | Som de corte/impacto no corpo |
| Backstab            | 150 u      | Som distinto e mais violento  |

#### 9.3.4 Sons de Equipamento

| Fonte                     | Alcance | Notas                                   |
|---------------------------|---------|-----------------------------------------|
| Puxar pino (granada HE)   |  100 u  | Click metálico — alerta proximidade     |
| Explosão (granada HE)     |  900 u  | Boom grave + eco                        |
| Impacto escudo balistico  |  400 u  | Metálico, indica que Foul bloqueou tiro |
| Ricochete do escudo       |  300 u  | Som distinto de bala desviada           |
| Flashbang detonacao       |  800 u  | Estalo + ear ringing para afetados      |
| Drone (Fate) em movimento |  150 u  | Motor silencioso                        |
| Minigun spin-up           |  400 u  | Pré-aviso acustico de Foul a preparar   |

#### 9.3.5 Sons de Kill e Morte

| Fonte                     | Quem ouve       | Alcance     |
|---------------------------|-----------------|-------------|
| Morte (vítima)            | Todos próximos  |  400 u      |
| Kill confirmation         | Apenas o killer | Local (HUD) |
| Multi-kill (2 kills < 3s) | Apenas o killer | Local (HUD) |

#### 9.3.6 Sons Ambiente e UI

| Fonte            | Tipo          | Notas                              |
|------------------|---------------|------------------------------------|
| Ambiente do mapa | Loop contínuo | Som de fundo (vento, maquinaria)   |
| Zona a encolher  | Posicional    | Humming elétrico na borda da zona  |
| Low HP           | Local (HUD)   | Heartbeat que acelera com HP baixo |

#### 9.3.7 Implementacao Técnica

- Web Audio API (AudioContext com PannerNode para posicionamento 3D)
- Atenuacao por distância (modelo inverse distance)
- Panning estereo baseado no ângulo relativo ao jogador
- Sons posicionais reproduzidos mesmo **fora do cone de visão**
- Sons através de paredes ficam abafados (filtro lowpass, 10% reducao de volume)
- Janelas nao abafam som
- Sistema de prioridade: sons de combate > sons de movimento > sons ambiente

## 10. Interface (HUD)

O HUD é minimalista por design: nenhum elemento fixo cobre o centro da tela. Informações críticas (vida, stamina) seguem o personagem no mundo; informações de contexto (munição, placar, zona) ficam ancoradas nos cantos. O resultado é um HUD que o jogador sente, não lê.

### 10.1 Layout Geral

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ZONA: 45s                          ┌─────────────┐ │
│                                     │   3 / 4     │ │
│                                     └─────────────┘ │
│                                                     │
│                                                     │
│                  \u2573  ← hit marker                    │
│                  (centro — nunca bloqueado)         │
│                                                     │
│   \u25c4 ← indicador de dano direcional                  │
│         (aresta da tela, aponta o atacante)         │
│                                                     │
│        [personagem aqui]                            │
│      \u2550\u2550 arco HP (vermelho, r\u224830u) \u2550\u2550                │
│    \u2550\u2550\u2550\u2550 arco Stamina (azul, r\u224840u) \u2550\u2550\u2550\u2550             │
│                                                     │
│                              ┌──────────────────┐   │
│                              │     12 / 12      │   │
│                              │      [3]         │   │
│                              └──────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 10.2 Elementos do HUD

#### Barra de HP — ArcBar (segue o personagem no mundo)

| Parâmetro            | Valor                                                                                                                                      |
|----------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| Formato              | Arco de 90° centrado nas costas do personagem                                                                                              |
| Raio                 | ~30 unidades de jogo                                                                                                                       |
| Cor                  | Vermelho                                                                                                                                   |
| Comportamento        | O arco encolhe das duas extremidades em direção ao centro conforme o HP diminui. HP cheio = arco completo de 90°. HP zero = arco invisível |
| Visibilidade         | Apenas para o jogador local. Não é renderizado para outros jogadores                                                                       |
| Posição              | Atrás do personagem, no mundo (não fixo na tela). Acompanha rotação do sprite                                                              |
| Sinal de atualização | `SignalsManager.player_hp_changed`                                                                                                         |
| Implementação        | Polygon2D ou shader de arco customizado                                                                                                    |

#### Barra de Stamina — ArcBar (segue o personagem no mundo)

| Parâmetro            | Valor                                                                                                 |
|----------------------|-------------------------------------------------------------------------------------------------------|
| Formato              | Arco de 90°, concêntrico com o arco de HP                                                             |
| Raio                 | ~40 unidades de jogo (mais afastado que o HP)                                                         |
| Cor                  | Azul                                                                                                  |
| Comportamento        | Mesmo princípio do HP. Encolhe das extremidades para o centro conforme stamina é consumida            |
| Visibilidade         | Só aparece quando stamina < 100% ou quando o jogador está correndo. Some gradualmente ao atingir 100% |
}
| Sinal de atualização | `SignalsManager.player_stamina_changed`                                                               |
| Implementação        | Polygon2D ou shader de arco customizado                                                               |

**Diagrama dos arcos (vista de cima):**

```
         frente do personagem
                 \u2191
                 \u2605
         \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550   ← stamina (azul, r\u224840u)
           \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550   ← HP (vermelho, r\u224830u)
                 \u2193
         costas do personagem
         (arcos centrados aqui)
```

#### Círculo de Munição — AmmoCircle (fixo, canto inferior direito)

| Parâmetro            | Valor                                                                  |
|----------------------|------------------------------------------------------------------------|
| Formato              | Círculo com fundo semitransparente (cinza escuro)                      |
| Texto principal      | `12 / 12` (balas no pente atual)                                       |
| Texto secundário     | `[3]` (pentes restantes, abaixo do texto principal)                    |
| Posição              | Canto inferior direito, fixo na tela                                   |
| Implementação        | `ColorRect` com `StyleBoxFlat` e `corner_radius` para formato circular |
| Sinal de atualização | `SignalsManager.player_ammo_changed`                                   |

**Estados de cor do texto principal:**

| Condição           | Balas no pente       | Cor                  |
|--------------------|----------------------|----------------------|
| Normal             | > 50% da capacidade  | Cinza claro / branco |
| Baixo              | 25\u201350% da capacidade | Amarelo              |
| Crítico            | < 25% da capacidade  | Vermelho             |
| Vazio (sem pentes) | 0 / 0                | Vermelho piscando    |

**Exemplo visual:**

```
      ┌───────────────┐
      │               │
      │   12  /  12   │  ← cinza (normal)
      │     [3]       │  ← pentes restantes
      │               │
      └───────────────┘

      ┌───────────────┐
      │               │
      │    4  /  12   │  ← vermelho (crítico)
      │     [1]       │
      │               │
      └───────────────┘
```

#### Placar de Jogadores Vivos (fixo, canto superior direito)

| Parâmetro     | Valor                                                        |
|---------------|--------------------------------------------------------------|
| Formato       | Caixa retangular com bordas arredondadas                     |
| Conteúdo      | `3 / 4` (vivos / total)                                      |
| Cor padrão    | Branco                                                       |
| Cor de alerta | Vermelho — quando restar apenas 1 jogador vivo               |
| Atualização   | Tempo real a cada morte. Sinal: `SignalsManager.player_died` |
| Posição       | Canto superior direito, fixo na tela                         |

#### Timer da Zona (fixo, canto superior esquerdo)

| Parâmetro            | Valor                                                                                                 |
|----------------------|-------------------------------------------------------------------------------------------------------|
| Formato              | Texto simples                                                                                         |
| Conteúdo             | `ZONA: 45s` (contagem regressiva em segundos inteiros)                                                |
| Comportamento        | Conta regressivamente até 0. Quando chega a 0, a zona encolhe e o timer reinicia para a próxima fase  |
| Visibilidade         | Apenas quando `zone_enabled: true`. Oculto nos modos sem zona                                         |
| Posição              | Canto superior esquerdo, fixo na tela                                                                 |
| Sinal de atualização | `SignalsManager.zone_timer_changed`                                                                   |

#### Hit Marker (centro da tela, sobrepõe tudo)

| Parâmetro      | Valor                                                         |
|----------------|---------------------------------------------------------------|
| Formato        | Cruz `\u2573` pequena no centro exato da tela                      |
| Quando aparece | Ao acertar um inimigo com qualquer ataque                     |
| Duração        | ~0.2s, fade out rápido                                        |
| Cor            | Branco (padrão) / Vermelho (kill confirmado)                  |
| Posição        | Centro absoluto da tela. Nunca bloqueado por outros elementos |

#### Indicador de Dano Direcional (bordas da tela, sobrepõe tudo)

| Parâmetro            | Valor                                                                                                          |
|----------------------|----------------------------------------------------------------------------------------------------------------|
| Formato              | Seta ou arco semitransparente na borda da tela                                                                 |
| Comportamento        | Aparece na borda correspondente à direção do atacante. Calculado pelo ângulo entre o jogador e a fonte do dano |
| Duração              | Fade out em ~1s                                                                                                |
| Cor                  | Vermelho                                                                                                       |
| Posição              | Borda da tela (topo, baixo, esquerda, direita ou diagonal)                                                     |
| Implementação        | Calcular ângulo `attacker_pos - player_pos`, desenhar seta na borda correspondente                             |
| Sinal de atualização | `SignalsManager.player_damaged` (inclui posição do atacante)                                                   |

#### Números de Dano Flutuantes (no mundo, acima de tudo)

| Parâmetro                 | Valor                                                 |
|---------------------------|-------------------------------------------------------|
| Formato                   | Número que flutua para cima sobre o alvo atingido     |
| Conteúdo                  | Valor do dano causado                                 |
| Cor padrão                | Branco                                                |
| Cor de backstab / crítico | Amarelo                                               |
| Animação                  | Sobe ~20u, depois fade out em ~0.6s                   |
| Posição                   | No mundo, acima do sprite do alvo. Nunca fixo na tela |
| Z-index                   | Acima de todos os outros elementos de HUD             |

### 10.3 Hierarquia Visual (Z-index)

A hierarquia define qual elemento é renderizado por cima quando há sobreposição:

```
Nível 4 — EMERG\u00caNCIA (sempre por cima de tudo)
  ├── Hit marker
  └── Indicador de dano direcional

Nível 3 — N\u00daMEROS DE DANO
  └── Números flutuantes sobre inimigos

Nível 2 — HUD FIXO (ancorado na tela)
  ├── Timer da zona (superior esquerdo)
  ├── Placar de vivos (superior direito)
  └── Círculo de munição (inferior direito)

Nível 1 — BARRAS DO JOGADOR (no mundo, seguem o personagem)
  ├── Arco de HP (r\u224830u, vermelho)
  └── Arco de Stamina (r\u224840u, azul) — só visível quando necessário

Nível 0 — MUNDO
  └── Sprites, mapa, projeteis, fog of war
```

### 10.4 Notas de Implementação

- **AmmoCircle:** Implementar como `ColorRect` com `StyleBoxFlat` usando `corner_radius` igual à metade da largura para criar formato circular. Atualizar cor do texto via código ao receber sinal `player_ammo_changed`.
- **ArcBar (HP e Stamina):** Exigem desenho customizado via `Polygon2D` ou shader. O arco é gerado por pontos distribuídos no semicírculo traseiro do personagem; o número de pontos visíveis escala com o valor atual (HP/Stamina). Seguem a posição e rotação do nó do personagem no mundo.
- **Indicador de dano:** Calcular `angle = atan2(attacker.y - player.y, attacker.x - player.x)`, mapear para a borda correspondente da viewport, desenhar seta apontando para dentro. Múltiplos indicadores simultâneos são permitidos (um por fonte de dano recente).
- **Todos os sinais:** Usar o `SignalsManager` global para desacoplar lógica de jogo da UI. Nenhum elemento de HUD deve ler estado diretamente do servidor — tudo via sinais.
- **Modo Spectator:** Os arcos de HP e Stamina exibem os valores do jogador observado, não do espectador. O AmmoCircle também reflete o jogador observado.
- **Modo Realistic (`hud_minimal: true`):** AmmoCircle, placar e timer da zona são ocultados. Apenas hit marker e indicador de dano permanecem ativos.

### 10.5 Minimapa (Pós-MVP)

Minimapa no canto superior direito. **Feature toggle — `minimap_enabled`. Desativado por padrão no Survival e Realistic.**

| Elemento                          | Representação                   | Condição                                                   |
|-----------------------------------|---------------------------------|------------------------------------------------------------|
| Aliados                           | Triângulo azul (aponta direção) | Sempre visível em modos de equipa                          |
| Inimigos visíveis                 | Ponto vermelho                  | Apenas enquanto no cone FOV de qualquer aliado             |
| \u00daltima posição conhecida          | `?` amarelo                     | Desaparece após `minimap_last_known_duration` (default 5s) |
| Gadgets aliados (câmeras, torres) | Ponto verde                     | Visível enquanto deployable ativo                          |
| Gadget ativado                    | Flash/ping no minimapa          | Quando câmera ou sensor deteta inimigo                     |
| Zonas de objetivo                 | Retângulo contornado            | Cor indica estado: neutro / aliado / inimigo               |

## 11. Modo Espectador

| Parâmetro          | Valor                                                 |
|--------------------|-------------------------------------------------------|
| Ativação           | Automática apos morte                                 |
| Visão              | Segue o jogador selecionado (mesma camera)            |
| Navegação          | Teclas 1-4 para ciclar entre jogadores vivos          |
| Informação visível | A mesma que o jogador vivo vê                         |
| HUD do espectador  | Nome do jogador observado, HP, indicador "SPECTATING" |
| Comunicacao        | Nenhuma in-game (nao pode falar para evitar ghosting) |

## 12. Controles

| Tecla         | Ação                                          |
|---------------|-----------------------------------------------|
| W / A / S / D | Mover                                         |
| Mouse         | Direção da mira                               |
| LMB           | Disparar arma de fogo/ Atacar com arma branca |
| RMB           | Ataque corpo a corpo rápido                   |
| Shift         | Correr (consome stamina)                      |
| Ctrl          | Agaixar / levantar (toggle)                   |
| R             | Recarregar                                    |
| Q             | Trocar arma (fogo \u2194 branca)                   |
| 1             | Equipamento Slot 1                            |
| 2             | Equipamento Slot 2                            |
| 3             | Equipamento Slot 3                            |
| E             | Interagir / sair de deployable                |
| Tab           | Ciclar espectador (apenas quando morto)       |
| Esc           | Menu de pausa (janela pop-up)                 |

**Notas:**
- O jogador comeca com a arma de fogo equipada
- RMB sempre executa melee independentemente da arma equipada
- Se a arma de fogo esta equipada, RMB faz um ataque rapido com melee e volta automaticamente para a fogo
- Teclas 1-3 so tem efeito se o modo de jogo tiver `equipment_enabled: true`

---

## 13. Fluxo de Jogo (MVP)

### 13.1 Diagrama Completo

```
                    ┌───────────────┐
                    │  Menu         │
                    │  Principal    │
                    │               │
                    │  [Jogar]      │
                    │  [Opções]     │
                    │  [Sair]       │
                    └──────┬────────┘
                           │ [Jogar]
                           │
                    ┌──────▼────────────────────────────────────┐
                    │                  LOBBY                    │
                    │                                           │
                    │  ┌─────────────────┐  ┌─────────────────┐ │
                    │  │  MODO DE JOGO   │  │   PERSONAGEM    │ │
                    │  │                 │  │                 │ │
                    │  │ \u25c9 Survival     │  │ \u25c9 Fable         │ │
                    │  │ \u25cb KotH (futuro) │  │ \u25cb Fate          │ │
                    │  │ \u25cb S&D (futuro)  │  │ \u25cb Foul          │ │
                    │  │ \u25cb Custom        │  │                 │ │
                    │  │                 │  │ [preview stats] │ │
                    │  └─────────────────┘  └─────────────────┘ │
                    │                                           │
                    │  ┌──────────────────────────────────────┐ │
                    │  │  SALA                                │ │
                    │  │  Código: XKQT7   [Copiar link]       │ │
                    │  │                                      │ │
                    │  │  Jogador 1 (host) — Fable     Pronto │ │
                    │  │  Jogador 2        — Foul      Pronto │ │
                    │  │  Jogador 3        — Fate      ...    │ │
                    │  │  Slot 4           — vazio            │ │
                    │  └──────────────────────────────────────┘ │
                    │                                           │
                    │        [Marcar Pronto]   [Iniciar]        │
                     └─────────────────────────────────────────┘

> ⚠️ *60 linhas não recuperadas do transcript (aprox. linhas 1261–1320)*


**Criar ou entrar numa sala:**
- [Criar sala]: gera código único de 5 caracteres (ex: `XKQT7`). Host define se é pública ou privada.
- [Entrar por código]: campo de texto para digitar o código da sala.
- [Salas públicas]: lista de salas abertas com vagas disponíveis.

**Dentro do lobby — o que cada jogador faz:**

| Ação                    | Quem pode        | Descrição                                                                               |
|-------------------------|------------------|-----------------------------------------------------------------------------------------|
| Selecionar modo de jogo | Apenas o host    | Painel à esquerda: Survival (ativo), KotH / S&D / Custom (futuros, bloqueados no MVP)   |
| Selecionar personagem   | Qualquer jogador | Painel à direita: Fable / Fate / Foul com preview de stats, arma, equipamentos e hitbox |
| Marcar "Pronto"         | Qualquer jogador | Botão individual. Fica verde com (V) quando pronto                                      |
| Iniciar partida         | Apenas o host    | Botão ativo somente quando todos os jogadores estão prontos e há \u2265 2 jogadores          |
| Trocar de personagem    | Qualquer jogador | Clicar noutro personagem cancela o estado "pronto"                                      |

**Regras do lobby:**
- Mínimo de **2 jogadores** para iniciar.
- Máximo de **4 jogadores** (MVP). Slots extras ficam visíveis como "vazio".
- Se um jogador sair após todos estarem prontos, o estado "pronto" é resetado para todos.
- Personagens repetidos são permitidos (dois jogadores podem ser Fable ao mesmo tempo).
- O host pode expulsar jogadores da sala.

### 13.3 Tela de Fim de Jogo

Exibe:
- Nome, personagem e destaque visual do vencedor
- Estatísticas de cada jogador: kills, dano causado, dano recebido, precisão (%), tempo de sobrevivência
- Botão "Jogar Novamente" — volta ao Lobby com os mesmos jogadores e configurações
- Botão "Menu Principal" — encerra a sessão de grupo

## 14. Efeitos Visuais (VFX)

| Efeito                  | Descrição                                 | Duração                |
|-------------------------|-------------------------------------------|------------------------|
| Muzzle flash            | Sprite animado na ponta da arma           | ~0.1s (2-3 frames)     |
| Projétil                | Linha/sprite que viaja na direcao do tiro | Ate colidir            |
| Impacto em parede       | Sprite de faiscas/po                      | ~0.3s                  |
| Sangue (hit)            | 3-5 particulas na direcao do impacto      | ~0.5s                  |
| Screen shake            | Camera treme ao acertar tiro              | ~0.1s, amplitude 2-3px |
| Dano recebido           | Flash vermelho rapido na borda do ecra    | ~0.3s                  |
| Explosao (Granada HE)   | Circulo de onda + particulas              | ~0.5s                  |
| Escudo balistico (Foul) | Overlay semi-transparente frontal         | Enquanto ativo         |
| Ricochete (escudo Foul) | Linha de bala desviada + faiscas          | ~0.2s                  |
| Flash (Foul)            | Tela branca com fade out                  | ~2.5s                  |
| Flashbang (futuro)      | Tela branca gradual                       | ~2s                    |
| Zona segura             | Borda vermelha semi-transparente, pulsa   | Continuo               |
| Cadaver                 | Sprite de morte, fade out apos 5s         | 5s                     |

## 15. Requisitos Nao-Funcionais

| Requisito                         | Target                                                          |
|-----------------------------------|-----------------------------------------------------------------|
| FPS no cliente                    | 60 FPS estavel em hardware medio                                |
| Latencia de rede                  | < 50ms (regiao Sao Paulo)                                       |
| Tick rate do servidor             | 20 Hz (50ms/tick)                                               |
| Tempo de carregamento             | < 3s para entrar na partida                                     |
| Tamanho do cliente (assets)       | < 10 MB total                                                   |
| Browsers suportados               | Chrome, Firefox, Edge (ultimas 2 versoes)                       |
| Partidas simultaneas por servidor | 10                                                              |
| Uptime do servidor                | 99% (para MVP/testes)                                           |
| Desconexao de jogador             | Personagem desaparece apos 5s. Partida continua.                |
| Anti-cheat basico                 | Servidor valida todos os inputs (velocidade, cadencia, municao) |

---

## 16. Backlog MVP — Fases de Desenvolvimento

### Fase 1: Fundacao (6-8 semanas)

**Objetivo:** Um jogador a mover-se num mapa vazio, sincronizado entre 2 clientes.

| #    | Tarefa                   | Descricao                                                                                             |
|------|--------------------------|-------------------------------------------------------------------------------------------------------|
| 1.1  | Setup do projeto         | Monorepo: /client (React), /server (Fastify + Game Server). Config de build, linting, dev environment |
| 1.2  | Renderizacao basica      | Canvas 2D ou PixiJS: renderizar um retangulo (placeholder do jogador) num tile map simples            |
| 1.3  | Input handling           | Capturar WASD + mouse position no cliente, enviar via WebSocket                                       |
| 1.4  | Game loop do servidor    | Loop a 20Hz: receber inputs, atualizar posicoes, enviar estado                                        |
| 1.5  | Movimento com prediction | Cliente: aplicar input imediatamente. Servidor: validar e enviar correcoes. Reconciliacao no cliente  |
| 1.6  | Colisao com mapa         | Paredes bloqueiam movimento. Colisao AABB simples                                                     |
| 1.7  | Colisao entre jogadores  | Jogadores nao se atravessam. Hitbox por label: Media=24×24, Grande=32×32                              |
| 1.8  | Lobby basico             | Tela simples: criar sala, entrar por codigo, ver jogadores conectados                                 |
| 1.9  | Spawn system             | 4 spawn points, atribuicao aleatoria                                                                  |
| 1.10 | Selecao de personagem    | Lobby: escolher Fable, Fate ou Foul, com preview de stats e hitbox label                              |

**Criterio de conclusao:** 4 retangulos a moverem-se num mapa com paredes, sincronizados via WebSocket, com entrada via lobby e selecao de personagem.

### Fase 2: Combate (6-8 semanas)

**Objetivo:** Jogadores podem matar-se mutuamente com armas de fogo e melee.

| #    | Tarefa                | Descricao                                                                                           |
|------|-----------------------|-----------------------------------------------------------------------------------------------------|
| 2.1  | Sistema de projeteis  | Servidor cria, move e verifica colisao de projeteis. Swept collision para evitar tunneling          |
| 2.2  | AK-47 (Fable)         | Automatica 600 RPM, 30/pente, 2 pentes spare, recarga 2.5s, spread 2.5° base                        |
| 2.3  | Desert Eagle (Fate)   | Semi-auto 150 RPM, 7/pente, 1 pente spare, recarga 2.0s, spread 1.0°, wall pen 60%                  |
| 2.4  | Minigun (Foul)        | Auto 1500 RPM, spin-up 0.8s, 150/pente, 1 pente spare, recarga 4.5s, spread 7.0°                    |
| 2.5  | Paredes penetraveis   | Dano da Desert Eagle atravessa paredes marcadas com 60% dano. Swept collision com flag `penetrable` |
| 2.6  | Sistema de melee      | Area de dano frontal, lock de movimento durante ataque, detecao de backstab por angulo              |
| 2.7  | Melee generico (MVP)  | 30 dmg, alcance 45u, backstab 2x, stagger 0.3s                                                      |
| 2.8  | Troca de arma         | Tecla Q, animacao 0.5s, bloqueio de ataque durante troca                                            |
| 2.9  | Sistema de HP e Armor | HP base 100 para todos. Armor: Fate +30, Foul +60. Armor absorve antes de HP                        |
| 2.10 | Sistema de morte      | HP=0 → cadaver → espectador                                                                         |
| 2.11 | Stamina e corrida     | Shift para correr, consumo 20/s, regen diferente por personagem (ver secao 8.2)                     |
| 2.12 | Knockback e stagger   | Knockback leve por tiro (~10-20u), stagger 0.3s por melee                                           |
| 2.13 | Recarga tatica        | Recarregar com balas no pente descarta as restantes                                                 |

**Criterio de conclusao:** 3-4 jogadores com Fable/Fate/Foul podem combater com as 3 armas e melee. Armor funciona. Jogadores morrem e ficam fora do jogo. Ultimo vivo ganha.

### Fase 3: Game Loop Completo (4-6 semanas)

**Objetivo:** Uma partida jogavel do inicio ao fim.

| #   | Tarefa              | Descricao                                                                                      |
|-----|---------------------|------------------------------------------------------------------------------------------------|
| 3.1 | Zona segura         | Circulo que encolhe a partir de 60s. Dano fora da zona. HUD com timer                          |
| 3.2 | Modo espectador     | Apos morte: ciclar entre jogadores vivos (teclas Tab)                                          |
| 3.3 | Tela de fim de jogo | Vencedor, estatisticas, botoes replay/menu                                                     |
| 3.4 | Visao cone FOV      | Cone de ~100° com raycasting contra paredes. Fog of war fora do cone. Server-side culling      |
| 3.5 | Map design          | Mapa 1024x1024 com paredes, obstaculos baixos, paredes penetraveis, areas abertas e corredores |
| 3.6 | Countdown de inicio | 3, 2, 1, GO                                                                                    |
| 3.7 | Desconexao handling | Jogador desconecta → personagem desaparece apos 5s → tratado como morte                        |

**Criterio de conclusao:** Partida completa: lobby → selecao de agente → countdown → combate → zona encolhe → vencedor → stats → replay.

### Fase 4: Equipamentos (3-4 semanas)

**Objetivo:** Cada personagem tem o seu equipamento funcional no modo Gunfight+Equipment.

| #   | Tarefa                             | Descricao                                                                                    |
|-----|------------------------------------|----------------------------------------------------------------------------------------------|
| 4.1 | Feature toggle `equipment_enabled` | Equipamentos so funcionam quando toggle ativo                                                |
| 4.2 | Granada HE (Fable)                 | Spawn de 4 granadas, arremesso com fisico, explosao com blast radius, dano com falloff       |
| 4.3 | Escudo Balistico (Foul)            | Toggle ativo/inativo, HP 150, cobertura 90°, ricochete, penalidade de velocidade e FOV       |
| 4.4 | Flash Tatica (Foul)                | 2 cargas, arremesso, detonacao 1.5s, blind 2.5s, slow 3s, requer linha de visao              |
| 4.5 | Camera X-ray (Fate)                | 2 cameras, posicionamento, alternancia de visao, HP 1 tiro, detecao por inimigos             |
| 4.6 | Drone Recon (Fate)                 | Lancamento, controle remoto (WASD), vulnerabilidade do personagem, duracao 10s, cooldown 20s |
| 4.7 | Torre Automatica (Fate)            | Posicionamento, auto-aim no cone 90°, 8 dmg/tiro, 300 RPM, 60 balas, HP 3 tiros              |
| 4.8 | Testes de balanceamento            | Sessoes focadas: cada personagem sente-se justo e distinto                                   |

**Criterio de conclusao:** Os 3 personagens com equipamentos completos e funcionais. Escudo ricocheteia, drone recon funciona, granadas explodem com falloff correto.

### Fase 5: Polimento e Audio (4-6 semanas)

**Objetivo:** O jogo parece e soa como um jogo.

| #   | Tarefa                  | Descricao                                                                                             |
|-----|-------------------------|-------------------------------------------------------------------------------------------------------|
| 5.1 | Sprites dos personagens | Sistema de 3 layers (pernas, corpo, cabeca) para Fable, Fate e Foul                                   |
| 5.2 | Sprites do mapa         | Tiles de chao, paredes, obstaculos com arte pixel final. Texturas distintas para paredes penetraveis  |
| 5.3 | VFX                     | Muzzle flash, particulas de sangue, impacto em parede, explosao HE, ricochete do escudo, screen shake |
| 5.4 | HUD completa            | HP + armor, stamina, municao, slots de equipamento, zona timer, jogadores vivos                       |
| 5.5 | Audio direcional        | Passos posicionais (diferentes por colete), sons de tiro distintos por arma, spin-up da minigun       |
| 5.6 | Numeros de dano         | Float up sobre o alvo, amarelo para backstab                                                          |
| 5.7 | Testes com jogadores    | Sessoes de playtest com 4 jogadores, iterar balance                                                   |
| 5.8 | Bug fixes e otimizacao  | Performance, edge cases de rede, colisoes                                                             |
| 5.9 | Menu principal          | Tela de titulo, botoes jogar/opcoes/sair                                                              |

**Criterio de conclusao:** O jogo e jogavel, divertido, e tem feedback visual/sonoro satisfatorio. 10 testadores consideram-no divertido.

---



## 17. Glossario

| Termo                  | Definição                                                                                                      |
|------------------------|----------------------------------------------------------------------------------------------------------------|
| Armor                  | Camada de proteção que absorve dano antes do HP. Fable: 0, Fate: 30 (colete leve), Foul: 60 (colete pesado)    |
| Backstab               | Ataque melee pelas costas (zona 135°-225° atras do alvo) que causa dano multiplicado                           |
| Client-side prediction | Técnica onde o cliente aplica inputs imediatamente sem esperar confirmação do servidor                         |
| Deployable             | Entidade colocada/lancada pelo jogador que atua autonomamente ou via controlo remoto (câmeras, drones, torres) |
| FFA                    | Free For All — todos contra todos                                                                              |
| Fog of war             | Area do mapa nao visível para o jogador (escuridão fora do cone FOV)                                           |
| Hitbox                 | Area de colisão do personagem.                                                                                 |
| HP Efetivo             | HP + Armor. Valor real de durabilidade: Fable 100, Fate 130, Foul 160                                          |
| KoTH                   | King of the Hill — modo de controle de área                                                                    |
| MVP                    | Minimum Viable Product — versao mínima funcional                                                               |
| Reconciliacao          | Processo de correção do estado do cliente quando diverge do servidor                                           |
| Server-side culling    | Servidor omite informação de entidades fora do alcance relevante do jogador                                    |
| Shadow casting         | Algoritmo que calcula areas visíveis considerando obstáculos que bloqueiam visão                               |
| Spin-up                | Tempo que a Minigun de Foul demora a atingir cadencia máxima (0.8s)                                            |
| Spread                 | \u00c2ngulo de desvio aleatório aplicado a cada tiro                                                                |
| Stagger                | Interrupção breve de ações ao receber dano melee                                                               |
| Swept collision        | Verificação de colisão ao longo de toda a trajetória entre dois pontos (evita tunneling)                       |
| Tick                   | Uma iteração do game loop do servidor                                                                          |
| TTK                    | Time to Kill — tempo médio necessário para eliminar um jogador                                                 |
| Tunneling              | Bug onde um objeto rápido atravessa outro entre frames/ticks                                                   |
| Wall penetration       | Mecânica da Desert Eagle de Fate: balas atravessam paredes penetraveis com 75% do dano                         |
",