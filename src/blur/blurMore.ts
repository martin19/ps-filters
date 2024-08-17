import {conv2, conv2Packed, premultiplyAlphaPacked, unmultiplyAlphaPacked} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorBlurMore:FilterDescriptor = {
  id : "blurBlurMore",
  name : "Blur More",
  filter1 : filterBlurBlurMore1,
  filter4 : filterBlurBlurMore4
}

async function filterBlurBlurMore1(input:FilterInput, output:FilterOutput) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const mask = [0.0836, 0.1219, 0.0836, 0.1219, 0.1780, 0.1219, 0.0836, 0.1219, 0.0836];
  conv2(i8, o8, w, h, mask, 3, 3);
}

async function filterBlurBlurMore4(input:FilterInput, output:FilterOutput) {
  const i32 = new Uint8Array(input.img);
  const o32 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  premultiplyAlphaPacked(i32.buffer);
  const mask = [0.0836, 0.1219, 0.0836, 0.1219, 0.1780, 0.1219, 0.0836, 0.1219, 0.0836];
  conv2Packed(i32.buffer, o32.buffer, w, h, mask, 3, 3);
  unmultiplyAlphaPacked(o32.buffer);
}