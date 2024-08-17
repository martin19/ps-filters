import {
  getPixelRepeat,
  joinRGBA,
  splitRGBA,
  conv2,
  premultiplyAlphaPacked,
  filterEachChannelPremultiplied
} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterFn, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorBlurAverage:FilterDescriptor = {
  id : "blurAverage",
  name : "Average",
  filter1 : filterBlurAverage1,
  filter4 : filterEachChannelPremultiplied(filterBlurAverage1),
}

type FilterAverageOptions = {};

async function filterBlurAverage1(input:FilterInput, output:FilterOutput, options:FilterAverageOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const len = w*h;
  let sum = 0;
  for(let i = 0; i < len; i++) sum += i8[i];
  o8.fill(sum/len);
}

// async function filterBlurAverage4Packed(input:FilterInput, output:FilterOutput, options:FilterAverageOptions) {
//   const len = w*h;
//   const i32 = new Uint32Array(input);
//   const o8 = new Uint8Array(output);
//   let avgR = 0;
//   let avgG = 0;
//   let avgB = 0;
//   for(let i = 0; i < len; i++) {
//     const v32 = i32[i];
//     avgR += v32 & 255;
//     avgG += v32 >>> 8 & 255;
//     avgB += v32 >>> 16 & 255;
//   }
//   avgR /= len;
//   avgG /= len;
//   avgB /= len;
//   for(let i = 0; i < len; i++) {
//     const ofs = i << 2;
//     o8[ofs    ] = avgR;
//     o8[ofs + 1] = avgG;
//     o8[ofs + 2] = avgB;
//     o8[ofs + 3] = i32[i] >>> 24 & 255;
//   }
// }