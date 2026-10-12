import {Headphones} from './headphones.js?v=quiet-art-1';
const key='relief-tour-v1';
export class Onboarding{
 constructor({onOpen,onFinish}){this.onOpen=onOpen;this.onFinish=onFinish;this.panel=document.getElementById('onboarding');this.fontsReady=Promise.all([document.fonts.load('600 32px ReliefCondensed'),document.fonts.load('400 16px ReliefPixel')]).catch(()=>{});this.active=false;this.headphones=new Headphones(document.getElementById('tour-image'));this.seen=false;try{this.seen=localStorage.getItem(key)==='done'}catch{}
 document.getElementById('tour-next').onclick=()=>this.finish();
 document.getElementById('tour-back').hidden=true;document.getElementById('tour-count').hidden=true;
 document.getElementById('tour-close').onclick=()=>this.finish();
 document.addEventListener('keydown',e=>{if(this.active&&e.key==='Escape')this.finish()});
 }
 async open(){if(this.active)return;this.active=true;await this.fontsReady;document.body.dataset.onboarding='true';this.panel.classList.remove('closing');this.panel.hidden=false;this.onOpen();this.show()}
 show(){document.getElementById('tour-title').textContent='Headphones\nrecommended.';document.getElementById('tour-copy').textContent='Put on headphones and let the everyday become a little unfamiliar.\n\nHold your camera steady. Moving hands, passing traffic, or birds in the sky will play the melody. Movement near the top plays higher notes; near the bottom, lower ones.\n\nHear something you like? Tap KEEP to loop the last phrase, just as it happened. Keep exploring and add up to four loops.';document.getElementById('tour-image').setAttribute('aria-label','Dithered EarPods with flowers growing along their stems');document.getElementById('tour-next').textContent='GO';document.getElementById('tour-next').setAttribute('aria-label','Start making music');this.headphones.start();document.getElementById('tour-title').focus({preventScroll:true})}
 async finish(){if(this.finishing)return;this.finishing=true;const started=await this.onFinish();if(!started){this.finishing=false;return}this.seen=true;try{localStorage.setItem(key,'done')}catch{}this.panel.classList.add('closing');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>setTimeout(resolve,240));this.headphones.stop();this.active=false;delete document.body.dataset.onboarding;this.panel.hidden=true;this.panel.classList.remove('closing');this.finishing=false;document.getElementById('cloud').focus({preventScroll:true})}
}
