import test from 'node:test';
import assert from 'node:assert/strict';
import {M4,compose,transformPoint} from '../web/teddy/math.js';
const close=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('3d translation preserves homogeneous axes and depth',()=>{
  const m=M4.translate(4,5,6),p=transformPoint(m,[1,2,3,1]);
  assert.deepEqual(p.map(x=>Math.round(x*1e6)/1e6),[5,7,9,1]);
  assert.equal(m[10],1);assert.equal(m[6],0);
});
test('translation composes after local scale without corrupting z',()=>{
  const m=compose(M4.translate(2,-1,-7),M4.scale(3,4,5));
  const p=transformPoint(m,[1,1,1,1]);close(p[0],5);close(p[1],3);close(p[2],-2);close(p[3],1);
});
test('perspective keeps distinct camera-space depths distinct',()=>{
  const p=M4.perspective(.62,1.4,.1,100),a=transformPoint(p,[0,0,-4,1]),b=transformPoint(p,[0,0,-8,1]);
  assert.notEqual(a[2]/a[3],b[2]/b[3]);assert.ok(Number.isFinite(a[2]/a[3]));
});
