import {GrainProcessor} from './grain-process.js';
const slides=[
 {title:'Nothing to play?\nLook around.',body:'A bird. A passing car. Your own hand. Point your camera at something moving and hear what happens. No musical bones required.',alt:'Dithered birds crossing a dark sky'},
 {title:'That was nice.\nKeep it.',body:'Found a little tune in the traffic? Tap KEEP. That moment goes round while you look for the next. Rush hour, considerably improved.',alt:'Dithered overhead traffic with long light trails'},
 {title:'One more thing.\nThen another.',body:'Tap + to make new notes over your first loop. KEEP the ones you like. Up to four little worlds, turning together. No lessons. Just looking.',alt:'A dithered hand leaving overlapping ghost trails'}
];
const key='relief-tour-v1';
export class Onboarding{
 constructor({onOpen,onFinish}){this.onOpen=onOpen;this.onFinish=onFinish;this.panel=document.getElementById('onboarding');this.index=0;this.active=false;this.art=new Image();this.art.src='onboarding/scenes.png';this.art.onload=()=>this.drawImage();this.seen=false;try{this.seen=localStorage.getItem(key)==='done'}catch{}
 document.getElementById('tour-next').onclick=()=>this.index===2?this.finish():this.show(this.index+1);
 document.getElementById('tour-back').onclick=()=>this.show(this.index-1);
 document.getElementById('tour-skip').onclick=()=>this.finish();
 document.getElementById('tour-close').onclick=()=>this.finish();
 document.addEventListener('keydown',e=>{if(!this.active)return;if(e.key==='ArrowRight'){e.preventDefault();document.getElementById('tour-next').click()}if(e.key==='ArrowLeft'&&this.index){e.preventDefault();this.show(this.index-1)}if(e.key==='Escape')this.finish()});
 }
 open(){if(this.active)return;this.active=true;document.body.dataset.onboarding='true';this.panel.hidden=false;this.onOpen();this.show(0)}
 drawImage(){if(!this.art.complete||!this.art.naturalWidth)return;const host=document.getElementById('tour-image');let canvas=host.querySelector('canvas');if(!canvas){canvas=document.createElement('canvas');host.append(canvas)}const w=640,h=640;canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.drawImage(this.art,this.index*this.art.naturalWidth/3,0,this.art.naturalWidth/3,this.art.naturalHeight,0,0,w,h);const frame=ctx.getImageData(0,0,w,h);new GrainProcessor().process({data:frame.data,width:w,height:h,drive:.8,settled:.3,threshold:.48,playing:true,boxes:[{x:0,y:0,w:1,h:1}]});ctx.putImageData(frame,0,0)}
 show(index){this.index=Math.max(0,Math.min(2,index));this.drawImage();const slide=slides[this.index];document.getElementById('tour-title').textContent=slide.title;document.getElementById('tour-copy').textContent=slide.body;const image=document.getElementById('tour-image');image.style.backgroundPosition=`${this.index*50}% center`;image.setAttribute('aria-label',slide.alt);document.getElementById('tour-count').textContent=`0${this.index+1} / 03`;document.getElementById('tour-back').disabled=this.index===0;document.getElementById('tour-next').textContent=this.index===2?'GO':'→';document.getElementById('tour-next').setAttribute('aria-label',this.index===2?'Start making music':'Next introduction slide');document.getElementById('tour-title').focus({preventScroll:true})}
 async finish(){if(this.finishing)return;this.finishing=true;const started=await this.onFinish();this.finishing=false;if(!started)return;this.seen=true;try{localStorage.setItem(key,'done')}catch{}this.active=false;delete document.body.dataset.onboarding;this.panel.hidden=true;document.getElementById('cloud').focus({preventScroll:true})}
}
