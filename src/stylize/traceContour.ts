import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {filterEachChannelPremultiplied} from "../utils/utils-filter";

export const filterDescriptorStylizeTraceContour:FilterDescriptor = {
  id : "stylizeTraceContour",
  name : "Trace Contour",
  filter1 : filterStylizeTraceContour1,
  filter4 : filterEachChannelPremultiplied(filterStylizeTraceContour1),
  parameters : {
    level: {name: "level", type: "int", min: 0, max: 255, default: 100},
    edgeType: {name: "edgeType", type: "enum", values: ["lower", "upper"], default: "upper"}
  }
}

export interface FilterStylizeTraceContourOptions {
  level : number,
  edgeType : "lower"|"upper"
}

function applyThresholdsUpper(input:U8Array, output:U8Array, w:number, h:number, ofs:number, options:FilterStylizeTraceContourOptions) {
  if(input[ofs] >= options.level) {
    if(input[ofs+1] < options.level) output[ofs] = 255;
    else if(input[ofs-1] < options.level) output[ofs] = 255;
    else if(input[ofs-w] < options.level) output[ofs] = 255;
    else if(input[ofs+w] < options.level) output[ofs] = 255;
  }
}

function applyThresholdsLower(input:U8Array, output:U8Array, w:number, h:number, ofs:number, options:FilterStylizeTraceContourOptions) {
  if(input[ofs] <= options.level) {
    if(input[ofs+1] > options.level) output[ofs] = 255;
    else if(input[ofs-1] > options.level) output[ofs] = 255;
    else if(input[ofs-w] > options.level) output[ofs] = 255;
    else if(input[ofs+w] > options.level) output[ofs] = 255;
  }
}

//exact algorithm at: https://github.com/amix/photoshop/blob/2baca147594d01cf9d17db92e3d5148989600529/UFilters.a
async function filterStylizeTraceContour1(input:FilterInput, output:FilterOutput, options:FilterStylizeTraceContourOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  for(let i = 0; i < o8.length; i++) o8[i] = 0;
  for(let y = 1; y < h; y++) {
    for(let x = 1; x < w; x++) {
      const ofs = y*w+x;
      if(options.edgeType === "lower") {
        applyThresholdsLower(i8, o8, w, h, ofs, options);
      } else {
        applyThresholdsUpper(i8, o8, w, h, ofs, options);
      }
    }
  }
  for(let i = 0; i < o8.length; i++) o8[i] = 255 - o8[i];
}