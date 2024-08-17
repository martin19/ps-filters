import {U8Array} from "../utils/Types";

interface Strel {
  w : number;
  h : number;
  mask : Uint8Array;
  add : number[];
  rem : number[];
}

function computeStrel(radius:number):Strel {
  const w = radius * 2;
  const h = w;
  const cx = w/2;
  const cy = h/2;
  const mask = new Uint8Array(w*h);
  mask.fill(0);

  //compute basic mask
  let ofs = 0;
  for(let y = 0; y < h; y++) {
    for(let x = 0; x < w; x++) {
      if(Math.sqrt((cx-x)**2 + (cy-y)**2) < radius) {
        mask[ofs] = 1;
      }
      ofs++;
    }
  }

  //move mask 1 px to right and subtract it from original mask
  //-1 -> pixels added
  //+1 -> pixels removed
  const tmp = new Int8Array((w+1) * (h+1));
  for(let y = 0; y < h; y++) {
    for(let x = 0; x < w; x++) {
      tmp[y*(w+1)+x] = mask[y*w+x];
    }
  }

  for(let y = 0; y < h; y++) {
    for(let x = 0; x < w; x++) {
      tmp[y*(w+1)+x+1] = tmp[y*(w+1)+x+1] - mask[y*w+x];
    }
  }

  const add:number[] = [];
  const rem:number[] = [];
  for(let y = 0; y < h+1; y++) {
    for(let x = 0; x < w+1; x++) {
      if(tmp[y*(w+1)+x] == -1) add.push(x,y);
      else if(tmp[y*(w+1)+x] == +1) rem.push(x,y);
    }
  }

  return {w, h, add, rem, mask};
}

function initAcc(input:U8Array, w:number, h:number, x:number, y:number, acc:Uint32Array, strel:Strel) {
  const mask = strel.mask;
  const mh = strel.h;
  const mw = strel.w;

  acc.fill(0);
  const x0 = x - Math.floor(mw/2);
  const y0 = y - Math.floor(mh/2);
  const x1 = x + Math.floor(mw/2);
  const y1 = y + Math.floor(mh/2);
  const sx = Math.max(0, Math.min(w-1, x0));
  const ex = Math.max(0, Math.min(w-1, x1));
  const sy = Math.max(0, Math.min(h-1, y0));
  const ey = Math.max(0, Math.min(h-1, y1));
  const smx = sx - x0;
  const emx = smx + (ex-sx);
  const smy = sy - y0;
  const emy = smy + (ey-sy);

  let ofsMskRow = smy*mw + smx;
  let ofsSrcRow = sy*w + sx;

  for(let y = sy; y <= ey; y++) {
    let ofsSrc = ofsSrcRow;
    let ofsMsk = ofsMskRow;
    for(let x = sx; x <= ex; x++) {
      if(mask[ofsMsk]) acc[input[ofsSrc]]++;
      ofsSrc++;
      ofsMsk++;
    }
    ofsSrcRow += w;
    ofsMskRow += mw;
  }
}

function updateAcc(input:U8Array, w:number, h:number, x:number, y:number, acc:Uint32Array, strel:Strel) {
  const l = x - Math.floor(strel.w/2);
  const t = y - Math.floor(strel.h/2);
  const rem = strel.rem;
  const add = strel.add;
  for(let i = 0; i < rem.length; i+=2) {
    const xx = rem[i  ]+l;
    const yy = rem[i+1]+t;
    if(xx >= 0 && yy >= 0 && xx < w && yy < h) {
      const val = input[yy*w+xx];
      acc[val]--;
    }
  }
  for(let i = 0; i < add.length; i+=2) {
    const xx = add[i  ]+l;
    const yy = add[i+1]+t;
    if(xx >= 0 && yy >= 0 && xx < w && yy < h) {
      const val = input[yy*w+xx];
      acc[val]++;
    }
  }
}

function computeMax(acc:Uint32Array) {
  for(let i = 255; i >= 0; i--) {
    if(acc[i] > 0) return i;
  }
  return 0;
}

function computeMaxRound(input:U8Array, output:U8Array, w:number, h:number, radius:number) {
  const strel = computeStrel(radius);

  const acc = new Uint32Array(256);
  acc.fill(0);

  for(let y = 0; y < h; y++) {
    initAcc(input, w, h, 0, y, acc, strel);
    for(let x = 0; x < w; x++) {
      let ofs = (y * w + x);
      output[ofs] = computeMax(acc);
      updateAcc(input, w, h, x, y, acc, strel);
    }
  }
}

function computeMaxSquare(input:U8Array, output:U8Array, w:number, h:number, radius:number) {
  const tmpH = new Uint8Array(w * h);
  const r = radius;

  //horizontal pass
  for(let y = 0; y < h; y++) {
    for(let x = 0; x < w; x++) {
      let sx = Math.min(Math.max(0, x-radius),w-1);
      let ex = Math.min(Math.max(0, x+radius),w-1);
      let val = 0;
      let ofs = y*w+sx;
      for(let xx = sx; xx < ex; xx++) {
        val = Math.max(val, input[ofs]);
        ofs++;
      }
      tmpH[y*w+x] = val;
    }
  }

  //vertical pass
  for(let y = 0; y < h; y++) {
    for(let x = 0; x < w; x++) {
      let sy = Math.min(Math.max(0, y-radius),h-1);
      let ey = Math.min(Math.max(0, y+radius),h-1);
      let val = 0;
      let ofs = sy*w+x;
      for(let yy = sy; yy < ey; yy++) {
        val = Math.max(val, tmpH[ofs]);
        ofs+=w;
      }
      output[y*w+x] = val;
    }
  }
}

function computeMin(acc:Uint32Array) {
  let min = 0;
  for(let i = 0; i < 256; i++) {
    if(acc[i] != 0) {
      min = i;
      break;
    }
  }
  return min;
}

function computeMinRound(input:U8Array, output:U8Array, w:number, h:number, radius:number) {
  const strel = computeStrel(radius);

  const acc = new Uint32Array(256);
  acc.fill(0);

  for(let y = 0; y < h; y++) {
    initAcc(input, w, h, 0, y, acc, strel);
    for(let x = 0; x < w; x++) {
      const ofs = (y * w + x);
      output[ofs] = computeMin(acc);

      updateAcc(input, w, h, x, y, acc, strel);
      // initAcc(input, w, h, x, y, acc, strel);
    }
  }
}

function computeMinSquare(input:U8Array, output:U8Array, w:number, h:number, radius:number) {
  const tmpH = new Uint8Array(w * h);
  const r = radius;

  //horizontal pass
  for(let y = 0; y < h; y++) {
    for(let x = 0; x < w; x++) {
      const sx = Math.min(Math.max(0, x-r),w-1);
      const ex = Math.min(Math.max(0, x+r),w-1);
      let val = Number.MAX_VALUE;
      let ofs = y*w+sx;
      for(let xx = sx; xx < ex; xx++) {
        val = Math.min(val, input[ofs]);
        ofs++;
      }
      tmpH[y*w+x] = val;
    }
  }

  //vertical pass
  for(let y = 0; y < h; y++) {
    for(let x = 0; x < w; x++) {
      const sy = Math.min(Math.max(0, y-r),h-1);
      const ey = Math.min(Math.max(0, y+r),h-1);
      let val = Number.MAX_VALUE;
      let ofs = sy*w+x;
      for(let yy = sy; yy < ey; yy++) {
        val = Math.min(val, tmpH[ofs]);
        ofs+=w;
      }
      output[y*w+x] = val;
    }
  }

}

export function erodeExact(input:U8Array, output:U8Array, w:number, h:number, radius : number, strelShape:"round"|"square") {
  if(strelShape === "round") {
    computeMinRound(input, output, w, h, radius);
  } else {
    computeMinSquare(input, output, w, h, radius);
  }
}

export function dilateExact(input:U8Array, output:U8Array, w:number, h:number, radius : number, strelShape:"round"|"square") {
  if(strelShape === "round") {
    computeMaxRound(input, output, w, h, radius);
  } else {
    computeMaxSquare(input, output, w, h, radius);
  }
}