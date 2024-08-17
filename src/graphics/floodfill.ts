import {getPixel, getPixel4, joinRGBA, splitRGBA} from "../utils/utils-filter";
import {boxBlur} from "../utils/gauss";
import {U8Array} from "../utils/Types";
import {floodFill1, floodFill4} from "./floodfillCore";
import {resize} from "../resize/resize";
import {Rect} from "../../../Utils/Rect";

export const filterGraphicsFloodfillDefaults = {
  x : 0,
  y : 0,
  seedColor : [0,0,0,0],
  tolerance : 0,
  antialias : false
}

export const filterGraphicsFloodfillOptions = {
  x : [0, 1000, 1],
  y : [0, 1000, 1],
  tolerance : [0,255],
  antialias:  false
}

export type FilterGraphicsFloodfillOptions = {
  x:number,
  y:number,
  sampleSize?:"point"|"3x3"|"5x5"|"11x11"|"31x31"|"51x51"|"101x101",
  bboxIn?:Rect,
  tolerance?:number,
  antialias?:boolean;
  contiguous?:boolean;
};

export function filterGraphicsFloodfill41(input:U8Array, output:U8Array, w:number, h:number, options:FilterGraphicsFloodfillOptions) {

  const seedColor = getPixel4(input, w, h, options.x, options.y);

  if(options.antialias) {
    const {r:rIn,g:gIn,b:bIn,a:aIn} = splitRGBA(input);
    const {r:rOut,g:gOut,b:bOut,a:aOut} = splitRGBA(output);
    const cIn = [rIn,gIn,bIn];

    const r2x = new Uint8Array(w*h*4);
    const g2x = new Uint8Array(w*h*4);
    const b2x = new Uint8Array(w*h*4);
    const a2x = new Uint8Array(w*h*4);

    resize(rIn, r2x, w, h, w*2, h*2, { method : "bilinear" });
    resize(gIn, g2x, w, h, w*2, h*2, { method : "bilinear" });
    resize(bIn, b2x, w, h, w*2, h*2, { method : "bilinear" });
    resize(aIn, a2x, w, h, w*2, h*2, { method : "bilinear" });

    const rgba2x = new Uint8Array(w*h*4*4);
    const fill2x = new Uint8Array(w*h*4);
    joinRGBA(rgba2x, r2x, g2x, b2x, a2x);

    floodFill4(rgba2x, fill2x, w*2, h*2, { ...options, x : options.x*2, y : options.y*2, seedColor });
    const tmp = new Uint8Array(w*2 * h*2);
    boxBlur(fill2x, tmp, w*2, h*2, 1);

    resize(tmp, output, w*2, h*2, w, h, { method : "nearest" });

  } else {
    floodFill4(input, output, w, h, { ...options, seedColor });
  }
}

export function filterGraphicsFloodfill11(input:U8Array, output:U8Array, w:number, h:number, options:FilterGraphicsFloodfillOptions) {

  const seedColor = [getPixel(input, w, h, options.x, options.y)];

  if(options.antialias) {
    const i2x = new Uint8Array(w*h*4);
    const o2x = new Uint8Array(w*h*4);
    resize(input, i2x, w, h, w*2, h*2, { method : "bilinear" });
    floodFill1(i2x, o2x, w, h, { ...options, x : options.x*2, y : options.y*2, seedColor });
    const tmp = new Uint8Array(w*h*4);;
    boxBlur(o2x, tmp, w*2, h*2, 1);
    resize(tmp, output, w*2, h*2, w, h, { method : "nearest" });
  } else {
    floodFill1(input, output, w, h, {...options, seedColor });
  }

}


