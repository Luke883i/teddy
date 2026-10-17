import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export class StateStore{
  constructor(home){
    this.dir=path.join(home,'data');fs.mkdirSync(this.dir,{recursive:true,mode:0o700});try{fs.chmodSync(this.dir,0o700)}catch{}
    this.path=path.join(this.dir,'teddy.sqlite');this.db=new DatabaseSync(this.path);try{fs.chmodSync(this.path,0o600)}catch{}
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=2500; PRAGMA trusted_schema=OFF; PRAGMA secure_delete=FAST;');
    this.migrate();this.migrateSemanticReceipts();this.migrateTextRequests();if(!this.getSetting('install_id'))this.setSetting('install_id',crypto.randomUUID());
  }
  migrate(){
    const v=Number(this.db.prepare('PRAGMA user_version').get().user_version||0);if(v>3)throw Error(`database_schema_too_new:${v}`);
    if(v<1){try{this.db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, started_at TEXT NOT NULL, ended_at TEXT);
      CREATE TABLE IF NOT EXISTS turns (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('user','assistant')), text TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(conversation_id) REFERENCES conversations(id));
      CREATE INDEX IF NOT EXISTS idx_turns_conversation ON turns(conversation_id,id);
      CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, salience REAL NOT NULL DEFAULT 0.5 CHECK(salience BETWEEN 0 AND 1), created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_memories_salience ON memories(salience DESC,id DESC);
      PRAGMA user_version=1; COMMIT;`)}catch(e){try{this.db.exec('ROLLBACK')}catch{};throw e}}
  }
  // V2 adds an append-only semantic receipt; it does not modify legacy turns.
  // The receipt is metadata, not a source of truth about the outside world.
  migrateSemanticReceipts(){
    const v=Number(this.db.prepare('PRAGMA user_version').get().user_version||0);
    if(v>=2)return;
    try{
      this.db.exec(`BEGIN IMMEDIATE;
        CREATE TABLE IF NOT EXISTS semantic_receipts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id TEXT NOT NULL,
          user_turn_id INTEGER NOT NULL,
          assistant_turn_id INTEGER NOT NULL,
          receipt_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY(conversation_id) REFERENCES conversations(id),
          FOREIGN KEY(user_turn_id) REFERENCES turns(id),
          FOREIGN KEY(assistant_turn_id) REFERENCES turns(id)
        );
        CREATE INDEX IF NOT EXISTS idx_semantic_conversation ON semantic_receipts(conversation_id,id);
        PRAGMA user_version=2;
        COMMIT;`);
    }catch(e){try{this.db.exec('ROLLBACK')}catch{};throw e}
  }
  migrateTextRequests(){
    const version=Number(this.db.prepare('PRAGMA user_version').get().user_version||0);
    if(version>=3)return;
    try{
      this.db.exec(`BEGIN IMMEDIATE;
        CREATE TABLE IF NOT EXISTS text_requests (
          request_id TEXT PRIMARY KEY,
          input_sha256 TEXT NOT NULL,
          requested_conversation_id TEXT,
          conversation_id TEXT NOT NULL REFERENCES conversations(id),
          assistant_turn_id INTEGER NOT NULL REFERENCES turns(id),
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_text_requests_conversation ON text_requests(conversation_id,created_at);
        PRAGMA user_version=3;
        COMMIT;`);
    }catch(error){try{this.db.exec('ROLLBACK')}catch{};throw error}
  }
  static validRequestId(id){
    return typeof id==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }
  // Replay returns the originally committed text, without calling the model again.
  // Reusing a key for different content or a different requested conversation is rejected.
  findTextRequest({requestId,text,conversationId=null}={}){
    if(!StateStore.validRequestId(requestId))throw Object.assign(new Error('text_request_id_invalid'),{code:'text_request_id_invalid',status:400});
    const row=this.db.prepare(`SELECT q.input_sha256, q.requested_conversation_id, q.conversation_id,
      t.text reply, s.receipt_json
      FROM text_requests q JOIN turns t ON t.id=q.assistant_turn_id
      JOIN semantic_receipts s ON s.assistant_turn_id=q.assistant_turn_id
      WHERE q.request_id=?`).get(requestId);
    if(!row)return null;
    const requested=typeof conversationId==='string'&&conversationId.trim()?conversationId:null;
    const digest=crypto.createHash('sha256').update(String(text??'')).digest('hex');
    if(row.input_sha256!==digest||(row.requested_conversation_id||null)!==requested)
      throw Object.assign(new Error('text_request_conflict'),{code:'text_request_conflict',status:409});
    const receipt=JSON.parse(row.receipt_json);
    return {conversationId:row.conversation_id,reply:row.reply,provider:receipt.provider,
      semantic:{act:receipt.act,path:receipt.path,schema:receipt.schema},requestId,replayed:true};
  }
  getSetting(key){const r=this.db.prepare('SELECT value FROM settings WHERE key=?').get(key);if(!r)return null;try{return JSON.parse(r.value)}catch{throw Error(`setting_corrupt:${key}`)}}
  setSetting(key,value){this.db.prepare('INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at').run(key,JSON.stringify(value),new Date().toISOString())}
  startConversation(){const id=crypto.randomUUID();this.db.prepare('INSERT INTO conversations(id,started_at) VALUES(?,?)').run(id,new Date().toISOString());return id}
  endConversation(id){this.db.prepare('UPDATE conversations SET ended_at=? WHERE id=?').run(new Date().toISOString(),id)}
  addTurn(conversationId,role,text){if(!['user','assistant'].includes(role)||typeof text!=='string'||!text.trim())return false;this.db.prepare('INSERT INTO turns(conversation_id,role,text,created_at) VALUES(?,?,?,?)').run(conversationId,role,text.slice(0,20000),new Date().toISOString());return true}
  conversationExists(id){
    return typeof id==='string'&&id.length<=128&&Boolean(this.db.prepare('SELECT id FROM conversations WHERE id=? AND ended_at IS NULL').get(id));
  }
  conversationHistory(id,limit=12){
    if(!this.conversationExists(id))return [];
    return this.db.prepare('SELECT t.id,t.role,t.text,t.created_at,t.conversation_id FROM turns t WHERE t.conversation_id=? ORDER BY t.id DESC LIMIT ?').all(id,Math.min(24,Math.max(1,Number(limit)||12))).reverse();
  }
  // All-or-nothing: even if SQLite fails between the two turns, nothing is shown as committed.
  commitTextTurn({conversationId=null,text,reply,receipt,requestId=null}={}){
    if(typeof text!=='string'||!text.trim()||typeof reply!=='string'||!reply.trim()
      ||!receipt||receipt.schema!=='teddy.semantic.v1')throw Object.assign(new Error('semantic_commit_invalid'),{code:'semantic_commit_invalid'});
    const existing=typeof conversationId==='string'&&conversationId.trim()?conversationId:null;
    if(requestId!==null){
      if(!StateStore.validRequestId(requestId))throw Object.assign(new Error('text_request_id_invalid'),{code:'text_request_id_invalid',status:400});
      if(this.findTextRequest({requestId,text,conversationId:existing}))
        throw Object.assign(new Error('text_request_already_committed'),{code:'text_request_already_committed',status:409});
    }
    if(existing&&!this.conversationExists(existing))throw Object.assign(new Error('conversation_not_found'),{code:'conversation_not_found',status:409});
    const id=existing||crypto.randomUUID();
    try{
      this.db.exec('BEGIN IMMEDIATE');
      if(!existing)this.db.prepare('INSERT INTO conversations(id,started_at) VALUES(?,?)').run(id,new Date().toISOString());
      const insert=this.db.prepare('INSERT INTO turns(conversation_id,role,text,created_at) VALUES(?,?,?,?)');
      const user=insert.run(id,'user',text.slice(0,20000),new Date().toISOString());
      const assistant=insert.run(id,'assistant',reply.slice(0,20000),new Date().toISOString());
      this.db.prepare('INSERT INTO semantic_receipts(conversation_id,user_turn_id,assistant_turn_id,receipt_json,created_at) VALUES(?,?,?,?,?)')
        .run(id,Number(user.lastInsertRowid),Number(assistant.lastInsertRowid),JSON.stringify(receipt),new Date().toISOString());
      if(requestId!==null){
        const digest=crypto.createHash('sha256').update(text).digest('hex');
        this.db.prepare('INSERT INTO text_requests(request_id,input_sha256,requested_conversation_id,conversation_id,assistant_turn_id,created_at) VALUES(?,?,?,?,?,?)')
          .run(requestId,digest,existing,id,Number(assistant.lastInsertRowid),new Date().toISOString());
      }
      this.db.exec('COMMIT');
      return id;
    }catch(e){try{this.db.exec('ROLLBACK')}catch{};throw e}
  }
  semanticReceipts(id){return this.db.prepare('SELECT receipt_json FROM semantic_receipts WHERE conversation_id=? ORDER BY id').all(id).map(r=>JSON.parse(r.receipt_json))}
  history(limit=100,beforeId=null){const count=Math.min(500,Math.max(1,Number(limit)||100)),cursor=Number(beforeId),base='SELECT t.id,t.role,t.text,t.created_at,c.id conversation_id FROM turns t JOIN conversations c ON c.id=t.conversation_id';return (Number.isSafeInteger(cursor)&&cursor>0?this.db.prepare(base+' WHERE t.id < ? ORDER BY t.id DESC LIMIT ?').all(cursor,count):this.db.prepare(base+' ORDER BY t.id DESC LIMIT ?').all(count)).reverse()}
  addMemory(text,salience=.5){const n=Number(salience),safe=Number.isFinite(n)?Math.min(1,Math.max(0,n)):.5;const r=this.db.prepare('INSERT INTO memories(text,salience,created_at) VALUES(?,?,?)').run(String(text).slice(0,4000),safe,new Date().toISOString());return Number(r.lastInsertRowid)}
  listMemories(limit=500){return this.db.prepare('SELECT id,text,salience,created_at FROM memories ORDER BY salience DESC,id DESC LIMIT ?').all(Math.min(500,Math.max(1,Number(limit)||500)))}
  deleteMemory(id){this.db.prepare('DELETE FROM memories WHERE id=?').run(Number(id))}
  quickCheck(){try{return this.db.prepare('PRAGMA quick_check').get().quick_check==='ok'}catch{return false}}
  close(){try{this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)')}catch{};this.db.close()}
}
