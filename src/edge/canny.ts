import {U8Array} from "../utils/Types";
import {clamp, conv2, getPixel, joinRGBA, splitRGBA} from "../utils/utils-filter";
import {gaussBlur} from "../utils/gauss";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {bresenhamLine} from "../graphics/bresenham";

export const filterDescriptorEdgeCanny:FilterDescriptor = {
  id : "edgeCanny",
  filter1 : filterEdgeCanny1,
  parameters : {
    radius: {name: "radius", type: "float", min: 0.1, max: 10, default: 1.5},
    threshLo: {name: "threshLo", type: "int", min: 0, max: 255, default: 20},
    threshHi: {name: "threshHi", type: "int", min: 0, max: 255, default: 80},
    mode: {name: "mode", type: "enum", values: ["manual", "automatic"], default: "manual"},
  }
}

//TODO: use this to verify: http://bigwww.epfl.ch/demo/ip/demos/edgeDetector/

export interface FilterEdgeCannyOptions {
  radius : number;
  threshLo : number;
  threshHi : number;
  mode : "manual"|"automatic"
}

const pi12 = Math.PI/2;
const pi18 = Math.PI/8;
const pi38 = 3*pi18;
const pi58 = 5*pi18;
const pi78 = 7*pi18;

async function filterEdgeCanny1(input:FilterInput, output:FilterOutput, options:FilterEdgeCannyOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const len = w*h;
  const start = performance.now();
  const inputCopy = new Float32Array(len);
  const blurred = new Float32Array(len);
  const edgeMagnitude = new Float32Array(len);
  const edgeOrientation = new Float32Array(len);
  const nonMaxSuppressed = new Float32Array(len);
  const final = new Float32Array(len);
  copyArray(inputCopy, i8);
  gaussBlur(inputCopy, blurred, w, h, options.radius);
  computeEdges(blurred, edgeMagnitude, edgeOrientation, w, h);
  nonMaximumSuppressionFast(edgeMagnitude, edgeOrientation, nonMaxSuppressed, w, h, Math.max(2, Math.ceil(options.radius*2)));
  hysteresis(nonMaxSuppressed, final, w, h, options.threshLo, options.threshHi);
  //visualize orientation
  // for(let i=0; i < len; i++) {
  //   output[i] = clamp(((edgeOrientation[i]+Math.PI)/(2*Math.PI))*255, 0, 255);
  // }
  // copyArray(output, nonMaxSuppressed);
  // copyArray(output, nonMaxSuppressed);

  // for(let i = 0; i < len; i++) output[i] = blurred[i];
  // for(let i = 0; i < len; i++) output[i] = clamp(edgeMagnitude[i]*255, 0, 255)
  // for(let i = 0; i < len; i++) output[i] = clamp(nonMaxSuppressed[i]*255, 0, 255)
  for(let i = 0; i < len; i++) o8[i] = clamp(final[i]*255, 0, 255);
}

function hysteresis(input:Float32Array, output:Float32Array, w:number, h:number, threshLo:number, threshHi:number) {
  const len = input.length;
  const tLo = threshLo/255;
  const tHi = threshHi/255;
  //drop low and accept high pixels
  for(let i = 0; i < len; i++) {
    if(input[i] > tHi) output[i] = 255;
    else if(input[i] < tLo) output[i] = 0;
    else output[i] = input[i];
  }

  for(let y = 0; y < h; y++) {
    for(let x = 0; x < w; x++) {
      const n0 = getPixel(output, w, h, x, y);
      if(n0 === 0 || n0 === 255) continue;
      const n1 = getPixel(output, w, h, x+1, y) === 255;
      const n2 = getPixel(output, w, h, x+1, y-1) === 255;
      const n3 = getPixel(output, w, h, x, y-1) === 255;
      const n4 = getPixel(output, w, h, x-1, y-1) === 255;
      const n5 = getPixel(output, w, h, x-1, y) === 255;
      const n6 = getPixel(output, w, h, x-1, y+1) === 255;
      const n7 = getPixel(output, w, h, x, y+1) === 255;
      const n8 = getPixel(output, w, h, x+1, y+1) === 255;
      if(n1 || n2 || n3 || n4 || n5 || n6 || n7 || n8) output[y*w+x] = 255;
      else output[y*w+x] = 0;
    }
  }
}

function nonMaximumSuppressionFast(edgeMagnitude:Float32Array, edgeOrientation:Float32Array, output:Float32Array, w:number, h:number, size:number) {
  for(let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ofs = y*w+x;
      // const direction = getDirection(edgeOrientation[ofs]);
      const val = edgeMagnitude[ofs];
      const dy = Math.cos(edgeOrientation[ofs]+pi12);
      const dx = Math.sin(edgeOrientation[ofs]+pi12);

      let isMax = true;
      const sizedx = size*dx;
      const sizedy = size*dy;
      const x0 = Math.round(x + (-sizedx));
      const y0 = Math.round(y + (-sizedy));
      const x1 = Math.round(x + (+sizedx));
      const y1 = Math.round(y + (+sizedy));
      bresenhamLine(x0, y0, x1, y1, (x, y)=> {
        if(x < 0 || x > w || y < 0 || y > h) return true;
        const val2 = edgeMagnitude[y*w+x];
        if(val2 > val) {
          isMax = false;
          return false;
        } else return true;
      });

      if(isMax) output[ofs] = val;
      else output[ofs] = 0;
    }
  }
}

function computeEdges(input:Float32Array, edgeMagnitude:Float32Array, edgeOrientation:Float32Array, w:number, h:number) {
  const len = w*h;
  const Fx = new Float32Array(len);
  const Fy = new Float32Array(len);

  //compute gradient magnitude and direction
  const sx = [ +1,  0, -1, +2, 0, -2, +1,  0, -1];
  const sy = [ -1, -2, -1,  0, 0,  0, +1, +2, +1];
  conv2(input, Fx, w, h, sx, 3, 3);
  conv2(input, Fy, w, h, sy, 3, 3);

  let maxMag = Number.NEGATIVE_INFINITY;
  for(let i = 0; i < len; i++) {
    const mag = Math.sqrt(Fx[i]*Fx[i]+Fy[i]*Fy[i]);
    let ang = Math.atan2(Fy[i], Fx[i]);

    if(mag > maxMag) maxMag = mag;
    edgeMagnitude[i] = mag;
    edgeOrientation[i] = ang;
  }

  //normalize edge magnitude
  for(let i = 0; i < len; i++) edgeMagnitude[i] = (edgeMagnitude[i]/maxMag);
}

enum Direction {
  e , ne, n, nw, w, sw, s, se
}

//TODO: why the fuck is this right and below wrong.
function getDirection(rad : number) {
  if((rad > -pi18 && rad < 0) || (rad > 0 && rad < pi18)) return Direction.e;
  else if(rad < -pi18 && rad > -pi38) return Direction.nw;
  else if(rad < -pi38 && rad > -pi58) return Direction.n;
  else if(rad < -pi58 && rad > -pi78) return Direction.ne;
  else if((rad < -pi78 && rad > -Math.PI) || (rad > pi78 && rad < Math.PI)) return Direction.w;
  else if(rad < pi78 && rad > pi58) return Direction.se;
  else if(rad < pi58 && rad > pi38) return Direction.s;
  else if(rad < pi38 && rad > pi18) return Direction.sw;
}

// function getDirection(rad : number) {
//   if((rad > -pi18 && rad < 0) || (rad > 0 && rad < pi18)) return Direction.e;
//   else if(rad < -pi18 && rad > -pi38) return Direction.ne;
//   else if(rad < -pi38 && rad > -pi58) return Direction.n;
//   else if(rad < -pi58 && rad > -pi78) return Direction.nw;
//   else if((rad < -pi78 && rad > -Math.PI) || (rad > pi78 && rad < Math.PI)) return Direction.w;
//   else if(rad < pi78 && rad > pi58) return Direction.sw;
//   else if(rad < pi58 && rad > pi38) return Direction.s;
//   else if(rad < pi38 && rad > pi18) return Direction.se;
// }

function copyArray(dst:U8Array|Uint32Array|Float32Array, src:U8Array|Uint32Array|Float32Array) {
  for(let i = 0; i < dst.length; i++) dst[i] = src[i];
}