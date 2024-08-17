import {filterEachChannelPremultiplied} from "../utils/utils-filter";
import {medianHuang} from "../median/median-huang";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorNoiseMedian:FilterDescriptor = {
  id : "noiseMedian",
  name : "Median",
  filter1 : filterMedianMedian1,
  filter4 : filterEachChannelPremultiplied(filterMedianMedian1),
  parameters : {
    radius: {name: "radius", type: "int", min: 1, max: 500, default: 10}
  }
}

interface FilterMorphologyDilateOptions {
  radius : number;
}

export async function filterMedianMedian1(input:FilterInput, output:FilterOutput, options:FilterMorphologyDilateOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  // medianCtmf(input, output, w, h, options.radius); //132ms on 500x500
  medianHuang(i8, o8, w, h, options.radius); //64ms on 500x500
}