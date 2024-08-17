import {
  getPixelRepeat,
  joinRGBA,
  premultiplyAlphaPacked,
  splitRGBA,
  unmultiplyAlphaPacked
} from "../../utils/utils-filter";
import {U8Array} from "../../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../../FilterRegistry/FilterRegistry";
import {anisotropicDiffusion} from "../../diffusion/anisotropicDiffusion";

export const filterDescriptorStylizeDiffuse:FilterDescriptor = {
  id : "stylizeDiffuse",
  name : "Diffuse",
  filter1 : filterStylizeDiffuse1,
  filter4 : filterStylizeDiffuse4,
  parameters : {
    mode: {
      name: "mode",
      type: "enum",
      values: ["normal", "darkenOnly", "lightenOnly", "anisotropic"],
      default: "anisotropic"
    }
  }
}

export interface FilterStylizeDiffuseOptions {
  mode : "normal"|"darkenOnly"|"lightenOnly"|"anisotropic",
}

declare const Module:any;

export async function filterStylizeDiffuse1(input:FilterInput, output:FilterOutput, options:FilterStylizeDiffuseOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const len = w*h;
  if(options.mode === "anisotropic") {
    const sharpness = 2;
    const anisotropy = 1;
    const amplitude = 60;
    const sigmaGradientField = 0.01;
    const radiusBlurTensor = 14;
    const dl = 0.8;
    const da = 60;
    const gaussPrec = 2;
    anisotropicDiffusion(i8, o8, w, h, sharpness, anisotropy, amplitude, da, dl, gaussPrec, radiusBlurTensor);
  } else {
    const rand = new Uint8Array(len);
    const gray = new Uint8Array(len);
    for(let i = 0; i < len; i++) rand[i] = Math.floor((Math.random()*9)-0.0001);
    for(let i = 0; i < len; i++) gray[i] = i8[i];
    for(let i = 0; i < 3; i++) {
      filterStylizeDiffuseClassic1(i8, o8, rand, gray, w, h, options);
    }
  }
}

function filterStylizeDiffuseClassic1(input:U8Array, output:U8Array, rand:U8Array, gray:U8Array, w:number, h:number, options:FilterStylizeDiffuseOptions) {

  let cond = (a:number,b:number)=>true;
  if(options.mode === "darkenOnly") {
    cond = (a,b) => { return b < a };
  } else if(options.mode === "lightenOnly") {
    cond = (a,b) => { return b > a };
  }

  for(let y = 0; y < h; y++) {
    for(let x = 0; x < w; x++) {
      const index = rand[y*w+x];
      const yy = Math.floor(index/3);
      const xx = index%3;
      const a = getPixelRepeat(gray, w, h, x, y, 0);
      const b = getPixelRepeat(gray, w, h, x + xx, y + yy, 0);
      if(cond(a,b)) {
        output[y*w+x] = getPixelRepeat(input, w, h, x+xx, y+yy, 0);
      } else {
        output[y*w+x] = getPixelRepeat(input, w, h, x, y, 0);
      }
    }
  }
}

export async function filterStylizeDiffuse4(input:FilterInput, output:FilterOutput, options:FilterStylizeDiffuseOptions) {
  const i32 = new Uint8Array(input.img);
  const o32 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const len = w*h;
  const len4 = len*4;
  if(options.mode === "anisotropic") {
    const sharpness = 2;
    const anisotropy = 1;
    const amplitude = 60;
    const sigmaGradientField = 0.01;
    const radiusBlurTensor = 14;
    const dl = 0.8;
    const da = 60;
    const gaussPrec = 2;

    premultiplyAlphaPacked(i32.buffer);
    let {a:aIn, b:bIn, g:gIn, r:rIn} = splitRGBA(new Uint8Array(i32.buffer));
    const rOut = new Uint8Array(len);
    const gOut = new Uint8Array(len);
    const bOut = new Uint8Array(len);
    const aOut = new Uint8Array(len);
    anisotropicDiffusion(rIn, rOut, w, h, sharpness, anisotropy, amplitude, da, dl, gaussPrec, radiusBlurTensor);
    anisotropicDiffusion(gIn, gOut, w, h, sharpness, anisotropy, amplitude, da, dl, gaussPrec, radiusBlurTensor);
    anisotropicDiffusion(bIn, bOut, w, h, sharpness, anisotropy, amplitude, da, dl, gaussPrec, radiusBlurTensor);
    anisotropicDiffusion(aIn, aOut, w, h, sharpness, anisotropy, amplitude, da, dl, gaussPrec, radiusBlurTensor);
    joinRGBA(new Uint8Array(o32.buffer), rOut, gOut, bOut, aOut);
    unmultiplyAlphaPacked(o32.buffer);

  } else {
    const rand = new Uint8Array(len);
    for(let i = 0; i < rand.length; i++) rand[i] = Math.floor((Math.random()*9)-0.0001);

    const gray = new Uint8Array(len);
    let ofs = 0;
    for(let i = 0; i < len; i++) {
      const val = i32[i];
      const r = val & 255;
      const g = val >>> 8 & 255;
      const b = val >>> 16 & 255;
      gray[ofs++] = Math.floor((r+g+b)/3);
    }

    premultiplyAlphaPacked(i32.buffer);
    filterStylizeDiffuseClassic4(i32.buffer, o32.buffer, rand, gray, w, h, options);
    unmultiplyAlphaPacked(o32.buffer)
  }
}


function filterStylizeDiffuseClassic4(input:ArrayBuffer, output:ArrayBuffer, rand:U8Array, gray:U8Array, w:number, h:number, options:FilterStylizeDiffuseOptions) {
  const i32 = new Uint32Array(input);
  const o8 = new Uint8Array(output);

  let cond = (a:number,b:number)=>true;
  if(options.mode === "darkenOnly") {
    cond = (a,b) => { return b < a };
  } else if(options.mode === "lightenOnly") {
    cond = (a,b) => { return b > a };
  }

  for(let y = 0; y < h; y++) {
    for(let x = 0; x < w; x++) {
      const index = rand[y*w+x];
      const yy = Math.floor(index/3);
      const xx = index%3;
      const a32 = getPixelRepeat(i32, w, h, x, y, 0);
      const b32 = getPixelRepeat(i32, w, h, x - 1 + xx, y - 1 + yy, 0);
      const a = (a32 & 255) + (a32 >>> 8 & 255) + (a32 >>> 16 & 255);
      const b = (b32 & 255) + (b32 >>> 8 & 255) + (b32 >>> 16 & 255);

      const ofs = y*w+x << 2;
      if(cond(a,b)) {
        const v32 = getPixelRepeat(i32, w, h, x-1+xx, y-1+yy, 0);
        o8[ofs    ] = v32 & 255;
        o8[ofs + 1] = v32 >>> 8 & 255;
        o8[ofs + 2] = v32 >>> 16 & 255;
        o8[ofs + 3] = v32 >>> 24 & 255;
      } else {
        const v32 = getPixelRepeat(i32, w, h, x, y, 0);
        o8[ofs    ] = v32 & 255;
        o8[ofs + 1] = v32 >>> 8 & 255;
        o8[ofs + 2] = v32 >>> 16 & 255;
        o8[ofs + 3] = v32 >>> 24 & 255;
      }
    }
  }
}


