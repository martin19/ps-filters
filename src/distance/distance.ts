import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {distanceTransformMeijster, distanceTransformMetric} from "./DistanceTransformMeijster";

export const filterDescriptorUtilDistanceTransform:FilterDescriptor = {
  id : "utilDistanceTransform",
  filter1 : filterUtilDistanceTransform1,
  parameters : {
    threshold: {name: "threshold", type: "int", min: 0, max: 255, default: 128},
    radius: {name: "radius", type: "int", min: 0, max: 255, default: 100},
    metric: {name: "metric", type: "enum", values: ["euclidean", "manhattan", "chess"], default: "euclidean"},
    direction: {name: "direction", type: "enum", values: ["positive", "negative", "both"], default: "both"},
  }
}

export interface FilterUtilDistanceTransformOptions {
  threshold : number;
  radius : number;
  metric : "euclidean"|"manhattan"|"chess";
  direction : "positive"|"negative"|"both";
}

async function filterUtilDistanceTransform1(input:FilterInput, output:FilterOutput, options:FilterUtilDistanceTransformOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const len = w*h;
  const tmp = new Uint8Array(w*h);
  const distanceNeg = new Int32Array(len);
  const distancePos = new Int32Array(len);
  distanceTransformMeijster(i8, distancePos, w, h, { metric : distanceTransformMetric(options.metric), threshold : options.threshold });

  for(let i = 0; i < tmp.length; i++) tmp[i] = 255 - i8[i];
  distanceTransformMeijster(tmp, distanceNeg, w, h, { metric : distanceTransformMetric(options.metric), threshold : options.threshold });

  if(options.direction === "both") {
    for(let i = 0; i < distanceNeg.length; i++) {
      const a = ((options.radius+1) - Math.min((options.radius+1), Math.max(0, distanceNeg[i])))*(255/(options.radius+1));
      const b = ((options.radius+1) - Math.min((options.radius+1), Math.max(0, distancePos[i]-1)))*(255/(options.radius+1));
      o8[i] = Math.min(a,b);
    }
  } else if(options.direction === "positive") {
    for(let i = 0; i < distancePos.length; i++) {
      o8[i] = ((options.radius+1) - Math.min((options.radius+1), Math.max(0, distancePos[i]-1)))*(255/(options.radius+1));
    }
  } else if(options.direction === "negative") {
    for(let i = 0; i < distanceNeg.length; i++) {
      o8[i] = ((options.radius+1) - Math.min((options.radius+1), Math.max(0, distanceNeg[i])))*(255/(options.radius+1));
    }
  }

  // if(options.direction === "positive") {
  //   for(let i = 0; i < len; i++) {
  //     output[i] = Math.max(0, Math.min(255, distancePos[i]));
  //   }
  // }  else if(options.direction === "negative") {
  //   for(let i = 0; i < len; i++) {
  //     output[i] = Math.max(0, Math.min(255, distanceNeg[i]));
  //   }
  // } else if(options.direction === "both") {
  //   for(let i = 0; i < len; i++) {
  //     output[i] = Math.max(0, Math.min(255, Math.max(distancePos[i], distanceNeg[i])));
  //   }
  // }
}