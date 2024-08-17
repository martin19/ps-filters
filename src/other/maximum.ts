import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {erodeVhgw} from "../morphology/erodeDilateVhgw";
import {filterEachChannelPremultiplied} from "../utils/utils-filter";

export const filterDescriptorOtherMaximum:FilterDescriptor = {
  id : "otherMaximum",
  name : "Maximum",
  filter1 : filterOtherMaximum1,
  filter4 : filterEachChannelPremultiplied(filterOtherMaximum1),
  parameters : {
    radius: {name: "radius", type: "int", min: 1, max: 500, default: 1}
  }
}

export interface FilterOtherMaximumOptions {
  radius : number
}

export async function filterOtherMaximum1(input:FilterInput, output:FilterOutput, options:FilterOtherMaximumOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  erodeVhgw(i8, o8, w, h, options.radius*2+1, "square");
}