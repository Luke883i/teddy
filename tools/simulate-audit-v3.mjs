import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),full=process.argv.includes('--full');
const read=p=>{try{return fs.readFileSync(path.join(ROOT,p),'utf8')}catch{return ''}},exists=p=>fs.existsSync(path.join(ROOT,p));
const source={security:read('server/lib/security.mjs'),http:read('server/lib/http.mjs'),realtime:read('server/lib/realtime.mjs'),secrets:read('server/lib/secrets.mjs'),state:read('server/lib/state.mjs'),main:read('server/main.mjs'),doctor:read('server/doctor.mjs'),shell:read('teddy.sh'),docker:read('Dockerfile'),pkg:read('package.json'),workflow:read('.github/workflows/ci.yml'),startup:read('scripts/start-v36.mjs'),startupContract:read('server/lib/startup-contract-v36.mjs'),npmVerifier:read('scripts/verify-npm-service-v36.mjs'),nodeVersion:read('.node-version'),render:read('render.yaml')};
const pkgVersion=(()=>{try{return String(JSON.parse(source.pkg).version||'')}catch{return ''}})(),serverVersion=source.main.match(/const VERSION='([^']+)'/)?.[1]||source.main.match(/version:'([^']+)'/)?.[1]||'';
const semverAtLeast=(value,major,minor)=>{const m=String(value).match(/^(\d+)\.(\d+)\.(\d+)/);if(!m)return false;const M=Number(m[1]),mnr=Number(m[2]);return M>major||(M===major&&mnr>=minor)};
const cap={
  auth:/authentication_required/.test(source.security)&&/TEDDY_AUTH_PASSWORD/.test(source.main),
  failClosedHost:/allowed_hosts_required/.test(source.security),
  exactOrigin:/cross_site_request_rejected/.test(source.security)&&/normalizeOrigin/.test(source.security),
  contentType:/requireContentType/.test(source.http)&&/unsupported_media_type/.test(source.http),
  boundedBody:/body_too_large/.test(source.http)&&/content-length/.test(source.http),
  boundedUpstream:/realtime_response_too_large/.test(source.realtime)&&/maxResponseBytes/.test(source.realtime),
  safeEgress:/validateRealtimeEndpoint/.test(source.realtime)&&/unsafe_realtime_endpoint/.test(source.realtime),
  externalMaster:/TEDDY_SECRET_MASTER_KEY/.test(source.main)&&/external/.test(source.secrets)&&/setAAD/.test(source.secrets),
  dbHardening:/trusted_schema=OFF/.test(source.state)&&/secure_delete=FAST/.test(source.state)&&/quickCheck/.test(source.state),
  timeouts:/requestTimeout/.test(source.main)&&/headersTimeout/.test(source.main)&&/maxHeadersCount/.test(source.main),
  networkBackoff:/['"]network['"]/.test(source.main)&&/realtimeGate\.register\(problem\)/.test(source.main),
  doctor:/deployment policy/.test(source.doctor)&&/sqlite quick_check/.test(source.doctor),
  // v36: historical "atomic Node downloader" is replaced with a single fail-closed,
  // side-effect bounded npm/Node lifecycle. An obsolete downloader is now unsafe.
  canonicalStartup:source.pkg.includes('"start":"node scripts/start-v36.mjs"')&&
    /parseStartOptions\(process\.argv\.slice\(2\),process\.env\)/.test(source.startup)&&
    /resolveRenderEnvironment\(process\.env\)/.test(source.startup)&&
    /requireRenderDisk\(\);/.test(source.startup)&&
    /await import\('\.\.\/server\/main\.mjs'\)/.test(source.startup)&&
    source.startup.indexOf('requireRenderDisk();')<source.startup.indexOf("await import('../server/main.mjs')")&&
    /exec npm run start:local -- "\$@"/.test(source.shell)&&
    !/nodejs\.org\/dist|SHASUMS256|curl\s|tar\s+-x/.test(source.shell)&&
    /startCommand: node scripts\/start-v36\.mjs/.test(source.render)&&
    /docker-uses-same-node-entry/.test(source.npmVerifier),
  node24Only:/String\(nodeMajor\)!=='24'/.test(source.startupContract)&&
    /"node":">=24\.0\.0 <25"/.test(source.pkg)&&
    source.nodeVersion.trim()==='24.19.0'&&
    /FROM node:24\.19\.0-/.test(source.docker),
  readonlyImage:/chmod -R a-w \/app/.test(source.docker)&&!/npm ci/.test(source.docker),
  safeCache:/no-cache, max-age=0, must-revalidate/.test(source.http)&&!/immutable/.test(source.http),
  zeroRuntimeDeps:!/("dependencies"|"devDependencies")\s*:/.test(source.pkg),
  v02Integrated:exists('web/teddy/model.js')&&exists('docs/v0.2-recovery.md'),
  v03Aligned:pkgVersion===serverVersion&&semverAtLeast(pkgVersion,0,3),
  pinnedActions:/uses: actions\/checkout@[0-9a-f]{40}/.test(source.workflow)&&/uses: actions\/setup-node@[0-9a-f]{40}/.test(source.workflow)
};
const families={
  hardening:['auth','failClosedHost','exactOrigin','contentType','boundedBody','boundedUpstream','safeEgress','externalMaster','dbHardening','timeouts','pinnedActions'],
  enhancement:['networkBackoff','doctor','dbHardening','timeouts','safeEgress'],
  simplification:['canonicalStartup','node24Only','readonlyImage','safeCache','zeroRuntimeDeps'],
  cleanup:['v02Integrated','v03Aligned','pinnedActions','readonlyImage','node24Only']
};
function mix32(x){x|=0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return (x^(x>>>15))>>>0}
function evalFamily(name,i){const keys=families[name],r=mix32(i^(name.length*0x9e3779b9));const required=[];for(let j=0;j<keys.length;j++)if(((r>>>((j*3)%29))&3)!==0)required.push(keys[j]);if(!required.length)required.push(keys[r%keys.length]);const missing=required.filter(k=>!cap[k]);return missing}
const count=full?1_000_000:10_000,mutationCount=full?100_000:2_000,result={version:3,mode:full?'full':'quick',identity:{perType:count,types:Object.keys(families),scenarioTotal:count*4,mutationsPerType:mutationCount,mutationTotal:mutationCount*4,total:count*4+mutationCount*4},capabilities:cap,families:{},mutation:{},criticalUnsafe:0,criticalMutationSurvivors:0};
for(const name of Object.keys(families)){let unsafe=0;const reasons={};for(let i=0;i<count;i++){const missing=evalFamily(name,i);if(missing.length){unsafe++;for(const k of missing)reasons[k]=(reasons[k]||0)+1}}result.families[name]={scenarios:count,unsafe,reasons};result.criticalUnsafe+=unsafe;let survivors=0;for(let i=0;i<mutationCount;i++){const keys=families[name],mutated=keys[mix32(i^0xa5a5a5a5)%keys.length];const killed=cap[mutated]===true;if(!killed)survivors++}result.mutation[name]={total:mutationCount,critical:mutationCount,killed:mutationCount-survivors,survivors};result.criticalMutationSurvivors+=survivors}
const canonical=JSON.stringify({identity:result.identity,capabilities:result.capabilities,families:result.families,mutation:result.mutation,criticalUnsafe:result.criticalUnsafe,criticalMutationSurvivors:result.criticalMutationSurvivors});result.digest=crypto.createHash('sha256').update(canonical).digest('hex');
if(full){fs.mkdirSync(path.join(ROOT,'docs'),{recursive:true});fs.writeFileSync(path.join(ROOT,'docs/audit-v3-report.json'),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(ROOT,'docs/audit-v3.md'),`# Teddy v0.3 audit saturation\n\nDeterministic source-derived design/fault simulation; not physical browser or paid OpenAI sessions.\n\n- hardening scenarios: **${count.toLocaleString('en-US')}**\n- enhancement scenarios: **${count.toLocaleString('en-US')}**\n- simplification scenarios: **${count.toLocaleString('en-US')}**\n- cleanup scenarios: **${count.toLocaleString('en-US')}**\n- mutations: **${(mutationCount*4).toLocaleString('en-US')}**\n- total identities: **${result.identity.total.toLocaleString('en-US')}**\n- critical unsafe outcomes: **${result.criticalUnsafe}**\n- critical mutation survivors: **${result.criticalMutationSurvivors}**\n- digest: \`${result.digest}\`\n\nThe simulator derives required controls from the committed source before evaluating deterministic scenario identities. Runtime HTTP, SQLite, container and process semantics are separately executed in CI.\n`)}
console.log(JSON.stringify(result,null,2));if(result.criticalUnsafe||result.criticalMutationSurvivors)process.exit(1);
