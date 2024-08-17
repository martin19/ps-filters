import {premultiplyAlphaPacked, unmultiplyAlphaPacked} from "../utils/utils-filter";
import {gaussBlur, gaussBlurPacked} from "../utils/gauss";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorSharpenUnsharpMask:FilterDescriptor = {
  id : "sharpenUnsharpMask",
  name : "Unsharp Mask",
  filter1 : filterSharpenUnsharpMask1,
  filter4 : filterSharpenUnsharpMask4,
  parameters : {
    amount: {name: "amount", type: "int", min: 1, max: 500, default: 100},
    radius: {name: "radius", type: "float", min: 0.1, max: 1000, default: 10},
    threshold: {name: "threshold", type: "int", min: 0, max: 255, default: 10},
  }
}

export interface FilterSharpenUnsharpMaskOptions {
  amount : number,
  radius : number,
  threshold : number,
}

async function filterSharpenUnsharpMask1(input:FilterInput, output:FilterOutput, options:FilterSharpenUnsharpMaskOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  let src = new Uint8Array(w*h);
  let tgt = new Uint8Array(w*h);
  for(let i = 0; i < i8.length; i++) src[i] = i8[i];

  gaussBlur(src, tgt, w, h, options.radius);
  for(let i = 0; i < i8.length; i++) {
    const diff = (i8[i] - tgt[i]);
    let val;
    const k = options.amount/100;
    let a = Math.max(0.0, Math.min(1.0, (options.threshold)/(Math.abs(diff*k)+0.001)));
    val = a * i8[i] + (1.0-a) * (i8[i] + diff * (options.amount/100));

    o8[i] = Math.max(0, Math.min(255, val));
  }
}

async function filterSharpenUnsharpMask4(input:FilterInput, output:FilterOutput, options:FilterSharpenUnsharpMaskOptions) {
  const i32 = new Uint8Array(input.img);
  const o32 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const len4 = w*h*4;
  const len = w*h;
  const i8 = new Uint8Array(i32.buffer);
  const o8 = new Uint8Array(o32.buffer);
  let src = new Uint8Array(len4);
  let tgt = new Uint8Array(len4);
  // src.set(new Uint8Array(input));
  for(let i = 0; i < len4; i++) src[i] = i8[i];

  premultiplyAlphaPacked(src.buffer);
  gaussBlurPacked(src.buffer, tgt.buffer, w, h, options.radius);
  unmultiplyAlphaPacked(tgt.buffer);

  for(let i = 0; i < len4; i++) {
    const diff = (i8[i] - tgt[i]);
    let val;
    const k = options.amount/100;
    let a = Math.max(0.0, Math.min(1.0, (options.threshold)/(Math.abs(diff*k)+0.001)));
    val = a * i8[i] + (1.0-a) * (i8[i] + diff * (options.amount/100));

    o8[i] = Math.max(0, Math.min(255, val));
  }
}