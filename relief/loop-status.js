const prompts=['Point at the sky.','Traffic has a rhythm.','Wave. Very avant-garde.','Go outside. Find a beat.'];
const comforts=["Soothing, isn't it?",'No rehearsals required.','Your own tiny orchestra.','Let it go round again.'];
const choose=(lines,beat)=>lines[((beat%lines.length)+lines.length)%lines.length];
export function loopStatus({loops=[],selection=null,live=false,noteCount=0,saved=false,beat=0}){
 if(saved)return `Loop ${loops.length} saved. Nice catch.\nTap + to add more notes`;
 if(selection){const octave=selection.octave/12,pitch=octave===0?'original pitch':`${octave>0?'+':''}${octave} octave${Math.abs(octave)>1?'s':''}`;return `Loop ${selection.id} · ${selection.paused?'paused':'playing'}\n${selection.paused?"Tap PLAY. Break's over.":beat%2?choose(comforts,Math.floor(beat/2)):`${selection.speed}× speed · ${pitch}`}`}
 const running=loops.filter(l=>!l.paused).length;
 if(loops.length>=4)return `4 loops saved · ${running} playing\n${beat%2?'No room. Plenty of music.':'Tap a loop to edit it'}`;
 if(live){if(!loops.length)return noteCount?`${noteCount} notes. Nice little racket.\nTap KEEP to save a loop`:`${choose(prompts,beat)}\nMove to play. KEEP saves it.`;return `${running} loop${running===1?'':'s'} + new notes\n${beat%2?'Tap KEEP. Collect the chaos.':'Tap KEEP to save another'}`}
 return running?`${running} loop${running===1?'':'s'} playing\n${beat%2?choose(comforts,Math.floor(beat/2)):'Tap + to add more notes'}`:"Loops paused. Tiny breather.\nTap + to play new notes";
}
