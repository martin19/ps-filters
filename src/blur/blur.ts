import {conv2, conv2Packed, premultiplyAlphaPacked, unmultiplyAlphaPacked} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorBlur:FilterDescriptor = {
  id : "blurBlur",
  name : "Blur",
  filter1 : filterBlurBlur1,
  filter4 : filterBlurBlur4
}

type FilterBlurOptions = {};

async function filterBlurBlur1(input:FilterInput, output:FilterOutput, options:FilterBlurOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const mask = [0.0175, 0.0973, 0.0175, 0.0973, 0.5406, 0.0973, 0.0175, 0.0973, 0.0175];
  conv2(i8, o8, w, h, mask, 3, 3);
}

async function filterBlurBlur4(input:FilterInput, output:FilterOutput, options:FilterBlurOptions) {
  const i32 = new Uint8Array(input.img);
  const o32 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  premultiplyAlphaPacked(i32.buffer);
  const mask = [0.0175, 0.0973, 0.0175, 0.0973, 0.5406, 0.0973, 0.0175, 0.0973, 0.0175];
  conv2Packed(i32.buffer, o32.buffer, w, h, mask, 3, 3);
  unmultiplyAlphaPacked(o32.buffer);
}