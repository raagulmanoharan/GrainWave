// A saved phrase owns its notes and voice settings; editing the input never changes it.
export function freezeLoop(tracks,sound,id){return {id,tracks:tracks.map(t=>({...t,notes:(t.notes||Array(t.length).fill(null)).map(n=>n?{...n,point:{...n.point}}:null)})),sound:{...sound},playing:true,solo:false,startTick:0}}
export function audibleLoops(loops){const solo=loops.some(l=>l.solo&&l.playing);return loops.filter(l=>l.playing&&(!solo||l.solo))}
