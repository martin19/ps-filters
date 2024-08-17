import {U8Array} from "../utils/Types";
import {clamp, conv2, getPixel, getPixelRepeat} from "../utils/utils-filter";
import {boxBlur, boxesForGauss, gaussBlur} from "../utils/gauss";

export interface BilateralOptions {
  radius : number;
  threshold : number;
  edgeThreshold : number;
  iterations : number;
  mode : "normal"|"edge"|"edgeOverlay"
}

export function bilateralSeparable(input:U8Array, output:U8Array, w:number, h:number, options:BilateralOptions) {
  const len = w*h;
  const r = Math.ceil(options.radius);
  const thresh = options.threshold;
  const tmpH = new Uint8Array(len);
  const tmpV = new Uint32Array(len);
  const weights = new Uint32Array(len);
  const iterations = options.iterations;
  const inputCopy = new Uint8Array(len);

  const radii = boxesForGauss(r, iterations);

  copyArray(inputCopy, input);

  for(let it = 0; it < iterations; it++) {

    // let r = radii[it];

    //vertical pass
    for(let x = 0; x < w; x++) {
      const ofs = x;
      for(let y = 0; y < h; y++) {
        let sum = 0;
        let weightSum = 0;
        const y0 = Math.max(0, y-r);
        const y1 = Math.min(h-1, y+r);
        for(let i = y0; i < y1; i++) {
          if(Math.abs(inputCopy[ofs+(i*w)]-inputCopy[ofs+(y*w)]) < thresh) {
            sum += inputCopy[ofs+(i*w)];
            weightSum += 1;
          }
        }
        tmpV[y*w+x] = sum;
        weights[y*w+x] = weightSum;
      }
    }

    //horizontal pass
    for(let y = 0; y < h; y++) {
      const ofs = y*w;
      for(let x = 0; x < w; x++) {
        let sum = 0;
        let weightSum = 0;
        const x0 = Math.max(0, x-r);
        const x1 = Math.min(w-1, x+r);
        for(let i = x0; i < x1; i++) {
          if(Math.abs(inputCopy[ofs+i]-inputCopy[ofs+x]) < thresh) {
            sum += tmpV[ofs+i];
            weightSum += weights[ofs+i];
          }
        }
        tmpH[y*w+x] = clamp(sum/weightSum, 0, 255);
      }
    }

    copyArray(inputCopy, tmpH);
  }

  if(options.mode === "edge" || options.mode === "edgeOverlay") {
    const edgeMap = new Uint8Array(len);
    computeEdgeMap(tmpH, edgeMap, w, h, options.edgeThreshold);
    if(options.mode === "edge") {
      for(let i = 0; i < len; i++) {
        if(edgeMap[i] === 255) tmpH[i] = 255;
        else tmpH[i] = 0;
      }
    } else if(options.mode === "edgeOverlay") {
      for(let i = 0; i < len; i++) {
        if(edgeMap[i] === 255) tmpH[i] = 255;
      }
    }
  }


  copyArray(output, tmpH);
}


export function bilateralBox(input:U8Array, output:U8Array, w:number, h:number, options:BilateralOptions) {
  const thresh = options.threshold;
  const r = Math.ceil(options.radius);
  const iterations = options.iterations;

  const r2 = r*2+1;
  const area = r2*r2;
  const levels = 32;
  const step = 256/levels;
  const stepHalf = step/2;

  const len = w*h;
  const tmp1 = new Float32Array(len);
  const tmp2 = new Float32Array(len);
  const inputCopy = new Uint8Array(len);
  const intensityBlur = new Float32Array(len);
  const weightBlur = new Float32Array(len);

  copyArray(inputCopy, input);

  for(let it = 0; it < iterations; it++) {
    for(let k = 0; k <= levels; k++) {
      const level = (k*step)-1;
      tmp1.fill(0);
      tmp2.fill(0);
      for(let i = 0; i < len; i++) {
        // if(Math.abs(input[i]-level) < Math.min(stepHalf, thresh)) {
        if(Math.abs(inputCopy[i]-level) <= Math.min(thresh)) {
          tmp1[i] = inputCopy[i];
          tmp2[i] = 1;
        }
      }

      //compute box blur at level
      boxBlur(tmp1, intensityBlur, w, h, r);
      boxBlur(tmp2, weightBlur, w, h, r);

      for(let i = 0; i < len; i++) {
        if(Math.abs(inputCopy[i]-level) <= Math.min(stepHalf, thresh)) {
        // if(Math.abs(inputCopy[i]-level) <= Math.min(thresh)) {
          output[i] = clamp((intensityBlur[i] * area) / (weightBlur[i] * area), 0, 255);
        }
      }
    }
    copyArray(inputCopy, output);
  }
}


//brute force bilateral filter for experimenting on small images
//results for smartFilter are already very good:
//- radius seems to be as is
//threshold seems to be multiplied by 1/3
//3 iterations.
//TODO: check paper from hp guy to speed up using quantization, boxblur...
//  linear interpolation betwenn quantized steps
export function bilateralBruteForce(input:U8Array, output:U8Array, w:number, h:number, radius:number, threshold:number, iterations:number) {
  const r = Math.ceil(radius);

  const tmp1 = new Uint8Array(w*h);
  const tmp2 = new Uint8Array(w*h);

  copyArray(tmp1, input);
  for(let it = 0; it < iterations; it++) {

    for(let y = 0; y < h; y++) {
      for(let x = 0; x < w; x++) {

        let ref = getPixel(tmp1, w, h, x, y);

        let weightedSum = 0;
        let totalWeight = 0;
        let x0 = Math.max(x - r, 0);
        let x1 = Math.min(x + r, w-1);
        let y0 = Math.max(y - r, 0);
        let y1 = Math.min(y + r, h-1);
        for(let yy = y0; yy < y1; yy++) {
          for(let xx = x0; xx < x1; xx++) {
            let val = getPixel(tmp1, w, h, xx, yy);
            if(Math.abs(val-ref) < threshold) {
              weightedSum += val;
              totalWeight = totalWeight + 1;
            }
          }
        }

        let result = 0;
        if(totalWeight > 0) {
          result = Math.floor(Math.abs(weightedSum / totalWeight));
        } else {
          result = ref;
        }

        tmp2[y*w+x] = result;
      }
    }
    copyArray(tmp1, tmp2);
  }

  copyArray(output, tmp2);
}

function computeEdgeMap(input:U8Array, output:U8Array, w:number, h:number, threshold:number) {
    const I = new Float32Array(w*h);
    const Fx = new Float32Array(w*h);
    const Fy = new Float32Array(w*h);
    const M = new Float32Array(w*h);
    const edges = new Uint8Array(w*h);

    //normalize input
    for(let i = 0; i < input.length; i++) I[i] = input[i]/255;

    //compute gradient magnitude and direction
    const sx = [ +1,  0, -1, +2, 0, -2, +1,  0, -1];
    const sy = [ -1, -2, -1,  0, 0,  0, +1, +2, +1];
    conv2(I, Fx, w, h, sx, 3, 3);
    conv2(I, Fy, w, h, sy, 3, 3);

    let max = Number.NEGATIVE_INFINITY;
    for(let i = 0; i < input.length; i++) {
        const mag = Math.sqrt(Fx[i]*Fx[i]+Fy[i]*Fy[i]);
        if(mag > max) max = mag;
        M[i] = mag;
    }

    for(let i = 0; i < M.length; i++) output[i] = (M[i]/max*255) < threshold ? 0 : 255;
}

function copyArray(dst:U8Array|Uint32Array|Float32Array, src:U8Array|Uint32Array|Float32Array) {
  for(let i = 0; i < dst.length; i++) dst[i] = src[i];
}