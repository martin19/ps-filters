import {conv2, conv2Packed} from "../utils/utils-filter";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorOtherCustom:FilterDescriptor = {
  id : "otherCustom",
  name : "Custom",
  filter1 : filterOtherCustom1,
  parameters : {
    matrix: {
      name: "matrix",
      type: "float[]",
      default: [0, 0, 0, 0, 0, 0, -1, 0, +1, 0, 0, -2, 0, +2, 0, 0, -1, 0, +1, 0, 0, 0, 0, 0, 0]
    },
    scale: {name: "scale", type: "float", min: 1, max: 9999, default: 1},
    offset: {name: "offset", type: "float", min: -9999, max: 9999, default: 0},
  }
}

export interface FilterOtherCustomOptions {
  matrix : number[]
  scale : number,
  offset : number
}

async function filterOtherCustom1(input:FilterInput, output:FilterOutput, options:FilterOtherCustomOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const mask = options.matrix;
  conv2(i8, o8, w, h, mask, 5, 5, { scale : options.scale, offset : options.offset, clamp : true });
}

async function filterOtherCustom4(input:FilterInput, output:FilterOutput, options:FilterOtherCustomOptions) {
  const i32 = new Uint32Array(input.img);
  const o32 = new Uint32Array(output.img);
  const w = input.w;
  const h = input.h;

  const mask = options.matrix;
  conv2Packed(i32.buffer, o32.buffer, w, h, mask, 3, 3, { clamp : true })
}