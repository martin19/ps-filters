import {premultiplyAlphaPacked, unmultiplyAlphaPacked} from "../utils/utils-filter";
import {gaussBlur, gaussBlurPacked} from "../utils/gauss";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorOtherHighPass:FilterDescriptor = {
  id : "otherHighPass",
  name : "High Pass",
  filter1 : filterOtherHighPass1,
  filter4 : filterOtherHighPass4,
  parameters : {
    radius: {name: "radius", type: "float", min: 0.1, max: 1000, default: 3},
  }
}

export interface FilterOtherHighPassOptions {
  radius : number
}

async function filterOtherHighPass1(input:FilterInput, output:FilterOutput, options:FilterOtherHighPassOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const inputCopy = new Uint8Array(i8.length);
  for(let i = 0; i < i8.length; i++) inputCopy[i] = i8[i];
  gaussBlur(i8, o8, w, h, options.radius);
  for(let i = 0; i < i8.length; i++) o8[i] = Math.max(0, Math.min(255, 128 + inputCopy[i] - o8[i]));
}

async function filterOtherHighPass4(input:FilterInput, output:FilterOutput, options:FilterOtherHighPassOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const i8Copy = new Uint8Array(i8.length);
  i8Copy.set(new Uint8Array(i8));
  premultiplyAlphaPacked(i8.buffer);
  gaussBlurPacked(i8.buffer, o8.buffer, w, h, options.radius);
  unmultiplyAlphaPacked(o8.buffer);
  for(let i = 0; i < i8.length; i+=4) {
    o8[i    ] = Math.max(0, Math.min(255, 128 + (i8Copy[i    ] - o8[i    ])));
    o8[i + 1] = Math.max(0, Math.min(255, 128 + (i8Copy[i + 1] - o8[i + 1])));
    o8[i + 2] = Math.max(0, Math.min(255, 128 + (i8Copy[i + 2] - o8[i + 2])));
    o8[i + 3] = i8Copy[i + 3];
  }
}