import test from 'node:test';import assert from 'node:assert/strict';import {buildInstructions} from '../server/lib/config.mjs';
const cfg={language:'it-IT',persona:{irritability:.55,warmth:.5,wit:.7,verbosity:.2}};
test('voice instructions optimize for spoken cadence without stage directions',()=>{const s=buildInstructions(cfg);assert.match(s,/ritmo naturale/);assert.match(s,/intonazione espressiva/);assert.match(s,/markdown pronunciato/);assert.match(s,/interruzioni/);});
