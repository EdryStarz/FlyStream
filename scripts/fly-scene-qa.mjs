import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/science');await page.getByText('6 VFB reconstructions').waitFor();
 const scene=page.locator('.fly-scene'),canvas=page.locator('.fly-canvas canvas');await scene.scrollIntoViewIfNeeded();await page.waitForTimeout(900);
 assert.equal(await page.locator('canvas').count(),5);
 await scene.screenshot({path:'.impeccable/review/fly-desktop.png'});
 await page.getByRole('button',{name:'Screen view',exact:true}).click();await page.waitForTimeout(400);const moving=await canvas.screenshot();await page.waitForTimeout(650);assert.notDeepEqual(await canvas.screenshot(),moving);
 await page.getByRole('button',{name:'Pause processing',exact:true}).click();await scene.scrollIntoViewIfNeeded();await page.waitForTimeout(400);const paused=await canvas.screenshot();await page.waitForTimeout(400);assert.deepEqual(await canvas.screenshot(),paused);
 await canvas.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(350);assert.notDeepEqual(await canvas.screenshot(),paused);
 await page.getByRole('button',{name:'Fly close-up',exact:true}).click();await page.waitForTimeout(300);await scene.screenshot({path:'.impeccable/review/fly-closeup.png'});
 await page.getByRole('button',{name:'Kick player',exact:false}).click();await scene.scrollIntoViewIfNeeded();await page.waitForTimeout(400);assert.match(await page.locator('.fly-scene-tag').innerText(),/WAITING/);assert.equal(await page.locator('canvas').count(),3);
 await page.getByRole('button',{name:'Screen view',exact:true}).click();await page.waitForTimeout(200);await scene.screenshot({path:'.impeccable/review/fly-waiting.png'});
 await page.getByRole('button',{name:'Sample',exact:true}).click();await page.getByRole('button',{name:'Sample clip',exact:true}).click();await scene.scrollIntoViewIfNeeded();await page.waitForTimeout(600);assert.match(await page.locator('.fly-scene-tag').innerText(),/LOCAL VIDEO/);const video=await canvas.screenshot();await page.waitForTimeout(400);assert.notDeepEqual(await canvas.screenshot(),video);
 await page.evaluate(()=>{Object.defineProperty(navigator.mediaDevices,'getDisplayMedia',{configurable:true,value:async()=>{const c=document.createElement('canvas');c.width=768;c.height=432;const ctx=c.getContext('2d');window.fixturePaint=(color)=>{ctx.fillStyle=color;ctx.fillRect(0,0,768,432);};window.fixturePaint('#ffcc00');window.fixtureStream=c.captureStream(30);return window.fixtureStream;}});});
 await page.getByRole('button',{name:'Share Kick tab',exact:true}).click();await page.waitForTimeout(400);assert.match(await page.locator('.fly-scene-tag').innerText(),/SHARED VIDEO/);const capture=await canvas.screenshot();await page.evaluate(()=>window.fixturePaint('#0044cc'));await page.waitForTimeout(300);assert.notDeepEqual(await canvas.screenshot(),capture);
 await page.evaluate(()=>{window.fixtureStream.getTracks()[0].stop();window.fixtureStream.getTracks()[0].dispatchEvent(new Event('ended'));clearInterval(window.fixtureTimer);});await page.waitForTimeout(350);assert.match(await page.locator('.fly-scene-tag').innerText(),/WAITING/);
 await page.getByRole('button',{name:'Sample',exact:true}).click();
 const responsive=[];for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.getByRole('button',{name:'Whole desk',exact:true}).click();await scene.scrollIntoViewIfNeeded();await page.waitForTimeout(400);const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,buttons:[...document.querySelectorAll('.fly-scene button')].map(b=>({name:b.textContent||b.getAttribute('aria-label'),h:b.getBoundingClientRect().height,w:b.getBoundingClientRect().width}))}));assert.ok(layout.scroll<=layout.width);assert.ok(layout.buttons.every(b=>b.h>=44&&b.w>=44));responsive.push(layout);await scene.screenshot({path:`.impeccable/review/fly-mobile-${width}.png`});}
 assert.equal(errors.length,0,errors.join('\n'));await fs.writeFile('docs/fly-scene-results.json',JSON.stringify({at:new Date().toISOString(),passed:true,sourceTextureMoves:true,pauseFreezesTexture:true,keyboardOrbit:true,localVideoTexture:true,sharedFixtureTexture:true,captureEndClearsTexture:true,responsive,errors},null,2));console.log('Fly scene QA passed');
}finally{await browser.close();}


