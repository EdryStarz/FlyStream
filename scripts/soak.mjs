import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/science');await page.getByText(/6 VFB reconstructions/).waitFor();
 const cdp=await page.context().newCDPSession(page);const readings=[];
 async function sample(label){await cdp.send('HeapProfiler.collectGarbage');readings.push({label,...await cdp.send('Runtime.getHeapUsage'),...await page.evaluate(()=>({canvases:document.querySelectorAll('canvas').length,performance:document.querySelector('.performance').textContent}))});}
 await page.waitForTimeout(3000);await sample('baseline');
 for(let i=1;i<=9;i++){await page.waitForTimeout(20000);await sample(`${i*20}s`);if(i%3===0){await page.getByRole('button',{name:'Sample clip',exact:true}).click();await page.waitForTimeout(500);await page.getByRole('button',{name:'Sample',exact:true}).click();}}
 await page.waitForTimeout(1000);await sample('after source switches');
 const growth=readings.at(-1).usedSize-readings[0].usedSize;assert.ok(growth<10*1024*1024,`Retained JS heap grew by ${growth}`);assert.ok(readings.every(x=>x.canvases===5));assert.equal(errors.length,0);
 await fs.writeFile('docs/soak-results.json',JSON.stringify({date:new Date().toISOString(),durationSeconds:180,gcControlled:true,retainedHeapGrowth: growth,errors,readings},null,2));console.log(JSON.stringify({passed:true,retainedHeapGrowth:growth,readings:readings.length}));
}finally{await browser.close();}


