import {U8Array} from "../utils/Types";
import {getPixelRepeat} from "../utils/utils-filter";

export function bilateralHuang(input:U8Array, output:U8Array, w:number, h:number, radius:number, threshold:number) {
  const pixelsInWindow = (radius+radius+1)**2;
  const r = Math.floor(radius);
  const kHist = new Uint16Array(256);
  const th = ((radius+radius+1)**2)/2;
  let currentValue = 0;

  function updateCurrentValue(x:number, y:number) {
    const val = input[y*w+x];
    let sumVals = 0;
    let sumWeights = 0;
    const valLo = Math.max(0, val-threshold);
    const valHi = Math.min(255, val+threshold);
    for(let i = valLo; i <= valHi; i++) {
      sumVals += kHist[i]*i;
      sumWeights += kHist[i];
    }
    currentValue = sumVals/sumWeights;
  }

  function updateKernelHist(x:number, y:number) {
    let yRemove = Math.max(y - r, 0);
    let yAdd = Math.min(y + r + 1, h - 1);

    if(x-r < 0) {
      const valRemove = input[yRemove*w];
      const valAdd = input[yAdd*w];
      const cnt = -(x - r);
      kHist[valRemove]-=cnt;
      kHist[valAdd]+=cnt;
    }

    if(x+r > w) {
      const valRemove = input[yRemove*w+(w-1)];
      const valAdd = input[yAdd*w+(w-1)];
      const cnt = x + r - w;
      kHist[valRemove]-=cnt;
      kHist[valAdd]+=cnt;
    }

    const xStart = Math.max(0, x-r);
    const xEnd = Math.min(w-1, x+r);
    let ofsRemove = yRemove*w + xStart;
    let ofsAdd = yAdd*w + xStart;
    for(let i = xStart; i <= xEnd; i++) {
      const valRemove = input[ofsRemove++];
      const valAdd = input[ofsAdd++];
      kHist[valRemove]--;
      kHist[valAdd]++;
    }
  }

  function initKernelHist(x:number, y:number) {
    kHist.fill(0);
    for(let j = y - r; j < y + r + 1; j++) {
      for(let i = x - r; i < x + r + 1; i++) {
        const val = getPixelRepeat(input, w, h, i, j, 0);
        kHist[val]++;
      }
    }
  }

  let ofs = 0;
  for(let x = 0; x < w; x++) {
    ofs = x;
    currentValue = 0;
    initKernelHist(x, 0);
    for(let y = 0; y < h; y++) {
      updateCurrentValue(x,y);
      output[ofs] = currentValue;
      ofs += w;
      updateKernelHist(x, y);
    }
  }
}