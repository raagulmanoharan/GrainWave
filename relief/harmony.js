import {scales} from './music.js';
// Consonant lower support; the movement-controlled lead is never rewritten.
export function harmonyPitches(lead,scale='major'){
 const notes=scales[scale]||scales.major,valid=p=>notes.includes(((p-57)%12+12)%12);
 const third=[lead-4,lead-3].find(valid),fifth=valid(lead-7)?lead-7:lead-12;
 return [...new Set([third,fifth].filter(Number.isFinite))].slice(0,2);
}
