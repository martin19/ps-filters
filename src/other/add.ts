import {clamp} from "../utils/utils-filter";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorOtherAdd:FilterDescriptor = {
  id : "otherAdd",
  filter1 : filterOtherAdd1,
  parameters : {
    value: {name: "value", type: "int", min: -255, max: 255, default: 0}
  }
}

export interface FilterOtherAddOptions {
  value : number
}

async function filterOtherAdd1(input:FilterInput, output:FilterOutput, options:FilterOtherAddOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const value = options.value;
  for(let i = 0; i < i8.length; i++) o8[i] = clamp(i8[i] + value, 0, 255);
}