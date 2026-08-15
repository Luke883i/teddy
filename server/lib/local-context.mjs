import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';

export function resolveTeddyHome(env=process.env){return env.TEDDY_HOME||path.join(env.HOME||process.cwd(),'.teddy')}
export function readLocalContext(home=resolveTeddyHome(),{turnLimit=8,memoryLimit=6}={}){
  const dbPath=path.join(home,'data','teddy.sqlite');if(!fs.existsSync(dbPath))return {turns:[],memories:[]};let db;
  try{
    db=new DatabaseSync(dbPath);
    const turns=db.prepare('SELECT role,text,created_at FROM turns ORDER BY id DESC LIMIT ?').all(Math.min(16,Math.max(1,Number(turnLimit)||8))).reverse();
    const memories=db.prepare('SELECT id,text,salience,created_at FROM memories ORDER BY salience DESC,id DESC LIMIT ?').all(Math.min(12,Math.max(1,Number(memoryLimit)||6)));
    return {turns,memories};
  }catch{return {turns:[],memories:[]}}finally{try{db?.close()}catch{}}
}
