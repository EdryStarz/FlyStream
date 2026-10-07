import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
// Chromium's documented testing switch selects ONLY our isolated fixture tab.
// It never selects the user's desktop or any existing browser session.
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--auto-select-tab-capture-source-by-title=FlyStream isolated capture fixture']});
let result={passed:false};
try{
 const context=await browser.newContext({viewport:{width:1280,height:720}});
 const fixture=await context.newPage();await fixture.route('**/capture-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>FlyStream isolated capture fixture</title><style>body{margin:0;background:#222}div{width:120px;height:100vh;background:#ddd;animation:move 2s linear infinite alternate}@keyframes move{to{transform:translateX(900px)}}</style><div></div>'}));await fixture.goto('http://127.0.0.1:5173/capture-fixture');
 const app=await context.newPage();await app.goto('http://127.0.0.1:5173/science');await app.getByRole('button',{name:'Share tab',exact:true}).click();await app.getByText('LIVE CAPTURE',{exact:true}).waitFor({timeout:15000});await app.waitForTimeout(800);
 const samples=[];for(let i=0;i<5;i++){samples.push(await app.evaluate(()=>({label:document.querySelector('video').srcObject?.getVideoTracks()[0]?.label,settings:document.querySelector('video').srcObject?.getVideoTracks()[0]?.getSettings(),luminance:document.querySelector('.readouts strong').textContent,drive:document.querySelector('.activity-inspector strong').textContent})));await app.waitForTimeout(350);}
 assert.ok(samples.some(s=>s.drive!==samples[0].drive),'Captured input must change feature response');assert.equal(samples[0].settings.displaySurface,'browser');await app.getByRole('button',{name:'Sample',exact:true}).click();result={passed:true,source:'Isolated synthetic test tab, captured through native getDisplayMedia (no JS mock)',samples};
}catch(error){result={passed:false,error:String(error)};}finally{await browser.close();await fs.writeFile('docs/native-capture-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));}

