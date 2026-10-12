// Fixed-gain local contrast, avoiding per-frame histogram pumping.
export class TrackingContrast{
 process(data,w,h){const n=w*h;if(this.size!==n){this.size=n;this.gray=new Float32Array(n);this.smooth=new Float32Array(n);this.rows=new Float32Array(n)}const {gray,smooth,rows}=this;for(let i=0;i<n;i++)gray[i]=data[i*4]*.2126+data[i*4+1]*.7152+data[i*4+2]*.0722;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;smooth[i]=gray[i]*.75+(gray[y*w+Math.max(0,x-1)]+gray[y*w+Math.min(w-1,x+1)]+gray[Math.max(0,y-1)*w+x]+gray[Math.min(h-1,y+1)*w+x])*.0625}
 const radius=8;for(let y=0;y<h;y++){let sum=0;for(let x=0;x<=Math.min(w-1,radius);x++)sum+=smooth[y*w+x];for(let x=0;x<w;x++){rows[y*w+x]=sum/(Math.min(w-1,x+radius)-Math.max(0,x-radius)+1);if(x-radius>=0)sum-=smooth[y*w+x-radius];if(x+radius+1<w)sum+=smooth[y*w+x+radius+1]}}
 const out=new Float32Array(n);for(let x=0;x<w;x++){let sum=0;for(let y=0;y<=Math.min(h-1,radius);y++)sum+=rows[y*w+x];for(let y=0;y<h;y++){const i=y*w+x,mean=sum/(Math.min(h-1,y+radius)-Math.max(0,y-radius)+1);out[i]=smooth[i]+(smooth[i]-mean)*1.6;if(y-radius>=0)sum-=rows[(y-radius)*w+x];if(y+radius+1<h)sum+=rows[(y+radius+1)*w+x]}}return out}
}
