import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture(origin, check) {
  const directory = mkdtempSync(resolve(tmpdir(), 'bg-discovery-'));
  try {
    mkdirSync(resolve(directory, 'discovery')); mkdirSync(resolve(directory, 'out'));
    copyFileSync(new URL('./build.mjs', import.meta.url), resolve(directory, 'discovery/build.mjs'));
    writeFileSync(resolve(directory, 'discovery/content.json'), JSON.stringify({name:'Demo',packageName:'demo</script>',title:'Demo <script>alert(1)</script>',description:'A "quoted" description with $& and $$',output:'out',mainMetadata:true,sections:[{heading:'Usage',paragraphs:['<img src=x onerror=alert(1)>']}],links:[]}));
    writeFileSync(resolve(directory, 'out/index.html'), '<html><head><title>Old</title><meta name="description" content="old"></head><body>Demo</body></html>');
    const run=(site=origin)=>spawnSync(process.execPath,[resolve(directory,'discovery/build.mjs')],{env:{...process.env,SITE_ORIGIN:site},encoding:'utf8'});
    check(run, name=>readFileSync(resolve(directory,'out',name),'utf8'));
  } finally {
    if (!directory.startsWith(resolve(tmpdir(), 'bg-discovery-'))) throw new Error('Unexpected temporary test path');
    rmSync(directory,{recursive:true,force:true});
  }
}
test('public documentation escapes content and produces stable canonical URLs',()=>fixture('https://demo.example.com',(run,read)=>{
  assert.equal(run().status,0);
  assert.match(read('guide.html'),/Demo &lt;script&gt;/);
  assert.doesNotMatch(read('guide.html'),/<img src=x/);
  assert.match(read('index.html'),/with \$&amp; and \$\$/);
  const json = read('guide.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(json).name, 'demo</script>');
  assert.match(read('guide.html'),/canonical" href="https:\/\/demo.example.com\/guide.html/);
  assert.equal(run().status,0);
  assert.equal((read('index.html').match(/rel="canonical"/g)||[]).length,1);
  assert.equal((read('sitemap.xml').match(/<loc>/g)||[]).length,2);
}));
test('changing the origin removes stale sitemap hosts',()=>fixture('https://old.example.com',(run,read)=>{
  assert.equal(run().status,0);assert.equal(run('https://new.example.com').status,0);
  assert.doesNotMatch(read('sitemap.xml'),/old\.example/);
  assert.match(read('sitemap.xml'),/new\.example/);
}));
test('preview builds request noindex without inventing a domain',()=>fixture('',(run,read)=>{
  assert.equal(run().status,0);assert.match(read('guide.html'),/noindex,follow/);
  assert.doesNotMatch(read('guide.html'),/rel="canonical"/);assert.doesNotMatch(read('sitemap.xml'),/<loc>/);
}));
test('invalid public origins stop generation',()=>fixture('https://example.com/private',(run)=>assert.notEqual(run().status,0)));
