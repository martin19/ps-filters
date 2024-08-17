import {conv2, conv2Packed, joinRGBA, splitRGBA} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorSharpenSharpenEdges:FilterDescriptor = {
  id : "sharpenSharpenEdges",
  name : "Sharpen Edges",
  filter1 : filterSharpenSharpenEdges1,
  filter4 : filterSharpenSharpenEdges4
  //alpha : "straight"
}

export const filterSharpenSharpenEdgesOptions = {}

// https://github.com/amix/photoshop/blob/2baca147594d01cf9d17db92e3d5148989600529/UFilters.inc1.p
async function filterSharpenSharpenEdges1(input:FilterInput, output:FilterOutput) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  const sx = [ 1, 2, 1, 0, 0, 0,-1,-2,-1];
  const sy = [ 1, 0,-1, 2, 0,-2, 1, 0,-1];
  const shrp = [0, -0.2500, 0, -0.2500, 2.0000, -0.2500, 0, -0.2500, 0];

  const Fx = new Float32Array(w*h);
  const Fy = new Float32Array(w*h);
  const Fshrp = new Float32Array(w*h);

  conv2(i8, Fx, w, h, sx, 3, 3);
  conv2(i8, Fy, w, h, sy, 3, 3);
  conv2(i8, Fshrp, w, h, shrp, 3, 3);

  for(let i = 0; i < i8.length; i++) {
    const mag = Math.sqrt(Fx[i]*Fx[i]+Fy[i]*Fy[i])/255;
    const factor = mag;
    //doBlendBelow
    o8[i] = Math.min(255,Math.max(0, Fshrp[i]*factor + i8[i]*(1-factor)));
  }
}

async function filterSharpenSharpenEdges4(input:FilterInput, output:FilterOutput) {
  const i32 = new Uint32Array(input.img);
  const o32 = new Uint32Array(output.img);
  const w = input.w;
  const h = input.h;

  const len = w*h*4;
  const sx = [ 1, 2, 1, 0, 0, 0,-1,-2,-1];
  const sy = [ 1, 0,-1, 2, 0,-2, 1, 0,-1];
  const shrp = [0, -0.2500, 0, -0.2500, 2.0000, -0.2500, 0, -0.2500, 0];

  const Fx = new Uint8Array(len);
  const Fy = new Uint8Array(len);
  const Fshrp = new Uint8Array(len);

  conv2Packed(i32.buffer, Fx.buffer, w, h, sx, 3, 3, { clamp : true });
  conv2Packed(i32.buffer, Fy.buffer, w, h, sy, 3, 3, { clamp : true });
  conv2Packed(i32.buffer, Fshrp.buffer, w, h, shrp, 3, 3, { clamp : true });
  const i8 = new Uint8Array(i32.buffer);
  const o8 = new Uint8Array(o32.buffer);
  for(let i = 0; i < len; i+=4) {
    const magr = Math.sqrt(Fx[i  ]*Fx[i  ]+Fy[i  ]*Fy[i  ])/255;
    const magg = Math.sqrt(Fx[i+1]*Fx[i+1]+Fy[i+1]*Fy[i+1])/255;
    const magb = Math.sqrt(Fx[i+2]*Fx[i+2]+Fy[i+2]*Fy[i+2])/255;
    const maga = Math.sqrt(Fx[i+3]*Fx[i+3]+Fy[i+3]*Fy[i+3])/255;
    //doBlendBelow
    o8[i  ] = Math.min(255,Math.max(0, Fshrp[i  ]*magr + i8[i  ]*(1-magr)));
    o8[i+1] = Math.min(255,Math.max(0, Fshrp[i+1]*magg + i8[i+1]*(1-magg)));
    o8[i+2] = Math.min(255,Math.max(0, Fshrp[i+2]*magb + i8[i+2]*(1-magb)));
    o8[i+3] = Math.min(255,Math.max(0, Fshrp[i+3]*maga + i8[i+3]*(1-maga)));
  }
}