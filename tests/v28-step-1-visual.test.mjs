import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../web/styles.css',import.meta.url),'utf8');
test('step 1 / PR37: compositor retains an independent readable and accessible response',()=>{
 assert.match(html,/<section id="teddyBubble"[^>]*role="status"[^>]*aria-atomic="true"/);
 assert.match(html,/id="teddyBubbleText"/);assert.match(html,/id="bubbleReadAll"/);
 assert.match(css,/\.teddy-bubble p\{hyphens:auto;overflow-wrap:anywhere;/);
 assert.match(css,/@media \(max-height:480px\)/);
 assert.match(css,/\.teddy-bubble:focus-within/);
 const composer=html.slice(html.indexOf('<section id="chatPanel"'),html.indexOf('</section>',html.indexOf('<section id="chatPanel"')));
 assert.ok(!composer.includes('id="chatLog"'));
});
