export const WORLD_V8=Object.freeze({kind:'grounded-plush-studio',horizon:.58,stageRadius:4.2,parallax:.035});
export function installWorldScene(root=document.querySelector('#app')){
  if(!root||root.querySelector?.('#teddyWorld'))return root?.querySelector?.('#teddyWorld')||null;
  const world=document.createElement('div');world.id='teddyWorld';world.className='teddy-world';world.setAttribute('aria-hidden','true');
  world.innerHTML='<div class="world-horizon"></div><div class="world-prop world-prop-left"></div><div class="world-prop world-prop-right"></div>';
  const canvas=root.querySelector?.('#scene');root.insertBefore(world,canvas||root.firstChild);
  const onFrame=e=>{const d=e.detail||{},x=Number(d.world?.x)||0,z=Number(d.world?.z)||0,y=Number(d.world?.y)||0;world.style.setProperty('--world-x',`${(-x*42).toFixed(2)}px`);world.style.setProperty('--world-prop-x',`${(-x*14.7).toFixed(2)}px`);world.style.setProperty('--world-z',`${(z*18).toFixed(2)}px`);world.style.setProperty('--world-jump-y',`${(-y*1.28).toFixed(2)}px`);};
  globalThis.window?.addEventListener?.('teddy:motion-frame',onFrame);return world;
}
