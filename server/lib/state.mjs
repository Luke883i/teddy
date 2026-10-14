import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export class StateStore{
  constructor(home){
    this.dir=path.join(home,'data');fs.mkdirSync(this.dir,{recursive:true,mode:0o700});try{fs.chmodSync(this.dir,0o700)}catch{}
    this.path=path.join(this.dir,'teddy.sqlite');this.db=new DatabaseSync(this.path);try{fs.chmodSync(this.path,0o600)}catch{}
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=2500; PRAGMA trusted_schema=OFF; PRAGMA secure_delete=FAST;');
    this.migrate();if(!this.getSetting('install_id'))this.setSetting('install_id',crypto.randomUUID());
  }
  migrate(){
    const v=Number(this.db.prepare('PRAGMA user_version').get().user_version||0);if(v>1)throw Error(`database_schema_too_new:${v}`);
    if(v<1){try{this.db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, started_at TEXT NOT NULL, ended_at TEXT);
      CREATE TABLE IF NOT EXISTS turns (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('user','assistant')), text TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(conversation_id) REFERENCES conversations(id));
      CREATE INDEX IF NOT EXISTS idx_turns_conversation ON turns(conversation_id,id);
      CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, salience REAL NOT NULL DEFAULT 0.5 CHECK(salience BETWEEN 0 AND 1), created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_memories_salience ON memories(salience DESC,id DESC);
      PRAGMA user_version=1; COMMIT;`)}catch(e){try{this.db.exec('ROLLBACK')}catch{};throw e}}
  }
  getSetting(key){const r=this.db.prepare('SELECT value FROM settings WHERE key=?').get(key);if(!r)return null;try{return JSON.parse(r.value)}catch{throw Error(`setting_corrupt:${key}`)}}
  setSetting(key,value){this.db.prepare('INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at').run(key,JSON.stringify(value),new Date().toISOString())}
  startConversation(){const id=crypto.randomUUID();this.db.prepare('INSERT INTO conversations(id,started_at) VALUES(?,?)').run(id,new Date().toISOString());return id}
  endConversation(id){this.db.prepare('UPDATE conversations SET ended_at=? WHERE id=?').run(new Date().toISOString(),id)}
  addTurn(conversationId,role,text){if(!['user','assistant'].includes(role)||typeof text!=='string'||!text.trim())return false;this.db.prepare('INSERT INTO turns(conversation_id,role,text,created_at) VALUES(?,?,?,?)').run(conversationId,role,text.slice(0,20000),new Date().toISOString());return true}
  history(limit=100,beforeId=null){const count=Math.min(500,Math.max(1,Number(limit)||100)),cursor=Number(beforeId),base='SELECT t.id,t.role,t.text,t.created_at,c.id conversation_id FROM turns t JOIN conversations c ON c.id=t.conversation_id';return (Number.isSafeInteger(cursor)&&cursor>0?this.db.prepare(base+' WHERE t.id < ? ORDER BY t.id DESC LIMIT ?').all(cursor,count):this.db.prepare(base+' ORDER BY t.id DESC LIMIT ?').all(count)).reverse()}
  addMemory(text,salience=.5){const n=Number(salience),safe=Number.isFinite(n)?Math.min(1,Math.max(0,n)):.5;const r=this.db.prepare('INSERT INTO memories(text,salience,created_at) VALUES(?,?,?)').run(String(text).slice(0,4000),safe,new Date().toISOString());return Number(r.lastInsertRowid)}
  listMemories(limit=500){return this.db.prepare('SELECT id,text,salience,created_at FROM memories ORDER BY salience DESC,id DESC LIMIT ?').all(Math.min(500,Math.max(1,Number(limit)||500)))}
  deleteMemory(id){this.db.prepare('DELETE FROM memories WHERE id=?').run(Number(id))}
  quickCheck(){try{return this.db.prepare('PRAGMA quick_check').get().quick_check==='ok'}catch{return false}}
  close(){try{this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)')}catch{};this.db.close()}
}
