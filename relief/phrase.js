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
  const choose=a=>a[Math.floor(random()*a.length)];
  const a=choose([[0,2,3,2],[0,1,2,1],[2,3,4,3]]),b=choose([[1,2,1,0],[3,2,1,2],[2,4,3,2]]);
  this.phrase=[...a,...a.slice(0,3),1,...b,2,1,1,0];
  this.index=0;this.transpose=0;this.seeded=false;this.lastTrigger=-Infinity;this.lastMotion=-Infinity;this.loopOrigin=null;
 }
 trigger(y,time){
  if(time-this.lastTrigger<85)return null;
  // Change register only at phrase boundaries, never scramble a phrase mid-flight.
  if(this.index%16===0)this.transpose=y<.3?2:y>.7?-2:0;
  const midi=degreePitch(this.phrase[this.index%16]+this.transpose);
  this.index++;this.seeded=true;this.lastTrigger=time;this.lastMotion=time;this.loopOrigin=null;return midi;
 }
 events(step,energy,{loop=false}={}){
  if(!this.seeded)return [];
  if(energy<=.02&&!loop)return [];
  const i=step%16,bar=Math.floor(step/16)%4,events=[];
  const hit=(kind,level,duration)=>events.push({type:'percussion',kind,freq:kind==='kick'?52:kind==='snare'?185:6500,level,duration,role:'drums'});
  // Four-bar broken rhythm: anchored backbeat, deliberate syncopation, quiet ghosts.
  if([[0,6,10],[0,7,10],[0,3,10],[0,6,11,14]][bar].includes(i))hit('kick',.24,.19);
  if(i===4||i===12)hit('snare',.15,.13);
  if((bar===1&&i===15)||(bar===3&&(i===10||i===15)))hit('snare',.035,.06);
  if(i%2===0||([1,3].includes(bar)&&i===15))hit('hat',i%4===2?.043:.023,i===14?.075:.028);
  if(i===0||i===10)events.push({type:'tone',kind:'bass',midi:degreePitch(this.transpose)-12,level:.095,duration:.14,role:'backing'});
  if(loop){
   if(this.loopOrigin===null)this.loopOrigin=step;
   const offset=step-this.loopOrigin;
   if(offset%2===0)events.push({type:'tone',kind:'bell',midi:degreePitch(this.phrase[Math.floor(offset/2)%16]+this.transpose),level:.16,duration:.22,role:'lead',pan:0});
  }else this.loopOrigin=null;
  return events;
 }
}
