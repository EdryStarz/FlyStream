import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:5173/control');
 await page.getByRole('heading',{name:'Live',exact:true}).waitFor();
 await page.waitForTimeout(700);
 await page.screenshot({path:'.impeccable/review/control-desktop.png',fullPage:true});
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});await page.waitForTimeout(350);
  const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,nav:[...document.querySelectorAll('.control-nav button')].map(b=>({width:b.clientWidth,scroll:b.scrollWidth})),transport:[...document.querySelectorAll('.operator-transport button')].map(b=>({width:b.clientWidth,scroll:b.scrollWidth,height:b.getBoundingClientRect().height}))}));
  assert.equal(geometry.overflow,false);assert.ok(geometry.nav.every(b=>b.scroll<=b.width));assert.ok(geometry.transport.every(b=>b.scroll<=b.width&&b.height>=44));
  await page.screenshot({path:`.impeccable/review/control-mobile-${width}.png`,fullPage:true});console.log('PASS readable navigation and 44px transport',width);
 }
 const output=await browser.newPage({viewport:{width:1920,height:1080}});await output.goto('http://127.0.0.1:5173/stream?audio=0');await output.locator('video').evaluate(v=>new Promise(resolve=>{if(v.readyState>=2&&!v.paused)resolve();else v.addEventListener('playing',resolve,{once:true});}));await output.waitForTimeout(1200);await output.screenshot({path:'.impeccable/review/stream-desktop.png'});
}finally{await browser.close();}

