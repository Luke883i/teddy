// v36: pure, platform-neutral npm startup contract. No downloads or side effects.
export class StartupArgumentError extends Error{
 constructor(code,detail=''){super(code+(detail?':'+detail:''));this.name='StartupArgumentError';this.code=code;this.exitCode=2}
}
const validPort=value=>/^[1-9][0-9]{0,4}$/.test(String(value))&&Number(value)<=65535;
export const START_HELP=[
 'Teddy (Node.js 24) — avvio standard',
 '  npm start                       Server locale, senza aprire il browser',
 '  npm run start:local             Server locale e browser (se disponibile)',
 '  npm start -- --port=8787        Porta locale personalizzata',
 '  npm start -- --no-install       Non installare il modello locale',
 '  npm run doctor                  Diagnostica di ambiente e database',
 '  npm start -- --help             Questa guida',
 '  npm start                       Su Render usa automaticamente il preflight sicuro',
 '  ./teddy.sh                      Compatibilità temporanea (deprecato)'
].join('\n');
export function parseStartOptions(argv=[],env={},nodeMajor=process.versions.node.split('.')[0]){
 if(String(nodeMajor)!=='24')throw new StartupArgumentError('TEDDY_NODE24_REQUIRED','Install Node.js 24.x before running npm start');
 const render=env.RENDER==='true';
 let open=false,doctor=false,help=false,noInstall=false,port=null;
 for(const arg of argv){
  if(arg==='--help'||arg==='-h'){help=true;continue}
  if(arg==='--open'){open=true;continue}
  if(arg==='--no-open'){open=false;continue}
  if(arg==='--doctor'){doctor=true;continue}
  if(arg==='--no-install'){noInstall=true;continue}
  if(/^--port=/.test(arg)){
   const value=arg.slice('--port='.length);
   if(!validPort(value))throw new StartupArgumentError('TEDDY_INVALID_PORT');
   port=value;continue
  }
  throw new StartupArgumentError('TEDDY_UNKNOWN_OPTION',String(arg).slice(0,70));
 }
 if(render&&!help&&(open||doctor||noInstall||port!==null))
  throw new StartupArgumentError('TEDDY_RENDER_OPTIONS_FORBIDDEN','Render is configured by the Blueprint and environment');
 const desired=port??env.TEDDY_PORT??'8787';
 if(!help&&!render&&!validPort(desired))throw new StartupArgumentError('TEDDY_INVALID_PORT');
 return Object.freeze({schema:'teddy.start.v36',mode:help?'help':doctor?'doctor':'serve',
  platform:render?'render':'local',port:render?null:String(desired),
  openBrowser:!render&&open&&!doctor,disableAutoInstall:noInstall,expectsModelReadiness:false});
}
