import {
  conv2,
  conv2Packed,
  joinRGBA,
  premultiplyAlphaPacked,
  splitRGBA,
  unmultiplyAlphaPacked
} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorSharpenSharpenMore:FilterDescriptor = {
  id : "sharpenSharpenMore",
  name : "Sharpen More",
  filter1 : filterSharpenSharpenMore1,
  filter4 : filterSharpenSharpenMore4,
  // alpha : "straight"
}


export const filterSharpenSharpenMoreOptions = {}

async function filterSharpenSharpenMore1(input:FilterInput, output:FilterOutput) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const mask = [-0.21875000000000003, -0.31250000000000006, -0.21875000000000003,
    -0.31250000000000006, 3.125000000000001, -0.31250000000000006,
    -0.21875000000000003, -0.31250000000000006, -0.21875000000000003];
  conv2(i8, o8, w, h, mask, 3, 3, { clamp : true });
}

async function filterSharpenSharpenMore4(input:FilterInput, output:FilterOutput) {
  const i32 = new Uint32Array(input.img);
  const o32 = new Uint32Array(output.img);
  const w = input.w;
  const h = input.h;

  const mask = [-0.21875000000000003, -0.31250000000000006, -0.21875000000000003,
    -0.31250000000000006, 3.125000000000001, -0.31250000000000006,
    -0.21875000000000003, -0.31250000000000006, -0.21875000000000003];
  premultiplyAlphaPacked(i32.buffer);
  conv2Packed(i32.buffer, o32.buffer, w, h, mask, 3, 3, { clamp : true });
  unmultiplyAlphaPacked(o32.buffer);
}