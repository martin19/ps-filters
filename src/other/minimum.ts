import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {dilateVhgw} from "../morphology/erodeDilateVhgw";
import {filterEachChannelPremultiplied} from "../utils/utils-filter";

export const filterDescriptorOtherMinimum:FilterDescriptor = {
  id : "otherMinimum",
  name : "Minimum",
  filter1 : filterOtherMinimum1,
  filter4 : filterEachChannelPremultiplied(filterOtherMinimum1),
  parameters : {
    radius: {name: "radius", type: "int", min: 1, max: 500, default: 1}
  }
}

export interface FilterOtherMinimumOptions {
  radius : number
}

export async function filterOtherMinimum1(input:FilterInput, output:FilterOutput, options:FilterOtherMinimumOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  dilateVhgw(i8, o8, w, h, options.radius*2+1, "square");
}