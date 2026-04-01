# PRD — Lobby do Modo Survival
**Versão:** 2.0  
**Data:** 2026-03-14  
**Responsável:** Equipa de Front-end  
**Status:** Aprovado para desenvolvimento  
**Referências:** PRD_Survival.md · PRD_TopDown_TacticalShooter_definitive.md

---

## 1. Visão Geral

O lobby é a sala de espera onde os jogadores se encontram antes de uma partida do modo Survival. É a ponte entre o menu principal e o jogo.

**O jogador deve conseguir:**
- Criar uma sala ou entrar numa sala existente por código
- Ver todos os jogadores conectados, os seus nomes e agentes selecionados
- Escolher o seu agente (Fable / Fate / Foul)
- Indicar que está pronto
- Iniciar a partida (apenas o host)

**Implementação:** `<div>` sobreposta ao canvas do jogo, mostrada/escondida via classe `.active`. Comunica com o servidor via Socket.io (o mesmo socket já conectado ao servidor de jogo). Desaparece quando a partida começa.

---

## 2. Funcionalidades

| ID  | Funcionalidade            | Descrição                                                                 |
|-----|---------------------------|---------------------------------------------------------------------------|
| F01 | Conexão automática        | Ao entrar no lobby o cliente já está conectado ao WebSocket do servidor   |
| F02 | Código de sala            | Sala tem código único de 5 chars. Botão de copiar disponível              |
| F03 | Lista de jogadores        | Todos os conectados com nome, agente escolhido e estado de pronto         |
| F04 | Seleção de agente         | Setas ◀ ▶ alternam entre Fable / Fate / Foul. Visível para todos         |
| F05 | Botão Pronto              | Toggle. Quando ativo bloqueia troca de agente. Texto e cor mudam         |
| F06 | Botão Iniciar             | Visível apenas para o host. Ativo apenas quando ≥ 4 jogadores prontos    |
| F07 | Contagem regressiva       | Overlay animado 3→2→1 visível para todos ao iniciar                      |
| F08 | Sincronização tempo real  | Todas as ações refletidas instantaneamente para todos via WebSocket       |
| F09 | Gestão de desconexão      | Host sai → próximo vira host. Jogador sai após todos prontos → reset      |

---

## 3. Regras de Negócio

| Regra                                   | Valor/Comportamento                                      |
|-----------------------------------------|----------------------------------------------------------|
| Mínimo de jogadores para iniciar        | 4 (todos prontos)                                        |
| Máximo de jogadores                     | 8                                                        |
| Agentes repetidos                       | Permitido                                                |
| Quem pode iniciar                       | Apenas o host                                            |
| Trocar agente quando pronto             | Não — tem de desmarcar pronto primeiro                   |
| Host abandona                           | Próximo jogador na lista torna-se host                   |
| Jogador sai após todos estarem prontos  | Estado "pronto" reseta para todos                        |
| Entrar em sala cheia (> 8)              | Erro: "Sala cheia"                                       |
| Entrar com código inválido              | Erro: "Sala não encontrada"                              |
| Entrar em partida já iniciada           | Erro: "Partida já iniciada"                              |

---

## 4. Estrutura de Dados

### 4.1 Objeto `Player`

```js
// Usado tanto no cliente como no servidor
{
  id: "socket_id",    // string — ID único do socket
  name: "Carlos",     // string — nome de exibição
  agentKey: "fable",  // "fable" | "fate" | "foul"
  ready: false,       // boolean
  isHost: false       // boolean — true para o dono atual da sala
}
```

### 4.2 Definição dos Agentes (`AGENTS`)

```js
// characters.js  (ou inline no lobby.js)
const AGENTS = [
  {
    key: "fable",
    name: "FABLE",
    role: "Assalto",
    color: "#e74c3c",
    hp: 100, armor: 0, speed: 220,
    weapon: "AK-47",
    equipment: "Granada HE ×4",
    icon: "assets/characters/fable.png"
  },
  {
    key: "fate",
    name: "FATE",
    role: "Inteligência",
    color: "#3498db",
    hp: 100, armor: 30, speed: 190,
    weapon: "Desert Eagle",
    equipment: "Câmera · Drone · Torre",
    icon: "assets/characters/fate.png"
  },
  {
    key: "foul",
    name: "FOUL",
    role: "Tanque",
    color: "#2ecc71",
    hp: 100, armor: 60, speed: 150,
    weapon: "Minigun",
    equipment: "Escudo Balístico · Flash ×2",
    icon: "assets/characters/foul.png"
  }
];
```

> **Fallback de assets:** enquanto os sprites não existirem, `img.onerror` aplica `agent.color` como cor de fundo, garantindo que o lobby funciona desde o primeiro dia de desenvolvimento.

---

## 5. Eventos WebSocket (Socket.io)

> **Convenção:** prefixo `lobby:` para eventos do lobby, `game:` para transição para o jogo. Consistente com PRD_Survival.md.

### 5.1 Servidor → Cliente

| Evento                 | Payload                                          | Quando                               |
|------------------------|--------------------------------------------------|--------------------------------------|
| `lobby:state`          | `{ players: Player[], roomCode: string }`        | Ao entrar na sala (estado completo)  |
| `lobby:player_joined`  | `Player`                                         | Novo jogador entrou                  |
| `lobby:player_left`    | `{ id: string }`                                 | Jogador saiu                         |
| `lobby:agent_changed`  | `{ id: string, agentKey: string }`               | Alguém mudou de agente               |
| `lobby:ready_changed`  | `{ id: string, ready: boolean }`                 | Alguém mudou estado de pronto        |
| `lobby:host_changed`   | `{ newHostId: string }`                          | Host mudou                           |
| `lobby:error`          | `{ message: string }`                            | Validação falhou no servidor         |
| `game:countdown`       | `{ count: number }`                              | Countdown (emitido 3× — 3, 2, 1)    |
| `game:start`           | `{ spawnPoints: {[id]:{x,y}}, mapJson: object }` | Partida começa — fecha lobby         |

### 5.2 Cliente → Servidor

| Evento                 | Payload                    | Quem pode enviar  |
|------------------------|----------------------------|-------------------|
| `lobby:select_agent`   | `{ agentKey: string }`     | Qualquer jogador  |
| `lobby:toggle_ready`   | `{ ready: boolean }`       | Qualquer jogador  |
| `lobby:start`          | `{}`                       | Apenas host       |

---

## 6. HTML

```html
<div id="lobby-screen" class="menu-screen">
  <div class="lobby-container">

    <!-- Cabeçalho -->
    <div class="lobby-header">
      <h2>Sala de Espera</h2>
      <div class="room-code">
        Código: <span id="room-code-display">–</span>
        <button id="copy-code-btn" class="btn-small">Copiar</button>
      </div>
    </div>

    <!-- Lista de jogadores (preenchida dinamicamente) -->
    <div id="players-list" class="players-list"></div>

    <!-- Seleção de agente -->
    <div class="character-selection">
      <button id="prev-agent" class="arrow" aria-label="Agente anterior">◀</button>
      <div class="agent-display">
        <img id="agent-icon" src="" alt="Agente" width="80" height="80">
        <div class="agent-info">
          <span id="agent-name"   class="agent-name"></span>
          <span id="agent-role"   class="agent-role"></span>
          <span id="agent-weapon" class="agent-weapon"></span>
          <span id="agent-equip"  class="agent-equip"></span>
        </div>
      </div>
      <button id="next-agent" class="arrow" aria-label="Próximo agente">▶</button>
    </div>

    <!-- Botões de ação -->
    <div class="action-buttons">
      <button id="ready-btn" class="btn btn-ready">Pronto</button>
      <button id="start-btn" class="btn btn-start" disabled>Iniciar Partida</button>
    </div>

    <p id="min-players-hint" class="hint">Mínimo de 4 jogadores prontos para iniciar</p>

  </div><!-- /.lobby-container -->

  <!-- Overlay de contagem regressiva (filho direto de #lobby-screen) -->
  <div id="countdown-overlay" class="countdown-overlay hidden">
    <span id="countdown-number">3</span>
  </div>
</div><!-- /#lobby-screen -->
```

---

## 7. CSS

```css
/* ── Overlay principal ── */
#lobby-screen {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
#lobby-screen.active { display: flex; }

/* ── Container central ── */
.lobby-container {
  background: #1a1a2e;
  border: 2px solid #0f3460;
  border-radius: 16px;
  padding: 2rem;
  width: min(90vw, 720px);
  max-height: 90vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  color: #e0e0e0;
  box-shadow: 0 0 40px rgba(0, 255, 255, 0.15);
  position: relative;   /* ancora o countdown-overlay */
}

/* ── Cabeçalho ── */
.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.lobby-header h2 {
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.4rem;
  letter-spacing: 3px;
  color: #e94560;
  text-transform: uppercase;
  margin: 0;
}
.room-code {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #8899aa;
}
.room-code span { color: #ffe066; font-weight: bold; letter-spacing: 2px; font-family: monospace; }
.btn-small {
  background: none;
  border: 1px solid #1e3a6e;
  color: #8899aa;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.15s;
}
.btn-small:hover { border-color: #e94560; color: #e94560; }

/* ── Lista de jogadores ── */
.players-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 1.5rem;
  min-height: 140px;
}
.player-item {
  display: grid;
  grid-template-columns: 1fr 90px 110px 90px;
  align-items: center;
  gap: 8px;
  background: #16213e;
  padding: 10px 14px;
  border-radius: 10px;
  border-left: 4px solid #1e3a6e;
  transition: border-color 0.2s;
}
.player-item.ready    { border-left-color: #2ecc71; }
.player-item.is-local { background: #1e2a4e; }

.player-name { font-weight: 600; font-size: 0.95rem; }
.player-name .badge {
  font-size: 0.62rem;
  padding: 1px 5px;
  border-radius: 3px;
  margin-left: 6px;
  vertical-align: middle;
}
.badge-host { color: #ffe066; background: rgba(255,224,102,.15); }
.badge-you  { color: #aaa;    background: rgba(170,170,170,.1);  }

.player-agent  { font-size: 0.85rem; font-weight: 600; }
.player-role   { font-size: 0.78rem; color: #8899aa; }
.player-status { font-size: 0.82rem; text-align: right; }
.player-status.ready   { color: #2ecc71; }
.player-status.waiting { color: #ffaa00; }

.player-slot-empty {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px dashed #1e3a6e;
  text-align: center;
  font-size: 0.78rem;
  color: #333;
}

/* ── Seleção de agente ── */
.character-selection {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 1.2rem 0;
  border-top: 1px solid #1e3a6e;
  border-bottom: 1px solid #1e3a6e;
  margin-bottom: 1.5rem;
}
.arrow {
  background: none;
  border: 2px solid #1e3a6e;
  color: #e0e0e0;
  font-size: 1.2rem;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s;
}
.arrow:hover:not(:disabled) { background: #1e3a6e; transform: scale(1.1); }
.arrow:disabled { opacity: 0.25; cursor: not-allowed; }

.agent-display { display: flex; align-items: center; gap: 16px; min-width: 260px; }
#agent-icon {
  width: 72px; height: 72px;
  border-radius: 8px;
  border: 2px solid #1e3a6e;
  background: #0d0d18;
  image-rendering: pixelated;
  flex-shrink: 0;
}
.agent-info   { display: flex; flex-direction: column; gap: 2px; }
.agent-name   { font-size: 1.1rem; font-weight: 700; letter-spacing: 2px; }
.agent-role   { font-size: 0.78rem; color: #8899aa; }
.agent-weapon { font-size: 0.82rem; }
.agent-equip  { font-size: 0.75rem; color: #8899aa; }

/* ── Botões de ação ── */
.action-buttons { display: flex; justify-content: center; gap: 16px; margin-bottom: 0.75rem; }
.btn {
  padding: 11px 28px;
  border: 2px solid transparent;
  border-radius: 8px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s;
}
.btn-ready              { background: #2a2a3a; color: #e0e0e0; border-color: #444; }
.btn-ready.active       { background: #1a5c1a; border-color: #2ecc71; color: #2ecc71; }
.btn-start              { background: #0f3460; color: #e0e0e0; border-color: #1e5090; }
.btn-start:not(:disabled):hover { background: #1a4a8a; transform: scale(1.03); }
.btn-start:disabled     { opacity: 0.3; cursor: not-allowed; }

.hint { text-align: center; font-size: 0.78rem; color: #445; margin: 0; }

/* ── Mensagem de erro inline ── */
.lobby-error {
  background: rgba(233,69,96,.15);
  border: 1px solid #e94560;
  color: #e94560;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 0.85rem;
  margin-bottom: 12px;
  text-align: center;
  animation: fadeError 3s ease forwards;
}
@keyframes fadeError {
  0%   { opacity: 0; transform: translateY(-4px); }
  15%  { opacity: 1; transform: translateY(0); }
  75%  { opacity: 1; }
  100% { opacity: 0; }
}

/* ── Countdown overlay ── */
.countdown-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0,0,0,0.75);
  border-radius: 16px;
  z-index: 10;
}
.countdown-overlay.hidden { display: none; }

#countdown-number {
  font-family: 'Rajdhani', sans-serif;
  font-size: 6rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 30px cyan, 0 0 60px cyan;
  animation: countPulse 0.9s ease-out;
}
@keyframes countPulse {
  from { transform: scale(1.5); opacity: 0.4; }
  to   { transform: scale(1);   opacity: 1;   }
}
```

---

## 8. JavaScript — Lógica Completa

### 8.1 Estado Local

```js
// lobby.js
let localPlayer = null;   // Player — jogador local
let roomPlayers = [];     // Player[] — todos na sala
let agentIndex  = 0;      // índice atual em AGENTS
let lobbySocket = null;   // instância Socket.io
```

### 8.2 Ponto de Entrada

```js
/**
 * Chamar ao criar ou entrar numa sala.
 * @param {object} socket     instância Socket.io já conectada
 * @param {string} playerName
 * @param {string} roomCode
 */
function initLobby(socket, playerName, roomCode) {
  lobbySocket = socket;
  document.getElementById('room-code-display').textContent = roomCode;
  document.getElementById('copy-code-btn').addEventListener('click', () => {
    navigator.clipboard?.writeText(roomCode).catch(() => {});
  });
  setupAgentNavigation();
  setupReadyButton();
  setupStartButton();
  bindSocketEvents();
  showLobby();
}
```

### 8.3 Seleção de Agente

```js
function setupAgentNavigation() {
  document.getElementById('prev-agent').addEventListener('click', () => {
    if (localPlayer?.ready) return;
    agentIndex = (agentIndex - 1 + AGENTS.length) % AGENTS.length;
    updateAgentDisplay();
    lobbySocket.emit('lobby:select_agent', { agentKey: AGENTS[agentIndex].key });
  });
  document.getElementById('next-agent').addEventListener('click', () => {
    if (localPlayer?.ready) return;
    agentIndex = (agentIndex + 1) % AGENTS.length;
    updateAgentDisplay();
    lobbySocket.emit('lobby:select_agent', { agentKey: AGENTS[agentIndex].key });
  });
}

function updateAgentDisplay() {
  const agent = AGENTS[agentIndex];
  const img   = document.getElementById('agent-icon');
  img.src = agent.icon;
  img.style.borderColor = agent.color;
  img.onerror = () => { img.src = ''; img.style.background = agent.color; };

  document.getElementById('agent-name').textContent   = agent.name;
  document.getElementById('agent-name').style.color   = agent.color;
  document.getElementById('agent-role').textContent   = agent.role;
  document.getElementById('agent-weapon').textContent = `⚔ ${agent.weapon}`;
  document.getElementById('agent-equip').textContent  = `◈ ${agent.equipment}`;
}
```

### 8.4 Botão Pronto

```js
function setupReadyButton() {
  document.getElementById('ready-btn').addEventListener('click', () => {
    if (!localPlayer) return;
    lobbySocket.emit('lobby:toggle_ready', { ready: !localPlayer.ready });
  });
}

function applyReadyState(ready) {
  const btn = document.getElementById('ready-btn');
  btn.textContent = ready ? 'Pronto ✓' : 'Pronto';
  btn.classList.toggle('active', ready);
  document.getElementById('prev-agent').disabled = ready;
  document.getElementById('next-agent').disabled = ready;
}
```

### 8.5 Botão Iniciar (host only)

```js
function setupStartButton() {
  document.getElementById('start-btn').addEventListener('click', () => {
    if (!localPlayer?.isHost) return;
    lobbySocket.emit('lobby:start', {});
  });
}

function refreshStartButton() {
  const btn = document.getElementById('start-btn');
  btn.style.display = localPlayer?.isHost ? '' : 'none';
  if (!localPlayer?.isHost) return;

  const enoughPlayers = roomPlayers.length >= 4;
  const allReady      = roomPlayers.every(p => p.ready);
  btn.disabled = !(enoughPlayers && allReady);

  document.getElementById('min-players-hint').style.display = enoughPlayers ? 'none' : '';
}
```

### 8.6 Renderizar Lista de Jogadores

```js
function renderPlayersList() {
  const container = document.getElementById('players-list');
  container.innerHTML = '';

  roomPlayers.forEach(player => {
    const agent   = AGENTS.find(a => a.key === player.agentKey) ?? AGENTS[0];
    const isLocal = player.id === localPlayer?.id;

    const el = document.createElement('div');
    el.className = [
      'player-item',
      player.ready ? 'ready'    : '',
      isLocal       ? 'is-local' : ''
    ].filter(Boolean).join(' ');

    el.innerHTML = `
      <span class="player-name">
        ${escHtml(player.name)}
        ${player.isHost ? '<span class="badge badge-host">HOST</span>' : ''}
        ${isLocal       ? '<span class="badge badge-you">você</span>'  : ''}
      </span>
      <span class="player-agent" style="color:${agent.color}">${agent.name}</span>
      <span class="player-role">${agent.role}</span>
      <span class="player-status ${player.ready ? 'ready' : 'waiting'}">
        ${player.ready ? '✓ Pronto' : '⏳ Aguardando'}
      </span>
    `;
    container.appendChild(el);
  });

  // Slots vazios (até completar 4)
  for (let i = roomPlayers.length; i < 4; i++) {
    const el = document.createElement('div');
    el.className = 'player-slot-empty';
    el.textContent = '— Aguardando jogador —';
    container.appendChild(el);
  }

  refreshStartButton();
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
```

### 8.7 Eventos do Servidor

```js
function bindSocketEvents() {
  const s = lobbySocket;

  s.on('lobby:state', ({ players }) => {
    roomPlayers = players;
    localPlayer = players.find(p => p.id === s.id) ?? null;
    if (localPlayer) {
      agentIndex = Math.max(0, AGENTS.findIndex(a => a.key === localPlayer.agentKey));
      updateAgentDisplay();
      applyReadyState(localPlayer.ready);
    }
    renderPlayersList();
  });

  s.on('lobby:player_joined', (player) => {
    roomPlayers.push(player);
    renderPlayersList();
  });

  s.on('lobby:player_left', ({ id }) => {
    roomPlayers = roomPlayers.filter(p => p.id !== id);
    renderPlayersList();
  });

  s.on('lobby:agent_changed', ({ id, agentKey }) => {
    const p = roomPlayers.find(p => p.id === id);
    if (p) p.agentKey = agentKey;
    renderPlayersList();
  });

  s.on('lobby:ready_changed', ({ id, ready }) => {
    const p = roomPlayers.find(p => p.id === id);
    if (p) p.ready = ready;
    if (id === s.id && localPlayer) {
      localPlayer.ready = ready;
      applyReadyState(ready);
    }
    renderPlayersList();
  });

  s.on('lobby:host_changed', ({ newHostId }) => {
    roomPlayers.forEach(p => { p.isHost = p.id === newHostId; });
    if (localPlayer) localPlayer.isHost = localPlayer.id === newHostId;
    renderPlayersList();
  });

  s.on('lobby:error', ({ message }) => showLobbyError(message));

  s.on('game:countdown', ({ count }) => {
    const overlay = document.getElementById('countdown-overlay');
    const num     = document.getElementById('countdown-number');
    overlay.classList.remove('hidden');
    num.textContent = count;
    // Reiniciar animação CSS
    num.style.animation = 'none';
    void num.offsetWidth;   // forçar reflow
    num.style.animation = '';
  });

  s.on('game:start', (data) => {
    document.getElementById('countdown-overlay').classList.add('hidden');
    hideLobby();
    startGame(data);   // função existente no engine
  });
}
```

### 8.8 Utilitários de UI

```js
function showLobby()  { document.getElementById('lobby-screen').classList.add('active'); }
function hideLobby()  { document.getElementById('lobby-screen').classList.remove('active'); }

function showLobbyError(message) {
  const el = document.createElement('div');
  el.className = 'lobby-error';
  el.textContent = message;
  document.querySelector('.lobby-container').prepend(el);
  setTimeout(() => el.remove(), 3000);
}
```

---

## 9. Servidor — Node.js (Socket.io)

### 9.1 Estrutura da Room

```js
// rooms.js
const rooms = new Map();
/*
  Map<roomCode: string, {
    code:    string,
    state:   "lobby" | "countdown" | "in_game" | "ended",
    hostId:  string,
    players: Map<socketId, Player>
  }>
*/
```

### 9.2 Criar / Entrar

```js
function createRoom(socket, playerName) {
  const code = generateCode();
  const host = { id: socket.id, name: playerName, agentKey: 'fable', ready: false, isHost: true };
  rooms.set(code, { code, state: 'lobby', hostId: socket.id, players: new Map([[socket.id, host]]) });
  socket.join(code);
  socket.emit('lobby:state', { players: [host], roomCode: code });
}

function joinRoom(socket, playerName, code) {
  const room = rooms.get(code.toUpperCase());
  if (!room)                  return socket.emit('lobby:error', { message: 'Sala não encontrada' });
  if (room.state !== 'lobby') return socket.emit('lobby:error', { message: 'Partida já iniciada' });
  if (room.players.size >= 8) return socket.emit('lobby:error', { message: 'Sala cheia' });

  const player = { id: socket.id, name: playerName, agentKey: 'fable', ready: false, isHost: false };
  room.players.set(socket.id, player);
  socket.join(code);
  socket.emit('lobby:state', { players: getPlayersList(room), roomCode: code });
  socket.to(code).emit('lobby:player_joined', player);
}
```

### 9.3 Handlers dos Eventos

```js
socket.on('lobby:select_agent', ({ agentKey }) => {
  const room = getRoomBySocket(socket.id);
  const p    = room?.players.get(socket.id);
  if (!p || p.ready) return;
  if (!['fable','fate','foul'].includes(agentKey)) return;
  p.agentKey = agentKey;
  io.to(room.code).emit('lobby:agent_changed', { id: socket.id, agentKey });
});

socket.on('lobby:toggle_ready', ({ ready }) => {
  const room = getRoomBySocket(socket.id);
  const p    = room?.players.get(socket.id);
  if (!p) return;
  p.ready = Boolean(ready);
  io.to(room.code).emit('lobby:ready_changed', { id: socket.id, ready: p.ready });
});

socket.on('lobby:start', () => {
  const room = getRoomBySocket(socket.id);
  const p    = room?.players.get(socket.id);
  if (!p?.isHost) return;

  const players = getPlayersList(room);
  if (players.length < 4)           return socket.emit('lobby:error', { message: 'Mínimo 4 jogadores' });
  if (!players.every(p => p.ready)) return socket.emit('lobby:error', { message: 'Nem todos estão prontos' });

  room.state = 'countdown';
  startCountdown(room);
});

socket.on('disconnect', () => {
  const room = getRoomBySocket(socket.id);
  if (!room) return;
  room.players.delete(socket.id);
  io.to(room.code).emit('lobby:player_left', { id: socket.id });

  if (room.players.size === 0) { rooms.delete(room.code); return; }

  // Transferir host
  if (room.hostId === socket.id) {
    const newHost  = room.players.values().next().value;
    newHost.isHost = true;
    room.hostId    = newHost.id;
    io.to(room.code).emit('lobby:host_changed', { newHostId: newHost.id });
  }

  // Reset prontos se todos estavam prontos
  if (room.state === 'lobby' && [...room.players.values()].every(p => p.ready)) {
    room.players.forEach(p => { p.ready = false; });
    getPlayersList(room).forEach(p =>
      io.to(room.code).emit('lobby:ready_changed', { id: p.id, ready: false })
    );
  }
});
```

### 9.4 Countdown e Início

```js
function startCountdown(room) {
  let count = 3;
  io.to(room.code).emit('game:countdown', { count });
  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      io.to(room.code).emit('game:countdown', { count });
    } else {
      clearInterval(interval);
      room.state = 'in_game';
      io.to(room.code).emit('game:start', {
        spawnPoints: assignSpawnPoints(room),
        mapJson:     loadMap('Map_01')
      });
    }
  }, 1000);
}
```

### 9.5 Distribuição de Spawns

```js
function assignSpawnPoints(room) {
  const base    = loadMap('Map_01').spawnPoints.slice(0, 4);
  const players = [...room.players.values()].sort(() => Math.random() - 0.5);
  const result  = {};
  players.forEach((p, i) => {
    const spawn  = base[i % 4];
    const offset = i >= 4 ? { x: (Math.random()-.5)*60, y: (Math.random()-.5)*60 } : { x:0, y:0 };
    result[p.id] = { x: Math.round(spawn.x + offset.x), y: Math.round(spawn.y + offset.y) };
  });
  return result;
}
```

### 9.6 Utilitários do Servidor

```js
function getPlayersList(room) { return [...room.players.values()]; }

function getRoomBySocket(id) {
  for (const room of rooms.values())
    if (room.players.has(id)) return room;
  return null;
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1
  const code  = Array.from({length:5}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  return rooms.has(code) ? generateCode() : code;
}

function loadMap(name) {
  const { readFileSync } = require('fs');
  const { join }         = require('path');
  return JSON.parse(readFileSync(join(__dirname, 'maps', `${name}.json`), 'utf-8'));
}
```

---

## 10. Integração com o Motor do Jogo

1. Lobby e jogo partilham o **mesmo socket** — não há reconexão.
2. Ao receber `game:start`, a sequência é: `hideLobby()` → `startGame(data)`.
3. `startGame(data)` já existe no engine; recebe `{ spawnPoints, mapJson }`.
4. Se o jogador recarregar durante o lobby, o servidor deve emitir `lobby:state` ao reconectar.

---

## 11. Checklist de Implementação

### Servidor
- [ ] `generateCode()` — 5 chars únicos sem ambiguidade visual
- [ ] `createRoom()` — criar sala + emitir `lobby:state`
- [ ] `joinRoom()` — 3 validações + emitir estado completo
- [ ] `lobby:select_agent` — validar agentKey + broadcast
- [ ] `lobby:toggle_ready` — broadcast a todos
- [ ] `lobby:start` — validar host + 4 jogadores + todos prontos
- [ ] `disconnect` — remover + transferir host + reset ready
- [ ] `assignSpawnPoints()` — 4 fixos + offset para jogadores 5–8
- [ ] `loadMap()` — ler JSON do mapa do disco

### Cliente
- [ ] `initLobby()` — ligar eventos + botões
- [ ] `updateAgentDisplay()` — preview com fallback de cor
- [ ] `renderPlayersList()` — lista dinâmica + slots vazios
- [ ] `applyReadyState()` — estado visual + bloquear setas
- [ ] `refreshStartButton()` — visível só para host, ativo com ≥ 4 prontos
- [ ] Countdown overlay — reiniciar animação a cada número
- [ ] `showLobby()` / `hideLobby()`
- [ ] `showLobbyError()` — toast 3s com auto-remoção
