import {conv2, joinRGBA, splitRGBA} from "../utils/utils-filter";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorStylizeFindEdges:FilterDescriptor = {
  id : "stylizeFindEdges",
  name : "Find Edges",
  filter1 : filterStylizeFindEdges1,
  filter4 : filterStylizeFindEdges4
}

export const filterStylizeFindEdgesOptions = {}

async function filterStylizeFindEdges1(input:FilterInput, output:FilterOutput) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const I = new Float32Array(w*h);
  const Fx = new Float32Array(w*h);
  const Fy = new Float32Array(w*h);
  const M = new Float32Array(w*h);

  //normalize input
  for(let i = 0; i < i8.length; i++) I[i] = i8[i]/255;

  //compute gradient magnitude and direction
  const sx = [ +1,  0, -1, +2, 0, -2, +1,  0, -1];
  const sy = [ -1, -2, -1,  0, 0,  0, +1, +2, +1];
  conv2(I, Fx, w, h, sx, 3, 3);
  conv2(I, Fy, w, h, sy, 3, 3);

  let max = Number.NEGATIVE_INFINITY;
  for(let i = 0; i < i8.length; i++) {
    const mag = Math.sqrt(Fx[i]*Fx[i]+Fy[i]*Fy[i]);
    if(mag > max) max = mag;
    M[i] = mag*3;
  }

  //normalize and invert output
  for(let i = 0; i < M.length; i++) o8[i] = Math.max(0, Math.min(255, (1.0 - (M[i]/max))*255));
}

async function filterStylizeFindEdges4(input:FilterInput, output:FilterOutput) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;
  const len = w*h;

  //blend image on white background
  const len4 = len*4;
  const tmp8 = new Uint8Array(len*4);
  tmp8.fill(255);
  for(let i = 0; i < len4; i+=4) {
    const sa = i8[i + 3]/255;
    const f1 = (sa);
    const f2 = (1.0 - sa);
    const rI = i8[i    ]/255;
    const gI = i8[i + 1]/255;
    const bI = i8[i + 2]/255;

    tmp8[i    ] = (rI * f1 + /*1.0 * */f2)*255;
    tmp8[i + 1] = (gI * f1 + /*1.0 * */f2)*255;
    tmp8[i + 2] = (bI * f1 + /*1.0 * */f2)*255;
    tmp8[i + 3] = 255;
  }

  let {a:aI, b:bI, g:gI, r:rI} = splitRGBA(tmp8);
  const cI = [rI, gI, bI, aI];
  const cO = [
    new Uint8Array(len),
    new Uint8Array(len),
    new Uint8Array(len),
    new Uint8Array(len)
  ];

  for(let j = 0; j < 3; j++) {
    const i8 = cI[j];
    const o8 = cO[j];

    const I = new Float32Array(w*h);
    const Fx = new Float32Array(w*h);
    const Fy = new Float32Array(w*h);
    const M = new Float32Array(w*h);

    //normalize input
    for(let i = 0; i < i8.length; i++) I[i] = i8[i]/255;

    //compute gradient magnitude and direction
    const sx = [ +1,  0, -1, +2, 0, -2, +1,  0, -1];
    const sy = [ -1, -2, -1,  0, 0,  0, +1, +2, +1];
    conv2(I, Fx, w, h, sx, 3, 3);
    conv2(I, Fy, w, h, sy, 3, 3);

    let max = Number.NEGATIVE_INFINITY;
    for(let i = 0; i < i8.length; i++) {
      const mag = Math.sqrt(Fx[i]*Fx[i]+Fy[i]*Fy[i]);
      if(mag > max) max = mag;
      M[i] = mag*3;
    }

    //normalize and invert output
    for(let i = 0; i < M.length; i++) o8[i] = Math.max(0, Math.min(255, (1.0 - (M[i]/max))*255));
  }

  const aa = new Uint8Array(w*h);
  for(let i = 0; i < len; i++) aa[i] = i8[i*4+3];
  joinRGBA(o8, cO[0], cO[1], cO[2], aa);
}