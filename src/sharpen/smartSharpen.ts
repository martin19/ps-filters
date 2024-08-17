import {conv2, filterEachChannelPremultiplied} from "../utils/utils-filter";
import {gaussBlur} from "../utils/gauss";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorSharpenSmartSharpen:FilterDescriptor = {
  id : "sharpenSmartSharpen",
  name : "Smart Sharpen",
  filter1 : filterSharpenSmart1,
  filter4 : filterEachChannelPremultiplied(filterSharpenSmart1),
  parameters : {
    amount: {name: "amount", type: "int", min: 1, max: 500, default: 100},
    radius: {name: "radius", type: "float", min: 0.1, max: 64, default: 10},
    blurType: {name: "blurType", type: "enum", values: ["gauss", "lens", "motion"], default: "gauss"},
    angle: {name: "angle", type: "int", min: -90, max: 90, default: 0},
    moreAccurate: {name: "moreAccurate", type: "boolean", default: false},
    shadowFadeAmount: {name: "shadowFadeAmount", type: "int", min: 0, max: 100, default: 0},
    shadowTonalWidth: {name: "shadowTonalWidth", type: "int", min: 0, max: 100, default: 0},
    shadowRadius: {name: "shadowRadius", type: "float", min: 0, max: 100, default: 1},
    highlightFadeAmount: {name: "highlightFadeAmount", type: "int", min: 0, max: 100, default: 0},
    highlightTonalWidth: {name: "highlightTonalWidth", type: "int", min: 0, max: 100, default: 0},
    highlightRadius: {name: "highlightRadius", type: "float", min: 0, max: 100, default: 1},
  }
}

export interface FilterSharpenSmartSharpenOptions {
  amount : number,
  radius : number,
  blurType : "gauss"|"lens"|"motion",
  moreAccurate: boolean[],
  angle : number,
  shadowFadeAmount : number,
  shadowTonalWidth : number,
  shadowRadius : number,
  highlightFadeAmount : number,
  highlightTonalWidth : number,
  highlightRadius : number,
}

async function filterSharpenSmart1(input:FilterInput, output:FilterOutput, options:FilterSharpenSmartSharpenOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  let src = new Uint8Array(w*h);
  let tgt = new Uint8Array(w*h);
  for(let i = 0; i < i8.length; i++) src[i] = i8[i];

  let edgeMask;
  if(options.blurType === "gauss") {
    edgeMask = new Float32Array(w*h);
    edgeMask.fill(1.0);
  } else {
    edgeMask = computeEdgeMask(i8, w, h, options);
  }



  if(options.blurType === "gauss") {
    gaussBlur(src, tgt, w, h, options.radius);
  } else if(options.blurType === "motion") {
    throw new Error("not implemented!");
    //filterBlurMotion1(src, tgt, w, h, { angle : (options.angle/90)*(Math.PI/2), distance : options.radius });
  }

  for(let i = 0; i < i8.length; i++) {
    const diff = (i8[i] - tgt[i]);
    let val;
    val = i8[i] + diff * (options.amount/100) *edgeMask[i];
    // val = edgeMask[i] * 255;
    o8[i] = Math.max(0, Math.min(255, val));
  }

}

function computeEdgeMask(input:U8Array, w:number, h:number, options:FilterSharpenSmartSharpenOptions) {
  let tmp1 = new Float32Array(w*h);
  let tmp2 = new Float32Array(w*h);

  //compute edge mask
  const Fx = new Float32Array(w*h);
  const Fy = new Float32Array(w*h);
  const sx = [ 1, 2, 1, 0, 0, 0,-1,-2,-1];
  const sy = [ 1, 0,-1, 2, 0,-2, 1, 0,-1];
  conv2(input, Fx, w, h, sx, 3, 3);
  conv2(input, Fy, w, h, sy, 3, 3);
  for(let i = 0; i < input.length; i++) tmp1[i] = Math.sqrt(Fx[i]*Fx[i]+Fy[i]*Fy[i])/255;

  gaussBlur(tmp1, tmp2, w, h, 3.555);

  //threshold edge map
  for(let i = 0; i < input.length; i++) tmp2[i] = tmp2[i] > 0.001 ? 1 : 0;

  //blur thresholded edge map
  gaussBlur(tmp2, tmp1, w, h, 2.888);

  //normalize edge map to [0,1]
  let max = 0;
  for(let i = 0; i < tmp1.length; i++) {
    if(tmp1[i] > max) max = tmp1[i];
  }
  for(let i = 0; i < tmp1.length; i++) {
    tmp1[i] = (tmp1[i] / max) * 0.7;
  }

  return tmp1;
}