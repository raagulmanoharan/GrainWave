import {scales} from './music.js';

// A camera gesture articulates a note; this grammar supplies a repeatable phrase.
// Negative gestureDirection means upward screen travel and requests ascending pitch.
export class PhraseComposer {
  constructor({seed=0}={}) { this.seed=Math.trunc(seed)||0; this.reset(); }
  reset() { this.index=0; this.previous=null; this.motif=[]; this.scale=null; }
  compose(note,{scale='minor',sounding=[]}={}) {
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
    const direction=-Math.sign(note.point?.gestureDirection||0);
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
