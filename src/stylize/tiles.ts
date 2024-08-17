import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {joinRGBA, premultiplyAlphaPacked, splitRGBA} from "../utils/utils-filter";

export const filterDescriptorStylizeTiles:FilterDescriptor = {
  id : "stylizeTiles",
  name : "Tiles",
  filter1 : filterStylizeTiles1,
  filter4 : filterStylizeTiles4,
  parameters : {
    tileCount: {name: "tileCount", type: "int", min: 1, max: 99, default: 10},
    tileOffset: {name: "tileOffset", type: "int", min: 1, max: 99, default: 10},
    fillEmptyAreaWith: {
      name: "fillEmptyAreaWith",
      type: "enum",
      values: ["backgroundColor", "foregroundColor", "inverseImage", "unalteredImage"],
      default: "backgroundColor"
    }
  }
}

export interface FilterStylizeTilesOptions {
  foregroundColor : number[],
  backgroundColor : number[],
  tileCount : number,
  tileOffset : number,
  fillEmptyAreaWith: "backgroundColor"|"foregroundColor"|"inverseImage"|"unalteredImage"
}

async function filterStylizeTiles4(input:FilterInput, output:FilterOutput, options:FilterStylizeTilesOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;
  const len = w*h;

  let {a:aIn, b:bIn, g:gIn, r:rIn} = splitRGBA(i8);
  const rOut = new Uint8Array(len);
  const gOut = new Uint8Array(len);
  const bOut = new Uint8Array(len);
  const aOut = new Uint8Array(len);

  filterStylizeTilesCore4([rIn, gIn, bIn, aIn], [rOut, gOut, bOut, aOut], w, h, {...options, ...{
    foregroundColor : input.foregroundColor ?? [255, 255, 255],
    backgroundColor : input.backgroundColor ?? [  0,   0,   0]
    }
  });
  aOut.set(aIn);

  joinRGBA(o8, rOut, gOut, bOut, aOut);
}

async function filterStylizeTiles1(input:FilterInput, output:FilterOutput, options:FilterStylizeTilesOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  filterStylizeTilesCore1(i8, o8, w, h, {...options, ...{
      foregroundColor : input.foregroundColor ?? [255, 255, 255],
      backgroundColor : input.backgroundColor ?? [  0,   0,   0]
    }
  });
}


function filterStylizeTilesCore1(input:U8Array, output:U8Array, w:number, h:number, options:FilterStylizeTilesOptions) {
  if(options.fillEmptyAreaWith === "backgroundColor") {
    output.fill(0);
  } else if(options.fillEmptyAreaWith === "foregroundColor") {
    output.fill(255);
  } else if(options.fillEmptyAreaWith === "unalteredImage") {
    for(let i = 0; i < output.length; i++) output[i] = input[i];
  } else if(options.fillEmptyAreaWith === "inverseImage") {
    for(let i = 0; i < output.length; i++) {
      output[i] = 255 - input[i];
    }
  }

  const count = options.tileCount;
  const tileSize = Math.ceil(Math.min(w,h)/count);
  const s = tileSize-2;
  const s2 = s/2;
  const tileCountX = Math.min(w,h) === w ? count : Math.floor(count * (w/h));
  const tileCountY = Math.min(w,h) === h ? count : Math.floor(count * (h/w));

  const dx = w/(tileCountX);
  const dy = h/(tileCountY);

  let cy = tileSize/2;
  for(let y = 0; y < tileCountY; y++) {
    let cx = tileSize/2;
    for(let x = 0; x < tileCountX; x++) {
      const ofsX = 0.5*(Math.random()*2-1) * tileSize * ((options.tileOffset)/100);
      const ofsY = 0.5*(Math.random()*2-1) * tileSize * ((options.tileOffset)/100);
      copy1(input, output, w, h, Math.round(cx-s2+ofsX), Math.round(cy-s2+ofsY), Math.round(cx-s2), Math.round(cy-s2), s, s);
      cx += dx;
    }
    cy += dy;
  }
}

function copy1(input:U8Array, output:U8Array, w:number, h:number, dx:number, dy:number, sx:number, sy:number, sw:number, sh:number) {
  const ex = Math.min(w-1, sx + sw);
  const ey = Math.min(h-1, sy + sh);
  for(let y = 0; y <= ey-sy; y++) {
    for(let x = 0; x <= ex-sx; x++) {
      if(dx+x < 0 || dx+x > w-1 || dy+y < 0 || dy+y > h-1) continue;
      const ofsSrc = ((y+sy)*w+(x+sx));
      const ofsDst = ((y+dy)*w+(x+dx));
      output[ofsDst] = input[ofsSrc];
    }
  }
}

function copy4(input:U8Array[], output:U8Array[], w:number, h:number, dx:number, dy:number, sx:number, sy:number, sw:number, sh:number) {
  const i0 = input[0];
  const i1 = input[1];
  const i2 = input[2];
  const i3 = input[3];
  const o0 = output[0];
  const o1 = output[1];
  const o2 = output[2];
  const o3 = output[3];

  const ex = Math.min(w-1, sx + sw);
  const ey = Math.min(h-1, sy + sh);
  for(let y = 0; y <= ey-sy; y++) {
    for(let x = 0; x <= ex-sx; x++) {
      if (dx + x < 0 || dx + x > w - 1 || dy + y < 0 || dy + y > h - 1) continue;
      const ofsSrc = ((y + sy) * w + (x + sx));
      const ofsDst = ((y + dy) * w + (x + dx));
      o0[ofsDst] = i0[ofsSrc];
      o1[ofsDst] = i1[ofsSrc];
      o2[ofsDst] = i2[ofsSrc];
      o3[ofsDst] = i3[ofsSrc];
    }
  }
}

function filterStylizeTilesCore4(input:U8Array[], output:U8Array[], w:number, h:number, options:FilterStylizeTilesOptions) {
  const i0 = input[0];
  const i1 = input[1];
  const i2 = input[2];
  const i3 = input[3];
  const o0 = output[0];
  const o1 = output[1];
  const o2 = output[2];
  const o3 = output[3];

  const bg = options.backgroundColor;
  const fg = options.foregroundColor;

  if(options.fillEmptyAreaWith === "backgroundColor") {
    for(let i = 0; i < o0.length; i++) {
      o0[i] = bg[0];
      o1[i] = bg[1];
      o2[i] = bg[2];
      o3[i] = 255;
    }
  } else if(options.fillEmptyAreaWith === "foregroundColor") {
    for(let i = 0; i < o0.length; i++) {
      o0[i] = fg[0];
      o1[i] = fg[1];
      o2[i] = fg[2];
      o3[i] = 255;
    }
  } else if(options.fillEmptyAreaWith === "unalteredImage") {
    for(let i = 0; i < o0.length; i++) {
      o0[i] = i0[i];
      o1[i] = i1[i];
      o2[i] = i2[i];
      o3[i] = i3[i];
    }
  } else if(options.fillEmptyAreaWith === "inverseImage") {
    for(let i = 0; i < o0.length; i++) {
      o0[i] = 255 - i0[i];
      o1[i] = 255 - i1[i];
      o2[i] = 255 - i2[i];
      o3[i] = i3[i];
    }
  }

  const count = options.tileCount;
  const tileSize = Math.ceil(Math.min(w,h)/count);
  const s = tileSize-2;
  const s2 = s/2;
  const tileCountX = Math.min(w,h) === w ? count : Math.floor(count * (w/h));
  const tileCountY = Math.min(w,h) === h ? count : Math.floor(count * (h/w));

  const dx = w/(tileCountX);
  const dy = h/(tileCountY);

  let cy = tileSize/2;
  for(let y = 0; y < tileCountY; y++) {
    let cx = tileSize/2;
    for(let x = 0; x < tileCountX; x++) {
      const ofsX = 0.5*(Math.random()*2-1) * tileSize * ((options.tileOffset)/100);
      const ofsY = 0.5*(Math.random()*2-1) * tileSize * ((options.tileOffset)/100);
      copy4(input, output, w, h, Math.round(cx-s2+ofsX), Math.round(cy-s2+ofsY), Math.round(cx-s2), Math.round(cy-s2), s, s);
      cx += dx;
    }
    cy += dy;
  }
  output[3].set(input[3]);
}