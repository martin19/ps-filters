import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorPixelateMezzotint:FilterDescriptor = {
  id : "pixelateMezzotint",
  name : "Mezzotint",
  filter1 : filterPixelateMezzotint1,
  filter4 : filterPixelateMezzotint4,
  parameters : {
    type: {
      name: "type", type: "enum", values: ["fineDots",
        "mediumDots",
        "grainyDots",
        "coarseDots",
        "shortLines",
        "mediumLines",
        "longLines",
        "shortStrokes",
        "mediumStrokes",
        "longStrokes"], default: "fineDots"
    }
  }
}

export interface FilterPixelateMezzotintOptions {
  type : "fineDots"|"mediumDots"|"grainyDots"|"coarseDots"|"shortLines"|"mediumLines"|"longLines"|"shortStrokes"|
  "mediumStrokes"|"longStrokes"
}

type MezzoTintParams = { p : number, histOfs : number, histScl : number, mot : number, avg : number, rand : number,
  ngrow : number, nofs : number };
const params:{[key:string]:MezzoTintParams} = {
  "fineDots"     : { p : 0.4, histOfs : 0.0, histScl : 1.4, mot : 0, avg : 0, rand : 1, ngrow : 1, nofs : 0 },
  "mediumDots"   : { p : 0.32, histOfs : 0.0, histScl : 1.7, mot : 0, avg : 3, rand : 0.9, ngrow : 1, nofs : 1 },
  "grainyDots"   : { p : 0.17, histOfs : 0.31, histScl : 0.75, mot : 0, avg : 2, rand : 0.28, ngrow : 3, nofs : 0 },
  "coarseDots"   : { p : 0.154, histOfs : 0.25, histScl : 1.63, mot : 0, avg : 3, rand : 0.28, ngrow : 3, nofs : 1 },
  "shortLines"   : { p : 0.5, histOfs : 0.5, histScl : 1, mot : 20, avg : 0, rand : 0, ngrow : 0, nofs : 0 },
  "mediumLines"  : { p : 0.5, histOfs : 0.5, histScl : 1, mot : 40, avg : 0, rand : 0, ngrow : 0, nofs : 0 },
  "longLines"    : { p : 0.5, histOfs : 0.5, histScl : 1, mot : 60, avg : 0, rand : 0, ngrow : 0, nofs : 0 },
  "shortStrokes" : { p : 0.25, histOfs : 0.25, histScl : 1, mot : 20, avg : 0, rand : 0, ngrow : 2, nofs : 0 },
  "mediumStrokes": { p : 0.3, histOfs : 0.7, histScl : 1, mot : 40, avg : 0, rand : 0, ngrow : 1, nofs : 0 },
  "longStrokes"  : { p : 0.3, histOfs : 0.7, histScl : 1, mot : 60, avg : 0, rand : 0, ngrow : 1, nofs : 0 },
}

async function filterPixelateMezzotint4(input:FilterInput, output:FilterOutput, options:FilterPixelateMezzotintOptions) {
  const i32 = new Uint32Array(input.img);
  const o32 = new Uint32Array(output.img);
  const w = input.w;
  const h = input.h;

  const { P, hist } = createPattern(w,h, params[options.type]);
  filterPixelateMezzotintCore4(i32, o32, P, hist, w, h);
}

async function filterPixelateMezzotint1(input:FilterInput, output:FilterOutput, options:FilterPixelateMezzotintOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const { P, hist } = createPattern(w,h, params[options.type]);
  filterPixelateMezzotintCore1(i8, o8, P, hist, w, h);
}

function createPattern(w:number, h:number, options:MezzoTintParams) {
  //create a random noise pattern
  let P = new Float32Array(w * h);

  //grow pattern in n8
  const n8:number[][] = [[0,0],[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,+1],[0,+1],[1,+1]];

  for(let y = 0; y < h; y++) {
    for(let x = 0; x < w; x++) {
      if(Math.random() < options.p) {
        for (let i = 0; i <= options.ngrow; i++) {
          const ofsx = n8[i][0];
          const ofsy = n8[i][1];
          if(y + ofsy > 0 && y + ofsy < h && x + ofsx > 0 && x + ofsx < w) {
            P[(y+ofsy)*w+(x+ofsx)] = 1.0;
          }
        }
      }
    }
  }

  //offset pattern in n8
  if(options.nofs > 0) {
    for(let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        for(let i = 0; i < options.nofs; i++) {
          const ofsx = n8[i][0];
          const ofsy = n8[i][1];
          if(y + ofsy > 0 && y + ofsy < h && x + ofsx > 0 && x + ofsx < w) {
            P[(y+ofsy)*w+(x+ofsx)] = Math.min(1.0, P[y*w+x] + P[(y+ofsy)*w+(x+ofsx)]);
          }
        }
      }
    }
  }

  //apply motion to pattern
  if(options.mot > 0) {
    const mot2 = Math.floor(options.mot/2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const le = Math.max(0, x-mot2);
        const ri = Math.min(w-1, x+mot2);
        let sum = 0;
        const start = y*w+x+le;
        const end = y*w+x+ri;
        for(let ofs = start; ofs < end; ofs++) sum += P[ofs];
        P[y*w + x] = sum/(ri-le);
      }
    }
  }

  //apply average to pattern
  if(options.avg > 0) {
    const avg2 = Math.floor(options.avg/2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const le = Math.max(0, x-avg2);
        const ri = Math.min(w-1, x+avg2);
        const to = Math.max(0, y-avg2);
        const bo = Math.min(h-1, y+avg2);
        let sum = 0;
        for(let yy = to; yy <= bo; yy++) {
          for(let xx = le; xx <= ri; xx++) {
            sum += P[yy*w+xx];
          }
        }
        P[y*w + x] = sum/((ri-le+1)*(bo-to+1));
      }
    }
  }

  if(options.rand > 0) {
    for(let i = 0; i < P.length; i++) {
      P[i] = P[i] + (Math.random()-0.5)*options.rand;
    }
  }

  const hist = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const k = i / 255;
    const val = 2 * (k < 0.5 ? k : 1 - k);
    const val2 = options.histOfs + Math.pow(val, options.histScl) * (1 - options.histOfs);
    const val3 = k < 0.5 ? val2 * 0.5 : 1 - val2 * 0.5;
    hist[i] = val3;
  }

  return {P, hist};
}

function filterPixelateMezzotintCore1(input:U8Array, output:U8Array, P:Float32Array, hist:Float32Array, w:number, h:number) {
  for(let i = 0; i < input.length; i++) output[i] = input[i];
  for(let i = 0; i < input.length; i++) {
    const val1 = input[i];
      const val2 = hist[val1];
      output[i] = P[i] > val2 ? 0 : 255;
  }
}

function filterPixelateMezzotintCore4(input:Uint32Array, output:Uint32Array, P:Float32Array, hist:Float32Array, w:number, h:number) {
  const len = w*h;
  for(let i = 0; i < len; i++) {
    const val = input[i];
    const v0 = val >>> 0 & 255;
    const v1 = val >>> 8 & 255;
    const v2 = val >>> 16 & 255;
    const v3 = val >>> 24 & 255;

    const o0 = P[i] > hist[v0] ? 0 : 255;
    const o1 = P[i] > hist[v1] ? 0 : 255;
    const o2 = P[i] > hist[v2] ? 0 : 255;
    const o3 = P[i] > hist[v3] ? 0 : 255;

    output[i] = o0 << 0 | o1 << 8 | o2 << 16 | o3 << 24;
  }
}