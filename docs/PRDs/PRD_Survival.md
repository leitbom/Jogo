# PRD — Modo Survival
**Versão:** 1.0  
**Data:** 2026-03-14  
**Status:** Spec fechado — pronto para desenvolvimento  
**Referência:** PRD_TopDown_TacticalShooter_definitive.md

---

## 1. Visão Geral

| Campo                  | Valor                                                  |
|------------------------|--------------------------------------------------------|
| Modo                   | Survival                                               |
| Tipo de partida        | FFA (Free For All) — `team_size: 1`                    |
| Mínimo de jogadores    | 4                                                      |
| Máximo de jogadores    | 8                                                      |
| Timer da partida       | **3 minutos (180s)**                                   |
| Respawn                | **Não** — eliminado = espectador até fim               |
| Zona segura            | **Não**                                                |
| Equipamentos           | **Sim** — `equipment_enabled: true`                    |
| Seleção de agente      | **Sim** — Fable / Fate / Foul no lobby                 |
| Agentes repetidos      | Permitido (dois jogadores podem ser Fable)             |

---

## 2. Win Conditions

O modo tem **duas condições de vitória**, checadas pelo servidor:

### 2.1 Último Sobrevivente
- Acionada quando todos os jogadores menos um estão mortos.
- O jogador vivo é declarado **vencedor imediatamente**, sem esperar o timer.
- Partida termina neste momento.

### 2.2 Fim do Timer com Múltiplos Sobreviventes
- Quando o timer chega a 0 e existem 2 ou mais jogadores vivos.
- **Todos os sobreviventes são declarados vencedores** — empate.
- Partida termina neste momento.

### 2.3 Caso especial: Todos morrem ao mesmo tempo
- Se o último tiro mata simultaneamente os dois últimos jogadores (ex: Foul com escudo, grenade splash), **empate** entre os últimos mortos.

---

## 3. Configuração JSON do Modo

```json
{
  "mode": "survival",
  "label": "Survival",
  "description": "FFA — último vivo vence. Sem respawn. 3 minutos.",
  "team_size": 1,
  "min_players": 4,
  "max_players": 8,
  "match_time_limit_s": 180,
  "objective": "elimination",
  "respawn_enabled": false,
  "zone_enabled": false,
  "equipment_enabled": true,
  "skills_enabled": false,
  "friendly_fire": false,
  "hp_regen": false,
  "hit_markers": true,
  "hud_minimal": false,
  "minimap_enabled": false,
  "round_based": false,
  "extra_magazines": 1,
  "tactical_reload": true
}
```

---

## 4. Agentes

### 4.1 Seleção no Lobby

Todos os 3 agentes disponíveis. Repetição permitida.

| Agente    | Classe             | HP   | Armor | HP Efetivo | Velocidade base |
|-----------|--------------------|------|-------|------------|-----------------|
| **Fable** | Assalto / DPS      | 100  | 0     | 100        | 220 u/s         |
| **Fate**  | Inteligência       | 100  | 30    | 130        | 190 u/s         |
| **Foul**  | Tanque / Supressão | 100  | 60    | 160        | 150 u/s         |

### 4.2 Armas por Agente

| Agente    | Arma principal | Dano/tiro | Cadência  | Pente | Reserva (1 extra) | Total balas |
|-----------|----------------|-----------|-----------|-------|--------------------|-------------|
| **Fable** | AK-47          | 25        | ~800 RPM  | 30    | 30                 | 60          |
| **Fate**  | Desert Eagle   | 50        | ~180 RPM  | 7     | 7                  | 14          |
| **Foul**  | Minigun        | 8         | ~1800 RPM | 150   | 150                | 300         |

> **Recarga tática ativa:** recarregar com balas restantes no pente **descarta** essas balas. A reserva é o único pente extra.

### 4.3 Equipamentos por Agente

| Agente    | Slot E          | Slot Q          | Slot T  |
|-----------|-----------------|-----------------|---------|
| **Fable** | Granada HE ×4   | —               | —       |
| **Fate**  | Câmera          | Câmera          | Torre   |
| **Foul**  | Flash ×2        | Escudo Balístico| —       |

---

## 5. Munição — Detalhe da Recarga Tática

```
Estado inicial:
  Pente atual: CHEIO
  Reserva: 1 pente CHEIO

Cenário A — recarrega com pente vazio:
  → Reserva passa para pente atual (cheio)
  → Reserva: 0 pentes

Cenário B — recarrega com 10 balas restantes no pente:
  → Pente descartado (10 balas PERDIDAS)
  → Reserva passa para pente atual (cheio)
  → Reserva: 0 pentes

Cenário C — tenta recarregar sem reserva:
  → Animação de recarga sem efeito
  → HUD mostra indicador visual de sem munição
```

**Estados de munição no HUD:**
- `30 / 30` → pente cheio, reserva cheia
- `15 / 30` → meio pente, reserva disponível
- `15 / 0`  → meio pente, sem reserva
- `0 / 0`   → sem munição — apenas melee disponível

---

## 6. Fluxo Completo da Partida

```
┌─────────────────────────────────────────────────────────────────┐
│                     MENU PRINCIPAL                              │
│                        [JOGAR]                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       MATCHMAKING                               │
│  Criar sala (código 5 chars) OU Entrar por código               │
│  Aguarda 4–8 jogadores · Host confirma início                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         LOBBY                                   │
│  Cada jogador seleciona agente: Fable / Fate / Foul             │
│  Marca "Pronto" · Host inicia quando todos prontos              │
│  Mínimo 4 jogadores para iniciar                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       COUNTDOWN                                 │
│                       3 … 2 … 1 … GO                           │
│  Jogadores nos spawns, sem controle                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PARTIDA EM JOGO                              │
│  Timer: 3:00 → 0:00 (top center do HUD)                        │
│  Jogadores vivos: contador top right                            │
│                                                                 │
│  Loop:                                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Jogador morre → entra em modo espectador                │   │
│  │  Pode ciclar entre jogadores vivos (Tab)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Termina quando:                                                │
│  ├── 1 jogador restante → esse jogador VENCE                   │
│  └── Timer = 0 com N ≥ 2 jogadores → EMPATE entre sobreviventes│
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  TELA DE FIM DE JOGO                            │
│  Vencedor(es) destacado(s) visualmente                          │
│  Stats por jogador: kills · dano causado · dano recebido        │
│  [Jogar Novamente] → volta ao Lobby com mesmos jogadores        │
│  [Menu Principal]  → encerra sessão de grupo                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Lobby

### 7.1 Criar / Entrar

| Ação              | Descrição                                                 |
|-------------------|-----------------------------------------------------------|
| Criar sala        | Gera código único de 5 caracteres (ex: `XKQT7`)          |
| Entrar por código | Campo de texto — digitar o código da sala                 |
| Salas públicas    | Lista de salas abertas com vagas (pós-MVP)                |

### 7.2 Dentro do Lobby

| Ação                  | Quem pode        | Descrição                                         |
|-----------------------|------------------|---------------------------------------------------|
| Selecionar agente     | Qualquer jogador | Fable / Fate / Foul com preview de stats          |
| Marcar "Pronto"       | Qualquer jogador | Fica verde com ✓ quando pronto                    |
| Iniciar partida       | Apenas o host    | Ativo somente quando ≥ 4 jogadores prontos        |
| Trocar agente         | Qualquer jogador | Cancela estado "pronto" ao trocar                 |
| Expulsar jogador      | Apenas o host    | Remove jogador da sala                            |

### 7.3 Regras do Lobby

- Mínimo **4 jogadores** para iniciar.
- Máximo **8 jogadores**.
- Agentes repetidos são permitidos.
- Se um jogador sair após todos estarem prontos, estado "pronto" reseta para todos.
- Host abandona sala → o próximo jogador na lista torna-se host.

---

## 8. Spawn

### 8.1 Distribuição

O mapa deve ter **exatamente 4 spawn points** definidos como FFA (team: null) pelo Map Editor, posicionados nos 4 cantos/bordas.

| Nº jogadores | Comportamento                                                                    |
|--------------|----------------------------------------------------------------------------------|
| 4            | 1 jogador por spawn point (bijeção perfeita, sem colisão)                       |
| 5–8          | Os 4 spawns são ocupados primeiro (aleatório). Jogadores extras recebem um offset aleatório de ±30u em torno de um spawn aleatório |

### 8.2 Proteção de Spawn

- Jogadores são **imunes a dano** durante o countdown (3s).
- Ao fim do countdown, imunidade cessa imediatamente.
- Não existe proteção após spawn — os jogadores precisam de se mover.

---

## 9. HUD em Partida

### 9.1 Elementos Ativos no Modo Survival

```
┌────────────────────────────────────────────────────────────┐
│  [VIVOS: 6/8]                    ⏱ 2:47                   │
│                                                            │
│                                                            │
│                      ✛ (centro)                           │
│                                                            │
│         [personagem]                                       │
│       ══ HP arc (vermelho) ══                              │
│     ════ Stamina arc (azul) ════                           │
│                                                            │
│                            ┌──────────────────┐           │
│                            │  30 / 30         │           │
│                            │  [E1] [E2] [E3]  │           │
│                            └──────────────────┘           │
└────────────────────────────────────────────────────────────┘
```

| Elemento              | Posição          | Descrição                                          |
|-----------------------|------------------|----------------------------------------------------|
| Timer                 | Top center       | `MM:SS` countdown — fica vermelho nos últimos 30s  |
| Jogadores vivos       | Top left         | `VIVOS: N/Total` — atualizado a cada morte         |
| HP arc                | Em torno do personagem | Arco vermelho, raio ~30u                    |
| Stamina arc           | Em torno do personagem | Arco azul, raio ~40u                        |
| Munição               | Bottom right     | `balas_no_pente / balas_na_reserva`                |
| Slots de equipamento  | Bottom right     | 3 slots com ícone + contador de usos               |
| Hit marker            | Centro           | Cruz vermelha ao acertar inimigo                   |
| Dano direcional       | Aresta da tela   | Seta/flash na direção do atacante                  |
| Dano recebido         | Borda do ecrã    | Flash vermelho rápido                              |
| Indicador "SPECTATING"| Top center       | Visível apenas após morte                          |
| Nome do jogador observado | Top center   | Visível apenas em modo espectador                  |

### 9.2 Timer — Comportamento

| Estado         | Aparência                     |
|----------------|-------------------------------|
| > 30s restantes| Branco, tamanho normal         |
| ≤ 30s restantes| Vermelho, ligeiramente maior   |
| 0:00           | Dispara evento fim de jogo     |

---

## 10. Modo Espectador (pós-morte)

| Parâmetro            | Valor                                               |
|----------------------|-----------------------------------------------------|
| Ativação             | Automática ao morrer                                |
| Visão                | Segue o jogador selecionado (mesma câmera + FOV)   |
| Navegação            | `Tab` — cicla entre jogadores vivos                 |
| Informação visível   | A mesma que o jogador vivo vê (cone FOV incluso)    |
| HUD espectador       | Nome do observado, HP, indicador "SPECTATING"       |
| Comunicação          | Nenhuma in-game (evita ghosting)                    |

---

## 11. Tela de Fim de Jogo

### 11.1 Layout

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│          🏆  VENCEDOR: FABLE  (ou  EMPATE)  🏆              │
│                                                              │
│  Jogador        Agente   Kills  Dano    Dano rec.  Precisão  │
│  ──────────────────────────────────────────────────────────  │
│  Carlos (você)  Fable    3      650     180        42%       │
│  João           Fate     2      480     300        38%       │
│  Maria          Foul     1      200     420        51%       │
│  Pedro          Fable    0      80      600        19%       │
│                                                              │
│            [Jogar Novamente]    [Menu Principal]             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 11.2 Stats Registados por Jogador

| Stat             | Descrição                                         |
|------------------|---------------------------------------------------|
| `kills`          | Eliminações confirmadas                           |
| `damage_dealt`   | Dano total causado (HP + armor)                   |
| `damage_taken`   | Dano total recebido                               |
| `accuracy`       | Tiros que acertaram / tiros disparados × 100      |
| `survival_time`  | Segundos vivos na partida                         |
| `winner`         | `true` se vencedor ou sobrevivente ao fim do timer|

---

## 12. Gestão de Desconexão

| Situação                          | Comportamento                                           |
|-----------------------------------|---------------------------------------------------------|
| Jogador desconecta no lobby        | Removido da sala. Host notificado                       |
| Jogador desconecta em jogo        | Personagem desaparece após **5s**. Contado como morto   |
| Host desconecta em jogo           | Próximo jogador na lista torna-se host. Jogo continua   |
| Todos desconectam                 | Servidor destrói a room                                 |

---

## 13. Estado do Servidor (Game State)

### 13.1 Room State

```json
{
  "room_id": "XKQT7",
  "mode": "survival",
  "state": "lobby | countdown | in_game | ended",
  "players": {
    "socket_id_1": {
      "name": "Carlos",
      "agent": "fable",
      "ready": true,
      "alive": true,
      "hp": 100,
      "armor": 0,
      "ammo_current": 30,
      "ammo_reserve": 30,
      "kills": 0,
      "damage_dealt": 0,
      "damage_taken": 0,
      "shots_fired": 0,
      "shots_hit": 0,
      "x": 100, "y": 100,
      "angle": 0
    }
  },
  "timer_remaining_s": 180,
  "alive_count": 8,
  "total_players": 8,
  "winners": []
}
```

### 13.2 Eventos do Servidor → Cliente

| Evento              | Dados                                              | Quando                          |
|---------------------|----------------------------------------------------|---------------------------------|
| `room:state`        | Estado completo da room                            | Ao entrar na sala               |
| `player:joined`     | `{id, name, agent}`                                | Novo jogador entra              |
| `player:left`       | `{id}`                                             | Jogador sai                     |
| `player:ready`      | `{id, ready}`                                      | Status de pronto muda           |
| `game:countdown`    | `{countdown: 3}`                                   | Host inicia partida             |
| `game:start`        | Posições de spawn de todos                         | Countdown = 0                   |
| `game:state`        | Estado completo dos jogadores (posição, HP, etc.)  | Cada tick (20Hz)                |
| `game:hit`          | `{attacker_id, target_id, damage, hp_remaining}`   | Tiro acerta jogador             |
| `game:kill`         | `{killer_id, victim_id}`                           | Jogador morre                   |
| `game:end`          | `{winners: [id, ...], stats: {...}}`               | Partida termina                 |
| `game:timer`        | `{remaining_s}`                                    | A cada segundo                  |

### 13.3 Eventos do Cliente → Servidor

| Evento              | Dados                                              | Quando                          |
|---------------------|----------------------------------------------------|---------------------------------|
| `lobby:select_agent`| `{agent: "fable"}`                                 | Jogador escolhe agente          |
| `lobby:ready`       | `{ready: true}`                                    | Jogador marca pronto            |
| `lobby:start`       | `{}`                                               | Host inicia (apenas host)       |
| `input`             | `{dx, dy, angle, actions, tick}`                   | Cada frame (30Hz)               |

---

## 14. Anti-Cheat Básico (Servidor Autoritativo)

O servidor **valida todos os inputs** antes de aplicar:

| Check                    | O que valida                                                  |
|--------------------------|---------------------------------------------------------------|
| Velocidade de movimento  | `distância_por_tick ≤ (velocidade_max × tick_duration) × 1.1`|
| Cadência de tiro         | Intervalo entre tiros ≥ cooldown da arma − tolerância 5%     |
| Munição                  | Não pode disparar com `ammo_current = 0`                      |
| Recarga                  | Não pode ter mais balas que o máximo do pente + reserva       |
| Dano                     | Servidor calcula dano — cliente nunca reporta dano próprio    |
| Estado do jogador        | Não pode enviar inputs de movimento/tiro se `alive = false`   |

---

## 15. Backlog — Tarefas de Implementação

### Sprint 1 — Servidor: Lógica de Jogo

| # | Tarefa                              | Descrição                                                    |
|---|-------------------------------------|--------------------------------------------------------------|
| 1.1 | Room manager                      | Criar / entrar / sair de salas com código único              |
| 1.2 | Lobby state                       | Seleção de agente, pronto, host controls                     |
| 1.3 | Countdown                         | 3s com broadcast para clientes                               |
| 1.4 | Spawn assignment                  | 4 cantos + offset aleatório para jogadores extras            |
| 1.5 | Game state tick (20Hz)            | Loop de 50ms: posições, HP, munição                          |
| 1.6 | Timer 180s                        | Decremento + broadcast `game:timer` a cada segundo           |
| 1.7 | Death handling                    | `hp ≤ 0` → `alive = false`, broadcast `game:kill`           |
| 1.8 | Win condition check               | Após cada morte ou timer = 0: verificar vencedor(es)         |
| 1.9 | Stats accumulation                | Acumular kills, dano, tiros por jogador                      |
| 1.10| Disconnection handling            | Timeout 5s → marcar como morto                               |

### Sprint 2 — Cliente: Lobby + Fluxo

| # | Tarefa                              | Descrição                                                    |
|---|-------------------------------------|--------------------------------------------------------------|
| 2.1 | Lobby UI                          | Lista de jogadores, seleção de agente, botão pronto          |
| 2.2 | Countdown screen                  | Overlay 3…2…1…GO                                             |
| 2.3 | Timer HUD                         | `MM:SS` top center, vermelho nos últimos 30s                 |
| 2.4 | Jogadores vivos HUD               | `VIVOS: N/Total` top left                                    |
| 2.5 | Munição HUD                       | `pente / reserva`, atualizado em tempo real                  |
| 2.6 | Tela de fim de jogo               | Vencedor + stats table + botões                              |

### Sprint 3 — Cliente: Jogabilidade

| # | Tarefa                              | Descrição                                                    |
|---|-------------------------------------|--------------------------------------------------------------|
| 3.1 | Input com agente escolhido        | Aplicar stats do agente selecionado (speed, HP, FOV)         |
| 3.2 | Recarga tática                    | Descartar balas restantes ao recarregar                      |
| 3.3 | Equipamentos por agente           | Slots E/Q/T ativos conforme agente                           |
| 3.4 | Modo espectador                   | Tab para ciclar vivos, HUD de espectador                     |
| 3.5 | Carregamento de mapa via JSON     | Servidor envia JSON do mapa; cliente carrega e renderiza     |

### Sprint 4 — Integração e Testes

| # | Tarefa                              | Descrição                                                    |
|---|-------------------------------------|--------------------------------------------------------------|
| 4.1 | Teste 4 jogadores                 | Partida completa de lobby → fim de jogo                      |
| 4.2 | Teste 8 jogadores                 | Stress test de spawn + estado com 8 clientes                 |
| 4.3 | Desconexão mid-game               | Verificar que partida continua corretamente                  |
| 4.4 | Anti-cheat validation             | Verificar que todas as validações do servidor funcionam      |
| 4.5 | TTK playtest                      | Confirmar que 2–3 jogadores conseguem disputar os 3 minutos  |

---

## 16. Critério de Conclusão

A implementação do modo Survival está concluída quando:

- [ ] 4–8 jogadores conseguem criar/entrar numa sala e selecionar agente
- [ ] Partida começa com countdown e termina com tela de resultados
- [ ] Win condition "último sobrevivente" funciona em < 3 min
- [ ] Win condition "timer esgotado" declara empate entre sobreviventes
- [ ] Recarga tática descarta balas corretamente
- [ ] Equipamentos funcionam conforme o agente
- [ ] Modo espectador ativo após morte, navega com Tab
- [ ] Desconexão mid-game não quebra a partida
- [ ] Stats (kills, dano, precisão) corretos na tela de fim de jogo
- [ ] Servidor rejeita inputs inválidos (velocidade, cadência, munição)
