import test from'node:test';import assert from'node:assert/strict';import{M4,compose}from'../web/teddy/math.js';
test('translate preserves orthogonal axes',()=>{assert.deepEqual(Array.from(M4.transformPoint(M4.translate(2,3,4),[1,1,1])).map(x=>+x.toFixed(6)),[3,4,5,1])});
test('translation composed with scale does not collapse depth',()=>{const m=compose(M4.translate(0,1,2),M4.scale(2,3,4));const a=M4.transformPoint(m,[0,0,1]),b=M4.transformPoint(m,[0,1,0]);assert.notEqual(a[1],b[1]);assert.equal(a[2],6);assert.equal(b[2],2)});
