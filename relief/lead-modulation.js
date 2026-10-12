// Slow, bounded timbre drift sampled only when a live note is triggered.
export function leadModulation(seconds){return {release:1+.035*Math.sin(seconds*2*Math.PI/48),noise:.007*Math.sin(seconds*2*Math.PI/67+.8)}}
