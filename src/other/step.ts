import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorOtherStep:FilterDescriptor = {
  id : "otherStep",
  filter1 : filterOtherStep1,
  parameters : {
    threshold: {name: "threshold", type: "int", min: 0, max: 255, default: 128}
  }
}

export interface FilterOtherStepOptions {
  threshold : number
}

async function filterOtherStep1(input:FilterInput, output:FilterOutput, options:FilterOtherStepOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  for(let i = 0; i < i8.length; i++) o8[i] = i8[i] > options.threshold ? 255 : 0;
}