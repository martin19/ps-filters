import {joinRGBA, splitRGBA} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";
import {
  distanceTransformMeijster,
  distanceTransformMeijsterAA,
  distanceTransformMetric
} from "./DistanceTransformMeijster";

export const filterDistanceBorderDefaults = {
  metric : "manhattan",
  antiAlias : false,
  radius : 0
}

export const filterDistanceBorderOptions = {
  metric : [["euclidean","manhattan","chess"]],
  antiAlias: false,
  radius : [0,200,0]
}

interface FilterDistanceBorderOptions {
  metric : "euclidean"|"manhattan"|"chess",
  antiAlias : boolean;
  radius : number;
}

export function filterDistanceBorder4(input:U8Array, output:U8Array, w:number, h:number, options:FilterDistanceBorderOptions) {
  const {r:rIn,g:gIn,b:bIn,a:aIn} = splitRGBA(input);
  const {r:rOut,g:gOut,b:bOut,a:aOut} = splitRGBA(output);

  const cIn = [rIn,gIn,bIn];
  const cOut = [rOut,gOut,bOut];

  for(let i = 0; i < 3; i++) {
    filterDistanceBorder1(cIn[i], cOut[i], w, h, options);
  }

  joinRGBA(output, cOut[0], cOut[1], cOut[2], aIn);
}

export function filterDistanceBorder1(input:U8Array, output:U8Array, w:number, h:number, options:FilterDistanceBorderOptions) {

  const distanceNeg = new Int32Array(w * h);
  const distancePos = new Int32Array(w * h);

  if(options.antiAlias) {
    distanceTransformMeijsterAA(input, distanceNeg, w, h, distanceTransformMetric(options.metric));
    for(let i = 0; i < distanceNeg.length; i++) { output[i] = Number(distanceNeg[i]/256); }
  } else {
    distanceTransformMeijster(input, distanceNeg, w, h, { metric : distanceTransformMetric(options.metric), threshold : 128 });
    const tmp = new Uint8Array(w*h);
    for(let i = 0; i < tmp.length; i++) tmp[i] = 255 - input[i];
    distanceTransformMeijster(tmp, distancePos, w, h, { metric : distanceTransformMetric(options.metric), threshold : 128 });
    for(let i = 0; i < distanceNeg.length; i++) {
      const a = ((options.radius+1) - Math.min((options.radius+1), Math.max(0, distanceNeg[i])))*(255/(options.radius+1));
      const b = ((options.radius+1) - Math.min((options.radius+1), Math.max(0, distancePos[i]-1)))*(255/(options.radius+1));
      output[i] = Math.min(a,b);
    }
  }
}