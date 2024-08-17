import {U8Array} from "../utils/Types";
import {getPixelBilinear, getPixelBilinearRepeat} from "../utils/utils-filter";

export function resize(input:U8Array, output:U8Array, wIn:number, hIn:number, wOut:number, hOut:number, options?:{ method : "nearest"|"bilinear"|"bicubic" }) {
  const method = options?.method ?? "bilinear";
  switch(method) {
    case "nearest": resizeNearest(input, output, wIn, hIn, wOut, hOut); return;
    case "bilinear": resizeBilinear(input, output, wIn, hIn, wOut, hOut); return;
    case "bicubic": resizeBicubic(input, output, wIn, hIn, wOut, hOut); return;
  }
}

function resizeNearest(input:U8Array, output:U8Array, wIn:number, hIn:number, wOut:number, hOut:number) {
  for(let y = 0; y < hOut; y++) {
    for (let x = 0; x < wOut; x++) {
      const xSrc = Math.round((x/wOut)*wIn);
      const ySrc = Math.round((y/hOut)*hIn);
      output[y*wOut+x] = input[ySrc*wIn+xSrc];
    }
  }
}

function resizeBilinear(input:U8Array, output:U8Array, wIn:number, hIn:number, wOut:number, hOut:number) {
  for(let y = 0; y < hOut; y++) {
    for(let x = 0; x < wOut; x++) {
      const xx = (x/wOut)*wIn;
      const yy = (y/hOut)*hIn;
      output[y*wOut+x] = getPixelBilinear(input, wIn, hIn, xx, yy);
    }
  }
}

function resizeBicubic(input:U8Array, output:U8Array, wIn:number, hIn:number, wOut:number, hOut:number) {
  //TODO:
}

function resizeLancosz(input:U8Array, output:U8Array, wIn:number, hIn:number, wOut:number, hOut:number) {
  //TODO:
}