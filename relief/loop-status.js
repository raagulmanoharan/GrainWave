const prompts=['Point at the sky.','Traffic has a rhythm.','Wave. Very avant-garde.','Go outside. Find a beat.',
 'Clouds have places to be.','Give the trees a solo.','Your commute, remixed.',
 'Try a little hand dance.','Find something going somewhere.','Watch the world improvise.',
 'Birdwatching. With sound.','A passing car. A tiny concert.','Let the street take a turn.',
 'Even a wave has a tune.','Point somewhere unexpected.','The view is your instrument.',
 'Small movements welcome.','Let your fingers wander.','Take the scenic soundtrack.',
 'Nothing to practise. Just look.','See what the breeze brings.','A window seat will do.',
 'Find a busy little corner.','Make room for a little wonder.'];
const comforts=["Soothing, isn't it?",'No rehearsals required.','Your own tiny orchestra.','Let it go round again.',
 'You caught a good moment.','Stay for another round.','A little world of your own.',
 'The street sounds different now.','Accidentally quite lovely.','A moment worth repeating.',
 'Let the day drift a little.','Your window has a soundtrack.','Nobody needs a solo yet.',
 'This bit can stay.','Nothing to rush here.','A good excuse to look longer.',
 'Keep wandering. It stays here.','Somewhere between a view and a tune.',
 'One small loop. Big feelings.','The world did the rehearsing.',
 'Found music. Finders keepers.','Consider this a scenic detour.'];
const catches=['Nice catch.','That one stays.','A keeper.','Moment bottled.','Good ears.','Found something good.','Worth another round.','A little souvenir.','Caught in the act.','Saved for a rainy day.','Take that one home.','The view made a tune.'];
const noteReactions=['Nice little racket.','Something is taking shape.','A tune in the making.','The view is warming up.','A little happy accident.','Your surroundings have opinions.','Quite a view. Quite a tune.','Keep looking. It is listening.','The world is joining in.','That is a good start.','A small concert happening.','Something worth keeping?'];
const layering=['Tap KEEP to save another','Tap KEEP. Collect the chaos.','Tap KEEP when it feels right','Tap KEEP to catch this phrase','Tap KEEP. Make this moment stay','Tap KEEP to add this layer'];
const capacity=['Tap a loop to edit it','No room. Plenty of music.','Four little worlds. Yours.','Tap a loop. Give it a new twist.','A full house of happy accidents.','Tap a loop to change its pace'];
const choose=(lines,beat)=>lines[((beat%lines.length)+lines.length)%lines.length];
export function loopStatus({loops=[],selection=null,live=false,noteCount=0,saved=false,beat=0}){
 if(saved)return `Loop ${loops.length} saved. ${choose(catches,beat)}\nTap + to add more notes`;
 if(selection){const octave=selection.octave/12,pitch=octave===0?'original pitch':`${octave>0?'+':''}${octave} octave${Math.abs(octave)>1?'s':''}`;return `Loop ${selection.id} · ${selection.paused?'paused':'playing'}\n${selection.paused?"Tap PLAY. Break's over.":beat%2?choose(comforts,Math.floor(beat/2)):`${selection.speed}× speed · ${pitch}`}`}
 const running=loops.filter(l=>!l.paused).length;
 if(loops.length>=4)return `4 loops saved · ${running} playing\n${choose(capacity,beat)}`;
 if(live){if(!loops.length)return noteCount?`${noteCount} notes. ${choose(noteReactions,beat)}\nTap KEEP to save a loop`:`${choose(prompts,beat)}\nMove to play. KEEP saves it.`;return `${running} loop${running===1?'':'s'} + new notes\n${choose(layering,beat)}`}
 return running?`${running} loop${running===1?'':'s'} playing\n${beat%2?choose(comforts,Math.floor(beat/2)):'Tap + to add more notes'}`:"Loops paused. Tiny breather.\nTap + to play new notes";
}
