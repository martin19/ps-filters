import {U8Array} from "../utils/Types";
import {joinRGBA, splitRGBA} from "../utils/utils-filter";
import {boxBlur} from "../utils/gauss";
import {erodeExact} from "./erodeDilateExact";
import {erodeVhgw} from "./erodeDilateVhgw";

export const filterMorphologyErodeDefaults = {
  radius : 10,
  structureElement: "round",
}

export const filterMorphologyErodeOptions = {
  radius : [1, 500, 1],
  structureElement : [["square","round"]],
}

interface FilterMorphologyErodeOptions {
  radius : number;
  structureElement:"square"|"octagon"|"round";
}

export function filterMorphologyErode4(input:U8Array, output:U8Array, w:number, h:number, options:FilterMorphologyErodeOptions) {
  const {r:rIn,g:gIn,b:bIn,a:aIn} = splitRGBA(input);
  const {r:rOut,g:gOut,b:bOut,a:aOut} = splitRGBA(output);

  const cIn = [rIn,gIn,bIn];
  const cOut = [rOut,gOut,bOut];

  for(let i = 0; i < 3; i++) {
    filterMorphologyErode1(cIn[i], cOut[i], w, h, options);
  }

  joinRGBA(output, cOut[0], cOut[1], cOut[2], aIn);
}

export function filterMorphologyErode1(input:U8Array, output:U8Array, w:number, h:number, options:FilterMorphologyErodeOptions) {
  if(options.structureElement === "round") {
    erodeExact(input, output, w, h, options.radius, options.structureElement);
  } else {
    erodeVhgw(input, output, w, h, options.radius, options.structureElement)
  }
}