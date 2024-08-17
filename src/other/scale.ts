import {clamp} from "../utils/utils-filter";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorOtherScale:FilterDescriptor = {
  id : "otherScale",
  filter1 : filterOtherScale1,
  parameters : {
    value: {name: "value", type: "float", min: 0, max: 10, default: 1.5}
  }
}

export interface FilterOtherScaleOptions {
  value : number
}

async function filterOtherScale1(input:FilterInput, output:FilterOutput, options:FilterOtherScaleOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const value = options.value;
  for(let i = 0; i < i8.length; i++) o8[i] = clamp(i8[i] * value, 0, 255);
}