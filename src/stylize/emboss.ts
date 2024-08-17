import {clamp, getPixelBilinearRepeat, getPixelRepeat, joinRGBA, lerp, splitRGBA} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {filterStylizeExtrude4} from "./extrude/extrude";
import {sourceOver} from "../utils/perlin";

export const filterDescriptorStylizeEmboss:FilterDescriptor = {
  id : "stylizeEmboss",
  name : "Emboss",
  filter1 : filterStylizeEmboss1,
  filter4 : filterStylizeEmboss4,
  parameters : {
    angle: {name: "angle", type: "int", min: -180, max: 180, default: 135},
    height: {name: "height", type: "int", min: 1, max: 100, default: 1},
    amount: {name: "amount", type: "int", min: 1, max: 500, default: 100}
  }
}

export const filterStylizeEmbossDefaults = {
  angle : 135,
  height : 1,
  amount : 100,
}

export const filterStylizeEmbossOptions = {
  angle : [-180,180,1],
  height : [1,100,1],
  amount : [1,500,1]
}

export interface FilterStylizeEmbossOptions {
  angle : number,
  height : number,
  amount : number
}

async function filterStylizeEmboss1(input:FilterInput, output:FilterOutput, options:FilterStylizeEmbossOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const radians = (options.angle + 180) * Math.PI / 180;
  const xOfs = Math.cos(radians) * (options.height/2);
  const yOfs = -Math.sin(radians) * (options.height/2);
  const amount = options.amount/100;

  for(let y = 0; y < h; y++) {
    for(let x = 0; x < w; x++) {
      const a = getPixelBilinearRepeat(i8, w, h, x - xOfs, y - yOfs, 1);
      const b = getPixelBilinearRepeat(i8, w, h, x + xOfs, y + yOfs, 1);
      const res = (a - b) * amount + 128;
      o8[y*w+x] = clamp(res, 0, 255);
    }
  }
}

async function filterStylizeEmboss4(input:FilterInput, output:FilterOutput, options:FilterStylizeEmbossOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  let {a:aI, b:bI, g:gI, r:rI} = splitRGBA(i8);
  let cIn = [rI, gI, bI, aI];
  let cOut = [
    new Uint8Array(w*h),
    new Uint8Array(w*h),
    new Uint8Array(w*h),
    new Uint8Array(w*h),
  ];

  const radians = (options.angle + 180) * (Math.PI / 180);
  const xOfs = Math.round(Math.cos(radians) * (options.height/2));
  const yOfs = Math.round(-Math.sin(radians) * (options.height/2));
  let amount = options.amount/100;

  for(let c = 0; c < 3; c++) {
    const inC = cIn[c];
    const inA = cIn[3];
    const outC = cOut[c];
    for(let y = 0; y < h; y++) {
      for(let x = 0; x < w; x++) {
        const alphaA = getPixelRepeat(inA, w, h, x - xOfs, y - yOfs, 1)/255;
        const alphaB = getPixelRepeat(inA, w, h, x + xOfs, y + yOfs, 1)/255;
        const a = getPixelRepeat(inC, w, h, x - xOfs, y - yOfs, 1);
        const b = getPixelRepeat(inC, w, h, x + xOfs, y + yOfs, 1);
        let res1 = sourceOver(a, 128, clamp(alphaA, 0, 1)*(amount*2));
        let res2 = sourceOver((255-b), 128, clamp(alphaB, 0, 1)*(amount*2));
        let res3 = sourceOver(res1, res2, 0.5)
        outC[y*w+x] = clamp(res3, 0, 255);
      }
    }
  }
  cOut[3].set(cIn[3]);
  joinRGBA(o8, cOut[0], cOut[1], cOut[2], cOut[3]);
}