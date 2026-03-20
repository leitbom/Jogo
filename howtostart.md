# 🎮 Iniciar o Servidor

> ⚠️ Usa sempre o **CMD** (não PowerShell)  
> Para abrir: `Win + R` → escreve `cmd` → Enter

---

## 1ª vez (instalar dependências)
```
cd C:\Users\chenr\Desktop\Jogo
npm install
```

---

## Sempre que queres jogar

**Janela CMD nº1 — Servidor:**
```
cd C:\Users\chenr\Desktop\Jogo
```
*(opcional, só se aparecer erro de porta ocupada)*
```
for /f "tokens=5" %a in ('netstat -ano ^| findstr :::3000') do taskkill /PID %a /F
```
```
npm run build
npm start
```
✅ Espera ver o banner `╔═══ Tactical Shooter...╗`

**Janela CMD nº2 — ngrok (para acesso pela internet):**
```
ngrok http 3000
```
✅ Copia o link `https://xxx.ngrok-free.app` e envia aos amigos

---

## Ordem no jogo

1. **Tu** → abre `http://localhost:3000` → clica **"Criar Sala"**
2. **Clica em "COPIAR LINK"** e envia aos amigos
3. **Cada amigo** → abre o link recebido → escolhe o agente → clica **"Pronto"**
4. **Cada jogador** → escolhe o agente → clica **"Pronto"**
5. **Tu** → clica **"Iniciar Partida"** *(mínimo 4 jogadores, todos Prontos)*

---

## Para fechar
- Janela do servidor → `Ctrl + C`
- Janela do ngrok → `Ctrl + C`

---

## Problemas comuns

| Erro | Solução |
|---|---|
| `npm` não reconhecido / bloqueado | Usa **CMD**, não PowerShell |
| `Cannot find dist/server/main.js` | Corre `npm run build` antes de `npm start` |
| Porta 3000 ocupada | `netstat -ano \| findstr :3000` → `taskkill /PID <número> /F` |
| ngrok: falha de autenticação | Cria conta em [ngrok.com](https://ngrok.com) → `ngrok config add-authtoken SEU_TOKEN` |
| Botão "Iniciar" bloqueado | Precisas de **4+ jogadores** e **todos com "Pronto"** activo |
