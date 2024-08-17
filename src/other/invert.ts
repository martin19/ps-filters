import {filterEachChannelKeepAlpha} from "../utils/utils-filter";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorOtherInvert:FilterDescriptor = {
  id : "otherInvert",
  filter1 : filterOtherInvert1,
  filter4 : filterEachChannelKeepAlpha(filterOtherInvert1),
}

export interface FilterOtherInvertOptions {
  radius : number
}

async function filterOtherInvert1(input:FilterInput, output:FilterOutput, options:FilterOtherInvertOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  for(let i = 0; i < i8.length; i++) o8[i] = 255-i8[i];
}