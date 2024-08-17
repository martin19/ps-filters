// import {getPixelBilinear, joinRGBA, setPixel, splitRGBA} from "../utils/utils-filter";
// import {gaussBlur} from "../utils/gauss.js";
// import {getPixel} from "../utils/utils-filter";
//
// export const filterDistortPinchDefaults = {
//     "strength" : 10,
//     // "sigmaFactor" : 1,
// }
//
// export const filterDistortPinchOptions = {
//     "strength" : [-100,100,0.01],
//     "sigmaFactor" : [0,2, 0.01]
// }
//
// const gridSizeX = 1;
// const gridSizeY = 1;
// let gridH = 32;
// let gridW = 32;
// let grid = [];
// let distGrid = [];
//
// export function filterDistortPinch(input, output, w, h, options) {
//     const start = performance.now();
//     const {r:rIn,g:gIn,b:bIn,a:aIn} = splitRGBA(input);
//     const {r:rOut,g:gOut,b:bOut,a:aOut} = splitRGBA(output);
//
//     const cIn = [rIn,gIn,bIn];
//     const cOut = [rOut,gOut,bOut];
//
//     filterDistortPinchChannels(cIn, cOut, w, h, options);
//
//
//     joinRGBA(output, cOut[0], cOut[1], cOut[2], aIn);
//    const end = performance.now();
//
//    document.getElementById("perf").innerText = (end-start).toFixed(2)+ "ms";
// }
//
// export function filterDistortPinchChannels(inputChannels, outputChannels, w, h, options) {
//
//     const cx = w/2;
//     const cy = h/2;
//
//     for(let y = 0; y < h; y++) {
//         for(let x = 0; x < w; x++) {
//             const strength = options.strength/100;
//
//             let vtl = [];
//             let vtr = [];
//             let vbr = [];
//             let vbl = [];
//             for(let i = 0; i < inputChannels.length; i++) {
//                 const input = inputChannels[i];
//                 vtl.push(getPixel(input, w, h, x, y));
//                 vtr.push(getPixel(input, w, h, x+1, y));
//                 vbr.push(getPixel(input, w, h, x+1, y+1));
//                 vbl.push(getPixel(input, w, h, x, y+1));
//             }
//
//             const tl = perspectiveProjection([x, y, computeZSphere(x, y, w, h, cx, cy, strength)], cx, cy);
//             const tr = perspectiveProjection([x+1, y, computeZSphere(x+1, y, w, h, cx, cy, strength)], cx, cy);
//             const br = perspectiveProjection([x+1, y+1, computeZSphere(x+1, y+1, w, h, cx, cy, strength)], cx, cy);
//             const bl = perspectiveProjection([x, y+1, computeZSphere(x, y+1, w, h, cx, cy, strength)], cx, cy);
//
//             {
//                 const l = Math.floor(Math.min(tl[0],bl[0],br[0]));
//                 const r = Math.ceil(Math.max(tl[0],bl[0],br[0]));
//                 const t = Math.floor(Math.min(tl[1],bl[1],br[1]));
//                 const b = Math.ceil(Math.max(tl[1],bl[1],br[1]));
//                 for(let yy = t; yy <= b; yy++) {
//                     for(let xx = l; xx <= r; xx++) {
//                         const [w0,w1,w2] = lerpTri([xx,yy],tl,bl,br);
//                         if(w0 < 0 || w1 < 0 || w2 < 0) continue;
//                         for(let i = 0; i < outputChannels.length; i++) {
//                             setPixel(outputChannels[i], w, h, xx, yy, Math.floor(vtl[i]*w0 + vbl[i]*w1 + vbr[i]*w2));
//                         }
//                     }
//                 }
//             }
//
//             {
//                 const l = Math.floor(Math.min(tl[0], tr[0], br[0]));
//                 const r = Math.ceil(Math.max(tl[0], tr[0], br[0]));
//                 const t = Math.floor(Math.min(tl[1], tr[1], br[1]));
//                 const b = Math.ceil(Math.max(tl[1], tr[1], br[1]));
//                 for (let yy = t; yy <= b; yy++) {
//                     for (let xx = l; xx <= r; xx++) {
//                         const [w0,w1,w2] = lerpTri([xx,yy],tl,tr,br);
//                         if(w0 < 0 || w1 < 0 || w2 < 0) continue;
//                         for(let i = 0; i < outputChannels.length; i++) {
//                             setPixel(outputChannels[i], w, h, xx, yy, Math.floor(vtl[i]*w0 + vtr[i]*w1 + vbr[i]*w2));
//                         }
//                     }
//                 }
//             }
//
//         }
//     }
// }
//
// function pointInTriangle(p, p0, p1, p2) {
//     var s = (p0[0] - p2[0]) * (p[1] - p2[1]) - (p0[1] - p2[1]) * (p[0] - p2[0]);
//     var t = (p1[0] - p0[0]) * (p[1] - p0[1]) - (p1[1] - p0[1]) * (p[0] - p0[0]);
//
//     if ((s < 0) !== (t < 0) && s !== 0 && t !== 0)
//         return false;
//
//     var d = (p2[0] - p1[0]) * (p[1] - p1[1]) - (p2[1] - p1[1]) * (p[0] - p1[0]);
//     return d === 0 || (d < 0) === (s + t <= 0);
// }
//
// function lerpTri(p, p0, p1, p2) {
//     const denom = (p1[1]-p2[1])*(p0[0]-p2[0])+(p2[0]-p1[0])*(p0[1]-p2[1]);
//     const w0 = ((p1[1] - p2[1])*(p[0] - p2[0])+(p2[0] - p1[0])*(p[1] - p2[1]))/denom;
//     const w1 = ((p2[1] - p0[1])*(p[0] - p2[0])+(p0[0] - p2[0])*(p[1] - p2[1]))/denom;
//     const w2 = 1 - w0 - w1;
//     return [w0,w1,w2];
// }
//
// function perspectiveProjection(x, cx, cy) {
//     return [(x[0]-cx)/(x[2]+1)+cx, (x[1]-cy)/(x[2]+1)+cy];
// }
//
// function computeZGauss(x, y, w, h, strength) {
//     const x0 = w/2;
//     const y0 = h/2;
//     const sigma = w/6;
//     const A = (strength/100.0);
//     let z = A * Math.exp(-0.5*(((x-x0)**2/(sigma**2))+((y-y0)**2/(sigma**2))));
//     return z;
// }
//
// function computeZSphere(x, y, w, h, cx, cy, strength) {
//     const a = strength;
//     let rSphere = 1;
//     let d = Math.sqrt(((x-cx)/cx)**2 + ((y-cy)/cy)**2);
//     if(d > 1) {
//         return 0;
//     } else {
//         return Math.sqrt(1-(d/rSphere))*rSphere*a;
//     }
// }