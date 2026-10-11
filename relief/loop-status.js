export function loopStatus({loops=[],selection=null,live=false,noteCount=0,saved=false}){
 if(saved)return `Loop ${loops.length} saved · playing\nTap + to add more notes`;
 if(selection){const octave=selection.octave/12,pitch=octave===0?'original pitch':`${octave>0?'+':''}${octave} octave${Math.abs(octave)>1?'s':''}`;return `Loop ${selection.id} · ${selection.paused?'paused':'playing'}\n${selection.speed}× speed · ${pitch}`}
 const running=loops.filter(l=>!l.paused).length;
 if(loops.length>=4)return `4 loops saved · ${running} playing\nTap a loop to edit it`;
 if(live){if(!loops.length)return noteCount?`${noteCount} notes ready\nTap KEEP to save a loop`:'Move to make notes\nTap KEEP to save a loop';return `Adding notes · ${running} loop${running===1?'':'s'} playing\nTap KEEP to save another`}
 return running?`${running} loop${running===1?'':'s'} playing\nTap + to add more notes`:'Loops paused\nTap + to play new notes';
}
