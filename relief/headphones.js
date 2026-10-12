// Prebaked app dithering: static editorial artwork, no model or GPU renderer.
export class Headphones {
 constructor(host){this.host=host;const image=new Image();image.alt='White EarPods with delicate flowers growing along their stems and cords, in monochrome dither';image.src=new URL('./onboarding/earpods-flowers-dither.png',import.meta.url).href;image.decoding='async';image.className='headphone-art';host.replaceChildren(image);this.squares=[];for(let i=0;i<7;i++){const square=document.createElement('span');square.className='headphone-square';square.style.setProperty('--square-color',['#0a84ff','#ffd60a','#30d158','#bf8cff'][i%4]);square.style.animationDelay=`-${i*.37}s`;square.style.animationDuration=`${2.2+i*.23}s`;host.append(square);this.squares.push(square)}}
 start(){for(const square of this.squares){square.style.left=`${8+Math.random()*84}%`;square.style.top=`${8+Math.random()*84}%`;square.style.animationPlayState='running'}}
 stop(){for(const square of this.squares)square.style.animationPlayState='paused'}
}
