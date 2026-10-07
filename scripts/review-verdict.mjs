import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const findings={};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto('http://127.0.0.1:5173/science');await page.getByText(/6 VFB reconstructions/).waitFor();await page.waitForTimeout(1700);
 await page.getByRole('button',{name:'Pause processing',exact:true}).click();await page.getByLabel('Source timeline',{exact:true}).fill('0');await page.waitForTimeout(150);assert.equal(await page.locator('.activity-inspector strong').textContent(),'0.000');assert.equal(await page.locator('.timecode').textContent(),'00:00.0');findings.pausedSampleSeek='synchronized; baseline/trace reset';
 await page.getByRole('button',{name:'Parameters',exact:true}).click();await page.getByText(/^Sampling/).locator('input').fill('8');await page.waitForTimeout(100);const samples=await page.locator('.monitor:nth-child(2) .image-overlay').innerText();assert.ok(!samples.includes('405 samples'));await page.getByRole('button',{name:'Reset model',exact:true}).click();assert.match(await page.locator('.monitor:nth-child(2) .image-overlay').innerText(),/405 samples/);await page.getByRole('button',{name:'Parameters',exact:true}).click();findings.pausedParameters='updated immediately';
 await page.getByRole('checkbox',{name:'Show simulated activity'}).uncheck();assert.equal(await page.locator('.monitor:nth-child(3) .monitor-heading .classification').textContent(),'SOURCE');await page.getByRole('checkbox',{name:'Show simulated activity'}).check();findings.structuralClassification='SOURCE without overlay; SOURCE + INFERRED with overlay';
 const motionText=await page.locator('.motion-readout').innerText();for(const direction of ['right','left','up','down'])assert.ok(motionText.includes(`${direction} motion energy`));findings.motionLabels='four accessible direction names';
 await page.getByRole('button',{name:'Sample clip',exact:true}).click();await page.waitForTimeout(700);await page.getByRole('button',{name:'Pause processing',exact:true}).click();await page.getByLabel('Source timeline',{exact:true}).fill('2');await page.waitForTimeout(300);assert.equal(await page.locator('.timecode').textContent(),'00:02.0');assert.equal(await page.locator('.activity-inspector strong').textContent(),'0.000');findings.pausedVideoSeek='synchronized; numerical baseline reset';
 await page.getByRole('button',{name:'Sample',exact:true}).click();await page.waitForTimeout(2500);await page.screenshot({path:'.impeccable/review/desktop.png',fullPage:true});
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.getByRole('button',{name:'Evidence',exact:true}).click();
  await page.getByRole('button',{name:'Close evidence inspector'}).focus();await page.keyboard.press('Shift+Tab');assert.ok(await page.evaluate(()=>document.querySelector('.evidence-panel').contains(document.activeElement)));await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.querySelector('.evidence-panel').contains(document.activeElement)));assert.ok(await page.locator('main').evaluate(e=>e.inert));
  if(width===390)await page.screenshot({path:'.impeccable/review/mobile-evidence.png',fullPage:true});await page.keyboard.press('Escape');assert.ok(await page.getByRole('button',{name:'Evidence',exact:true}).evaluate(e=>e===document.activeElement));
  const targets=await page.locator('button:visible').evaluateAll(es=>es.map(e=>({text:e.getAttribute('aria-label')||e.textContent,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(e=>e.w<43.9||e.h<43.9));assert.equal(targets.length,0,JSON.stringify(targets));
  if(width===390)await page.screenshot({path:'.impeccable/review/mobile.png',fullPage:true});
 }
 findings.evidenceFocus='dialog contains Tab / Shift+Tab, background inert, Escape restores focus';findings.mobile='390 / 320 px without overflow; visible buttons >=44px';
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Kick player',exact:true}).click();await page.waitForTimeout(1800);await page.screenshot({path:'.impeccable/review/kick-capture-required.png',fullPage:true});
 console.log(JSON.stringify({passed:true,findings},null,2));await fs.writeFile('docs/review-verdict-results.json',JSON.stringify({date:new Date().toISOString(),passed:true,findings},null,2));
}finally{await browser.close();}

