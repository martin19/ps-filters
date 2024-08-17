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

export const filterDescriptorSharpenSharpen:FilterDescriptor = {
  id : "sharpenSharpen",
  name : "Sharpen",
  filter1 : filterSharpenSharpen1,
  filter4 : filterSharpenSharpen4,
  //alpha : "straight"
}

export const filterSharpenSharpenOptions = {};

async function filterSharpenSharpen1(input:FilterInput, output:FilterOutput) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const mask = [0, -0.2500, 0, -0.2500, 2.0000, -0.2500, 0, -0.2500, 0];
  conv2(i8, o8, w, h, mask, 3, 3, { clamp : true });
}

async function filterSharpenSharpen4(input:FilterInput, output:FilterOutput) {
  const i32 = new Uint32Array(input.img);
  const o32 = new Uint32Array(output.img);
  const w = input.w;
  const h = input.h;

  const mask = [0, -0.2500, 0, -0.2500, 2.0000, -0.2500, 0, -0.2500, 0];
  premultiplyAlphaPacked(i32.buffer);
  conv2Packed(i32.buffer, o32.buffer, w, h, mask, 3, 3, { clamp : true });
  unmultiplyAlphaPacked(o32.buffer);
}