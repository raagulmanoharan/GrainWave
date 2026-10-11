import {scales} from './music.js';

// A camera gesture articulates a note; this grammar supplies a repeatable phrase.
// Negative gestureDirection means upward screen travel and requests ascending pitch.
export class PhraseComposer {
  constructor({seed=0}={}) { this.seed=Math.trunc(seed)||0; this.reset(); }
  reset() { this.index=0; this.previous=null; this.motif=[]; this.scale=null; }
  compose(note,{scale='minor',sounding=[],flowing=false}={}) {
    if(!note)return null;
    const intervals=scales[scale]||scales.minor;
    const key=scales[scale]?scale:'minor';
    if(this.scale!==key){this.reset();this.scale=key;}
    const pitches=[];
    for(let midi=69;midi<=81;midi++)if(intervals.includes((midi-69)%12))pitches.push(midi);
    const position=this.index%4,section=Math.floor(this.index/4)%4;
    const sectionName=['A','A′','B','A'][section];
    const anchor=position===0||position===3;
    const chord=pitches.filter(p=>[0,intervals.includes(3)?3:4,7].includes((p-69)%12));
    const y=Math.max(0,Math.min(1,note.point?.y??.5));
    const register=69+(1-y)*12;
    const direction=-Math.sign(Math.abs(note.point?.gestureDirection||0)>.0005?note.point.gestureDirection:0)||(flowing?[1,1,-1,-1][position]:0);
    let target=this.previous===null?register:this.previous+direction*2;
    if(section!==0&&this.motif[position]!==undefined){
      target=this.motif[position];
      if(section===1&&position===1)target+=((this.seed&1)?-1:1)*2;
      if(section===2)target=150-target;
      target+=direction*2;
    }
    if(position===3)target=69+Math.round((register-69)/12)*12;
    let candidates=pitches.filter(p=>this.previous===null||Math.abs(p-this.previous)<=5);
    if(anchor){const stable=candidates.filter(p=>chord.includes(p));if(stable.length)candidates=stable;}
    const soundingMidi=sounding.map(n=>typeof n==='number'?n:n?.midi).filter(Number.isFinite);
    const clash=p=>soundingMidi.reduce((sum,q)=>{
      const distance=Math.abs(p-q)%12;
      return sum+([1,11].includes(distance)?40:[2,10].includes(distance)?8:0);
    },0);
    const score=p=>clash(p)+Math.abs(p-target)*1.7+Math.abs(p-register)*.12+
      (this.previous===null?0:Math.abs(p-this.previous)*.25)+
      (direction&&this.previous!==null&&(p-this.previous)*direction<0?2:0);
    candidates.sort((a,b)=>score(a)-score(b)||a-b);
    const midi=candidates[0];
    if(section===0)this.motif[position]=midi;
    this.previous=midi;
    this.index++;
    const velocity=Math.max(.12,Math.min(.48,(note.velocity??.3)*(position===0?1.08:position===3?.82:.94)));
    return {...note,midi,velocity,phrase:{section:sectionName,position,index:this.index-1,cadence:position===3}};
  }
}

// Motion is a clock input; pitch belongs to a stable, composed phrase.
const degrees=[0,3,5,7,10];
export const degreePitch=d=>57+12*Math.floor(d/5)+degrees[((d%5)+5)%5];
export class PhraseSong {
 constructor(random=Math.random){
  this.random=random;this.lastMutation=-1;
  const choose=a=>a[Math.floor(random()*a.length)];
  const a=choose([[0,2,3,2],[0,1,2,1],[2,3,4,3]]),b=choose([[1,2,1,0],[3,2,1,2],[2,4,3,2]]);
  this.phrase=[...a,...a.slice(0,3),1,...b,2,1,1,0];
  this.index=0;this.transpose=0;this.seeded=false;this.lastTrigger=-Infinity;this.lastMotion=-Infinity;this.loopOrigin=null;this.build=0;this.lastAdvance=null;this.triggers=[];
 }
 trigger(y,time){
  if(time-this.lastTrigger<85)return null;
  // Change register only at phrase boundaries, never scramble a phrase mid-flight.
  if(this.index%16===0)this.transpose=y<.3?2:y>.7?-2:0;
  const midi=degreePitch(this.phrase[this.index%16]+this.transpose);
  this.triggers.push(time);this.triggers=this.triggers.filter(t=>time-t<800);this.index++;this.seeded=true;this.lastTrigger=time;this.lastMotion=time;this.loopOrigin=null;return midi;
 }
 advance(time,energy,sources=0){
  const dt=this.lastAdvance===null?0:Math.min(.1,Math.max(0,(time-this.lastAdvance)/1000));this.lastAdvance=time;
  const rate=this.triggers.filter(t=>time-t<800).length/8;
  const target=energy>.02?Math.min(1,energy*.65+Math.max(0,sources-1)*.12+rate*.35):0;
  this.build+=(target-this.build)*(1-Math.exp(-dt/(target>this.build?1.1:2.4)));
  return this.build;
 }
 embellish(midi,bpm){
  if(this.build<.28)return [];
  const degree=this.phrase[(this.index-1+16)%16]+this.transpose,interval=60/bpm/4;
  // Diatonic upper voices unfold into a rising sweep; lower energy gives one echo.
  const voices=this.build>.7?[0,2,4,5]:this.build>.48?[0,2,4]:[0];
  return voices.map((d,i)=>({type:'tone',kind:'pulse',role:'backing',midi:d?degreePitch(degree+d):midi,offset:interval*(i+1),duration:.12+i*.015,level:(.028+this.build*.027)*(1-i*.14),noise:.1,pan:(i%2?1:-1)*.25}));
 }
 mutate(step){
  if(!this.seeded||step<32||step%32!==0||step===this.lastMutation)return;
  this.lastMutation=step;
  const candidates=[1,2,5,6,9,10,12,13],start=Math.floor(this.random()*candidates.length);
  for(let n=0;n<2;n++){
   const index=candidates[(start+n*3)%candidates.length],old=this.phrase[index];
   const options=[old-1,old+1].filter(d=>d>=0&&d<=5&&Math.abs(d-this.phrase[index-1])<=3&&Math.abs(d-this.phrase[index+1])<=3);
   if(options.length)this.phrase[index]=options[Math.floor(this.random()*options.length)];
  }
  this.phrase[15]=0; // Keep the cadence, and most of the motif, recognizable.
 }
 events(step,energy,{loop=false,bpm=172}={}){
  this.mutate(step);
  const i=step%16,bar=Math.floor(step/16)%4,events=[],b=this.build;
  const hit=(kind,level,duration,offset=0)=>events.push({type:'percussion',kind,freq:kind==='kick'?52:kind==='snare'?185:6500,level,duration,offset,role:'drums'});
  // The clock never disappears. Activity opens the break without changing its timing.
  hit('hat',(.009+b*.026)*(i%4===0?1:.7),i%4===2?.042:.024);
  if(!this.seeded)return events;
  if(b>.08){
   if([[0,10],[0,7,10],[0,3,10],[0,6,11]][bar].includes(i))hit('kick',.07+b*.17,.18);
   if(i===4||i===12)hit('snare',.045+b*.12,.12);
   if(b>.35&&[[6],[3,15],[7,14],[2,10,15]][bar].includes(i))hit('snare',.018+b*.025,.055);
   if(b>.6&&[[14],[6],[13],[7,14]][bar].includes(i))hit('kick',.085+b*.07,.09);
   if(b>.72&&bar===3&&(i===11||i===15))hit('snare',.055,.045,60/bpm/8);
   if(i===0||i===10)events.push({type:'tone',kind:'bass',midi:degreePitch(this.transpose)-12,level:.025+b*.065,duration:.14,role:'backing'});
  }
  if(loop){
   if(this.loopOrigin===null)this.loopOrigin=step;
   const offset=step-this.loopOrigin;
   if(offset%2===0)events.push({type:'tone',kind:'bell',midi:degreePitch(this.phrase[Math.floor(offset/2)%16]+this.transpose),level:.115,duration:.22,role:'lead',pan:0});
  }else this.loopOrigin=null;
  return events;
 }
}
