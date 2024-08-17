import {U8Array} from "../utils/Types";
import {joinRGBA, splitRGBA} from "../utils/utils-filter";
import {dilateExact} from "./erodeDilateExact";
import {dilateVhgw} from "./erodeDilateVhgw";

export const filterMorphologyDilateDefaults = {
  radius : 10,
  structureElement: "round",
}

export const filterMorphologyDilateOptions = {
  radius : [1, 500, 1],
  structureElement : [["square","round"]],
}

interface FilterMorphologyDilateOptions {
  radius : number;
  structureElement:"square"|"round"|"octagon";
}

export function filterMorphologyDilate4(input:U8Array, output:U8Array, w:number, h:number, options:FilterMorphologyDilateOptions) {
  const {r:rIn,g:gIn,b:bIn,a:aIn} = splitRGBA(input);
  const {r:rOut,g:gOut,b:bOut,a:aOut} = splitRGBA(output);

  const cIn = [rIn,gIn,bIn];
  const cOut = [rOut,gOut,bOut];

  for(let i = 0; i < 3; i++) {
    filterMorphologyDilate1(cIn[i], cOut[i], w, h, options);
  }

  joinRGBA(output, cOut[0], cOut[1], cOut[2], aIn);
}

export function filterMorphologyDilate1(input:U8Array, output:U8Array, w:number, h:number, options:FilterMorphologyDilateOptions) {
  if(options.structureElement === "round") {
    dilateExact(input, output, w, h, options.radius, options.structureElement);
  } else {
    dilateVhgw(input, output, w, h, options.radius, options.structureElement);
  }

}