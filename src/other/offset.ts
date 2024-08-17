import {filterEachChannelPremultiplied, getPixel, getPixelRepeat, getPixelWrap} from "../utils/utils-filter";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorOtherOffset:FilterDescriptor = {
  id : "otherOffset",
  name : "Offset",
  filter1 : filterOtherOffset1,
  filter4 : filterEachChannelPremultiplied(filterOtherOffset1),
  parameters : {
    hOfs: {name: "hOfs", type: "int", min: -1000, max: +1000, default: 1},
    vOfs: {name: "vOfs", type: "int", min: -1000, max: +1000, default: 1},
    fillMode: {
      name: "fillMode",
      type: "enum",
      values: ["repeatEdgePixels", "wrapAround", "background"],
      default: "repeatEdgePixels"
    }
  }
}

export interface FilterOtherOffsetOptions {
  hOfs : number,
  vOfs : number,
  fillMode : "repeatEdgePixels"|"wrapAround"|"background",
}

async function filterOtherOffset1(input:FilterInput, output:FilterOutput, options:FilterOtherOffsetOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  let getPixelMode:(x:number,y:number) => number;
  switch(options.fillMode) {
    case "repeatEdgePixels":
      getPixelMode = (x:number, y:number)=>getPixelRepeat(i8, w, h, x, y, 1);
      break;
    case "wrapAround":
      getPixelMode = (x:number, y:number)=>getPixelWrap(i8, w, h, x, y, 0);
      break;
    case "background":
      getPixelMode = (x:number, y:number)=>getPixel(i8, w, h, x, y);
      break;
  }

  const hOfs = options.hOfs;
  const vOfs = options.vOfs;
  let ofs = 0;
  for(let y = 0; y < h; y++) {
    for(let x = 0; x < w; x++) {
      const val = getPixelMode(x + hOfs, y + vOfs);
      o8[ofs] = val;
      ofs++;
    }
  }
}