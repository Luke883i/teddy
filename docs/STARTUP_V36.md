# Teddy v36 — Contratto standard di avvio

**Runtime**: Node.js **24.x**, npm. Teddy è un server HTTP Node con persistenza SQLite e, quando abilitato, installazione del modello locale verificato. Non è un'app Python, né serve un wrapper Bash per Render.

## Avvio locale (macOS, Linux, Windows)

```bash
node --version                 # v24.x richiesto
npm ci --ignore-scripts
npm run doctor
npm start                      # http://127.0.0.1:8787
```

Per aprire automaticamente il browser dove disponibile: `npm run start:local`. Il server resta in primo piano, usa `SIGINT`/`SIGTERM` per chiudere correttamente SQLite e non apre un secondo processo server. Il browser è solo una comodità, non il processo applicativo.

Varianti supportate: `npm start -- --port=8989`, `npm start -- --no-install`, `npm start -- --doctor`, `npm start -- --help`. `npm run doctor` continua a funzionare. La prima installazione del GGUF richiede rete; `/api/health` è liveness, **non** disponibilità del modello. Il modello deve raggiungere `/api/ready`, altrimenti le domande aperte non sono garantite.

## Render

Il Blueprint `render.yaml` usa **`startCommand: npm start`**, lo stesso entrypoint usato in locale. Se Render imposta `RENDER=true`, il launcher esegue il preflight di sicurezza esistente di v35 prima di importare `server/main.mjs`: HTTPS pubblico, password Basic, chiave master, `PORT`, Node 24, disco scrivibile montato su `/var/data`, provider consentito, niente voce. Le opzioni locali, compreso `--open`, sono rifiutate in modalità Render. `npm run start:render` è un alias esplicito di compatibilità con la stessa logica. Per il deploy vero e proprio e i costi vedere [RENDER_V35.md](RENDER_V35.md).

I segreti restano nell'ambiente Render, mai in Git. **Render Live non significa Qwen ready**. Non dichiarare un deploy cloud certificato fino al canary remoto con SHA e `REQUIRE_MODEL_READY=1`.

## Migrazione da teddy.sh

`./teddy.sh` resta temporaneamente come shim deprecato: delega a `npm run start:local -- ...`. Le opzioni storiche `--no-open`, `--no-install`, `--doctor`, `--port=N` e `--help` continuano a essere inoltrate. Nessuna seconda implementazione della sicurezza o del server sopravvive nel wrapper.

**Cambiamento esplicito**: lo script Bash non scarica più automaticamente una distribuzione Node. Installare **Node 24 + npm** prima di eseguire Teddy. Il gestore ufficiale scelto dall'utente (nvm, fnm, volta, installer Node) può configurare la versione; non vengono più scaricati archivi Node a runtime come prerequisito per `npm start`.

## Contratti e prove

La PR v36 falsifica separatamente il parser delle opzioni, il controllo Node24, il Render preflight, gli script npm, la deprecazione del wrapper e l'avvio reale locale/Render. Il test d'integrazione avvia **npm start** e verifica HTTP, sicurezza e SQLite dopo un riavvio. I test offline non dimostrano prestazioni Qwen né disponibilità effettiva su un account Render.

Sequenza di diagnosi: `node --version` → `npm ci --ignore-scripts` → `npm run doctor` → `npm start` → `GET /api/health` → `GET /api/ready` se disponibile. Se il deployment usa un URL pubblico, rispettare il controllo Host e l'autenticazione; non esporre HTTP Basic senza TLS.
