import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {filterEachChannelKeepAlpha} from "../utils/utils-filter";

export const filterDescriptorStylizeSolarize:FilterDescriptor = {
  id : "stylizeSolarize",
  name : "Solarize",
  filter1 : filterStylizeSolarize1,
  filter4 : filterEachChannelKeepAlpha(filterStylizeSolarize1),
}

export interface FilterStylizeSolarizeOptions {
  strength : number;
}

async function filterStylizeSolarize1(input:FilterInput, output:FilterOutput, options:FilterStylizeSolarizeOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  for(let i = 0; i < i8.length; i++) {
    if(i8[i] > 128) {
      o8[i] = 255-i8[i];
    } else {
      o8[i] = i8[i];
    }
  }
}