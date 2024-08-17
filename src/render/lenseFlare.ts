import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {clamp, getPixelRepeat, lerp, setPixel} from "../utils/utils-filter";
import {bresenhamLine} from "../graphics/bresenham";

export const filterDescriptorRenderLensFlare:FilterDescriptor = {
  id : "renderLensFlare",
  name : "Lens Flare",
  filter4 : filterRenderLensFlare4,
  parameters : {
    brightness: {name: "brightness", type: "int", min: 10, max: 300, default: 100},
    x: {name: "x", type: "float", min: 0, max: 1, default: 0.5},
    y: {name: "y", type: "float", min: 0, max: 1, default: 0.5},
    type: {name: "type", type: "enum", values: ["zoom", "nikon", "nikon1", "pnvs"], default: "zoom"}
  }
}

export interface FilterRenderLensFlareOptions {
  brightness: number;
  x: number;
  y: number;
  type: "zoom" | "nikon" | "nikon1" | "pnvs";
}

async function filterRenderLensFlare4(input:FilterInput, output:FilterOutput, options:FilterRenderLensFlareOptions) {
  const i32 = new Uint32Array(input.img);
  const o32 = new Uint32Array(output.img);
  const w = input.w;
  const h = input.h;

  const len = w*h;
  const tmp = new Uint32Array(len);
  tmp.fill(0xFF000000);
  switch(options.type) {
    case "zoom" : lensZoom(tmp.buffer, w, h, options); break;
    case "nikon" : lensNkn(tmp.buffer, w, h, options); break;
    case "nikon1" : lensNkn1(tmp.buffer, w, h, options); break;
    case "pnvs" : lensPnvs(tmp.buffer, w, h, options); break;
  }

  //screen blend mode
  for(let i = 0; i < len; i++) {
    const aR = (tmp[i] & 255) / 255;
    const aG = (tmp[i] >> 8 & 255) / 255;
    const aB = (tmp[i] >> 16 & 255) / 255;
    const aA = 1.0;
    const bR = (i32[i] & 255) / 255;
    const bG = (i32[i] >> 8 & 255) / 255;
    const bB = (i32[i] >> 16 & 255) / 255;
    const bA = (i32[i] >> 24 & 255) / 255;
    const r = (bR + aR - bR * aR) * 255;
    const g = (bG + aG - bG * aG) * 255;
    const b = (bB + aB - bB * aB) * 255;
    const a = bA * 255;
    //o32[i] = bR | (bG << 8) | (bB << 16) | (bA << 24);
    //o32[i] = aR | (aG << 8) | (aB << 16) | (aA << 24);
    o32[i] = r | (g << 8) | (b << 16) | (a << 24);
  }

}

function lensZoom(output:ArrayBuffer, w:number, h:number, options:FilterRenderLensFlareOptions) {
  const o32 = new Uint32Array(output);

  const brightness = options.brightness/100;
  const x1 = options.x;
  const y1 = options.y;
  const x2 = (1.0-options.x);
  const y2 = (1.0-options.y)
  const cx = w/2;
  const cy = h/2;
  const ringSize = (w/42);
  const dx = cx - x1*w;
  const dy = cy - y1*h;

  let gradient = new Uint32Array(100000);;
  let x,y,r;

  //star
  renderStar(o32, w, h, x1, y1, brightness, 190, 0.25);

  //giant primary light source, red ring, not found in code exactly
  r = brightness * w * 0.5;
  x = Math.round(cx - (dx * 100.0) / 100.0);
  y = Math.round(cy - (dy * 100.0) / 100.0);
  gradient.fill(0);
  linearGradientFade2(w * 0.08 * (brightness + 0.05), 280, 280, 280, false, gradient);
  linearGradientFade2(w * 0.04, 250, 250, 250, true, gradient);
  linearGradientRing(w * 9 / 100 + ringSize/4, brightness * 80.0, brightness * 15.0, brightness * 4.0, true, ringSize, gradient);
  //this is tweaked, cannot recover fp stack
  //linearGradientFade2(w * 0.14 * (brightness + 0.35), 87.0 + brightness * 87.0, 100.0 + brightness * 17.0, 100.0 + brightness * 17.0, true, gradient);
  linearGradientFade2(w * 0.14 * (brightness + 0.35), brightness * 87.0, brightness * 17.0, brightness * 17.0, true, gradient);
  const b3 = brightness*brightness*brightness;
  linearGradientFade2(w * 0.5 * brightness, b3 * 70.0, b3 * 60.0, b3 * 65.0, true, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  // largest orange
  r = (w*35) / 100;
  x = Math.round(cx - (dx * 150.0) / 100.0);
  y = Math.round(cy - (dy * 150.0) / 100.0);
  gradient.fill(0);
  //tweaked this.
  linearGradientSolidFade2((w*35) / 100, brightness * 5.0, brightness * 3.0, 0, false, 0.125 * ((w*15)/100), gradient);
  linearGradientSolidFade2((w*15) / 100, brightness * 3.0, brightness * 1.0, 0, true, 0.125 * ((w*35)/100), gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  // small orange
  r = (w * 21) / 1000;
  x = Math.round(cx - (dx * 20.0) / 100.0);
  y = Math.round(cy - (dy * 20.0) / 100.0);
  gradient.fill(0);
  linearGradientSolid(w*2 / 100, brightness * 42.0, brightness * 20.0, brightness + brightness, false, gradient);
  linearGradientRing((w * 21) / 1000 + ringSize/4, brightness * 7.0, brightness * 3.0, brightness+brightness, true, ringSize, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  // large orange
  r = (w * 7) / 100;
  x = Math.round((dx * 45.0) / 100.0 + cx);
  y = Math.round((dy * 45.0) / 100.0 + cy);
  gradient.fill(0);
  linearGradientFade(r, brightness * 25, brightness * 15, 0, true, gradient);
  linearGradientSolid(r, brightness * 12.0, brightness * 6.0, 0, true, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  // medium orange
  r = (w * 4) / 100;
  x = Math.round((dx * 41.0) / 100.0 + cx);
  y = Math.round((dy * 41.0) / 100.0 + cy);
  gradient.fill(0);
  linearGradientSolid(r, brightness * 25.0, brightness * 15.0, 0, true, gradient)
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  // small orange
  r = (w * 2) / 100;
  x = Math.round((dx * 47.0) / 100.0 + cx);
  y = Math.round((dy * 47.0) / 100.0 + cy);
  gradient.fill(0);
  linearGradientSolid(r, brightness * 25.0, brightness * 15.0, 0, true, gradient)
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  // greenish
  r = (w * 3) / 100;
  x = Math.round((dx * 65.0) / 100.0 + cx);
  y = Math.round((dy * 65.0) / 100.0 + cy);
  gradient.fill(0);
  linearGradientSolid((w * 3) / 100, brightness * 10.0, brightness * 30.0, brightness * 20.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  // blueish
  r = (w * 3) / 100;
  x = Math.round((dx * 67.0) / 100.0 + cx);
  y = Math.round((dy * 67.0) / 100.0 + cy);
  gradient.fill(0);
  linearGradientFade2((w * 3) / 100, 0, brightness * 15.0, brightness * 120.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  // transparent-yellow
  r = (w * 41) / 1000;
  x = Math.round(cx - (dx * 130.0) / 100.0);
  y = Math.round(cy - (dy * 130.0) / 100.0);
  gradient.fill(0);
  linearGradientFade((w*4) / 100, brightness * 10.0, brightness * 25.0, brightness * 14.0, false, gradient);
  linearGradientRing((w*41) / 1000 + ringSize/4, brightness * 22.0, brightness * 5.0, 0, true, ringSize, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  // green spot
  r = (w / 70);
  x = Math.round((dx * 27.0) / 100.0 + cx);
  y = Math.round((dy * 27.0) / 100.0 + cy);
  gradient.fill(0);
  linearGradientFade2(w/200, brightness * 100.0, brightness * 230.0, brightness * 150.0, false, gradient);
  linearGradientFade2(w/70, brightness * 50.0, brightness * 120.0, brightness * 100.0, true, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  // blue spot
  r = (w / 200);
  x = Math.round((cx - dx / 100.0));
  y = Math.round((cy - dy / 100.0));
  gradient.fill(0);
  linearGradientFade2(w/200, brightness * 100.0, brightness * 250.0, brightness * 190.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  // big blue disc
  r = (w * 6) / 100;
  x = Math.round(cx - (dx * 45.0) / 100.0);
  y = Math.round(cy - (dy * 45.0) / 100.0);
  gradient.fill(0);
  linearGradientSolid(r, 0, 5.0*brightness, 11.0*brightness,false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  // medium blue
  r = (w * 3) / 100;
  x = Math.round((cx - (dx * 41.0) / 100.0));
  y = Math.round((cy - (dy * 41.0) / 100.0));
  gradient.fill(0);
  linearGradientSolid(r, 0, 10.0*brightness, 18.0*brightness,false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  // small blue
  r = (w * 2) / 100;
  x = Math.round((cx - (dx * 51.0) / 100.0));
  y = Math.round((cy - (dy * 51.0) / 100.0));
  gradient.fill(0);
  linearGradientSolid(r, 0, 10.0*brightness, 18.0*brightness,false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  // rainbox huge
  r = ((w * 200) / 1000);
  x = Math.round((dx * 131.0) / 100.0 + cx);
  y = Math.round((dy * 131.0) / 100.0 + cy);
  gradient.fill(0);
  linearGradientRing((w*190)/1000 + ringSize/4, brightness * 11.0, 0, brightness * 20.0, true, ringSize, gradient);
  linearGradientRing((w*195)/1000 + ringSize/4, brightness * 5.0, brightness * 11.0, brightness * 5.0, true, ringSize, gradient);
  linearGradientRing((w*200)/1000 + ringSize/4, brightness * 20.0, brightness * 11.0, 0, true, ringSize, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  // yellow ring with green gradient far inside
  r = (w * 103) / 1000;
  x = Math.round((dx * 100.0) / 100.0 + cx);
  y = Math.round((dy * 100.0) / 100.0 + cy);
  gradient.fill(0);
  linearGradientFade((w*10)/100, brightness * 11.0, brightness * 22.0, 0, true, gradient);
  linearGradientRing((w*103)/1000 + ringSize/4, brightness * 22.0, brightness * 5.0, 0, true, ringSize, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
}

function lensNkn1(output:ArrayBuffer, w:number, h:number, options:FilterRenderLensFlareOptions) {
  const o32 = new Uint32Array(output);

  const brightness = options.brightness/100;
  const x1 = options.x;
  const y1 = options.y;
  const x2 = (1.0-options.x);
  const y2 = (1.0-options.y)
  const cx = w/2;
  const cy = h/2;
  const ringSize = (w/42);
  const dx = cx - x1*w;
  const dy = cy - y1*h;

  let gradient = new Uint32Array(100000);;
  let x,y,r;

  renderStar(o32, w, h, x1, y1, brightness, 60, 0.45);
  renderLineBundle(o32, w, h, x1, y1, w/3, Math.PI*1.5+0.05, 0.05, 5, brightness/25.0);
  renderLineBundle(o32, w, h, x1, y1, w/3, Math.PI*0.5+0.05, 0.05, 5, brightness/25.0);
  renderLineBundle(o32, w, h, x1, y1, w/5, Math.PI*2+0.05, 0.1, 25, brightness/25.0);


  let randomizedFloat = 0;

  //light source
  r = w/6;
  x = Math.round(cx - (dx * 100.0) / 100.0);
  y = Math.round(cy - (dy * 100.0) / 100.0);
  gradient.fill(0);
  linearGradientFade2(w*0.04, brightness * 290.0, brightness * 320.0, brightness * 250.0, false, gradient); //ok
  linearGradientFade2(w*0.08, brightness * 290.0, brightness * 320.0, brightness * 250.0, true, gradient); //ok
  linearGradientFade2(w*0.1 * (brightness + 0.35), brightness * 20.0, brightness * 80.0 + 10.0, brightness * 60.0 + 10.0, true, gradient); //ok
  linearGradientFade2(w*0.07 * (brightness + 0.35), brightness * 20.0, brightness * 80.0 + 10.0, brightness * 60.0 + 10.0, true, gradient); //ok
  linearGradientFade2(w*0.05 * (brightness + 0.35), brightness * 20.0, brightness * 80.0 + 10.0, brightness * 60.0 + 10.0, true, gradient); //ok
  linearGradientFade2(w * 0.0075, 280, 280, 280, true, gradient);
  //center spot, seems randomized
  linearGradientFade2(w/40, 25.0 + brightness * 25.0, 0, 0, true, gradient); //ok
  linearGradientRing(w/10 + (w/100)/4, brightness * 25.0, brightness * 3.0, 0, true, w/100, gradient); //ok
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //huge halo
  r = brightness * w * 0.65;
  x = Math.round(cx - (dx * 100.0) / 100.0);
  y = Math.round(cy - (dy * 100.0) / 100.0);
  gradient.fill(0);
  linearGradientFade2(w * 0.2 * (brightness * 0.35) * brightness * brightness, brightness*2.0+2.0, brightness*6.0+6.0, brightness*10.0+10.0, false, gradient);
  linearGradientFade2(w * 0.25 * (brightness * 0.35) * brightness * brightness, brightness*2.0+2.0, brightness*6.0+6.0, brightness*10.0+10.0, true, gradient);
  linearGradientFade2(w * 0.3 * (brightness * 0.35) * brightness * brightness, brightness*2.0+2.0, brightness*6.0+6.0, brightness*10.0+10.0, true, gradient);
  //later
  // linearGradientSolidFade(1.8 * (w * 0.09 * (brightness * 0.35)), brightness * 10.0, brightness * 15.0, brightness * 35.0, true, 0, gradient);
  // linearGradientSolidFade(1.8 * (w * 0.11 * (brightness * 0.35)), brightness * 10.0, brightness * 15.0, brightness * 35.0, true, 0, gradient);
  //glow
  const b3 = brightness * brightness * brightness;
  linearGradientFade2(w * brightness * 0.45, b3 * 50.0, b3*35.0, b3 * 25.0, true, gradient);
  linearGradientFade2(w * brightness * 0.65, b3 * 80.0, b3 * 82.0, b3 * 85.0, true, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);


  //disc close to lightsource
  r = w * 0.027;
  x = Math.round(cx - (dx * 0.718));
  y = Math.round(cy - (dy * 0.718));
  gradient.fill(0);
  linearGradientSolid(w * 0.027, brightness * 2.0, brightness*10.0, brightness*6.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  //ring close to lightsource
  r = w * 0.029;
  x = Math.round(cx - (dx * 0.718));
  y = Math.round(cy - (dy * 0.718));
  gradient.fill(0);
  linearGradientRing(w * 0.029 + (ringSize/4), 0, brightness*6.0, brightness*4.0, false, ringSize, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //disc green
  r = w * 0.039;
  x = Math.round(cx - (dx * 0.218));
  y = Math.round(cy - (dy * 0.218));
  gradient.fill(0);
  linearGradientSolid(w * 0.032, 0, brightness * 8.0, 0, false, gradient);
  linearGradientRing(w * 0.039 + (ringSize/4), 0, brightness*6.0, brightness*4.0, true, ringSize, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //greenish disc
  r = w * 0.022;
  x = Math.round(cx + (dx * 0.48));
  y = Math.round(cy + (dy * 0.48));
  gradient.fill(0);
  linearGradientSolidFade(w * 0.015, randomizedFloat, brightness * 8.0, brightness * 2.0, false, w/2, gradient);
  linearGradientSolid(w * 0.022, randomizedFloat, brightness * 8.0, brightness * 2.0, true, gradient);
  linearGradientRing(w * 0.022 + (w/50)/4, randomizedFloat, brightness * 2.0, brightness * 5.0, true, w/50, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  //greenish disc #2
  r = w * 0.022;
  x = Math.round(cx + (dx * 0.58));
  y = Math.round(cy + (dy * 0.58));
  linearGradientSolid(w * 0.022, brightness * 6.0, brightness * 2.0, 0, true, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  //greenish disc #3
  r = w * 0.03;
  x = Math.round(cx + (dx * 0.51));
  y = Math.round(cy + (dy * 0.51));
  gradient.fill(0);
  linearGradientFade2(w * 0.03, brightness * 30.0, brightness * 25.0, brightness * 6.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  //transparent disc
  r = w*0.04;
  x = Math.round(cx + (dx * 1.18));
  y = Math.round(cy + (dy * 1.18));
  gradient.fill(0);
  linearGradientSolid(w*0.04, brightness * 8.0, brightness * 8.0, brightness * 5.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //transgroup#1
  r = w*0.083;
  x = Math.round(cx + (dx * 1.88));
  y = Math.round(cy + (dy * 1.88));
  gradient.fill(0);
  linearGradientSolid(w*0.083, brightness * 8.0, brightness * 13.0, brightness * 5.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //transgroup#2
  r = w*0.04;
  x = Math.round(cx + (dx * 2.0));
  y = Math.round(cy + (dy * 2.0));
  gradient.fill(0);
  linearGradientFade(w*0.04, brightness * 5.0, brightness * 13.0, brightness * 13.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //transgroup#3
  r = w*0.06;
  x = Math.round(cx + (dx * 1.9));
  y = Math.round(cy + (dy * 1.9));
  gradient.fill(0);
  linearGradientSolid(w*0.06, brightness * 20.0, brightness * 13.0, brightness * 13.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //blueish close to lightsource
  r = w*0.08;
  x = Math.round(cx - (dx * 1.5));
  y = Math.round(cy - (dy * 1.5));
  gradient.fill(0);
  linearGradientSolid(w*0.08, 0, brightness * 10.0, brightness * 10.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //yellowish small
  r = w*0.013;
  x = Math.round(cx + (dx * 1.15));
  y = Math.round(cy + (dy * 1.15));
  gradient.fill(0);
  linearGradientSolid(w*0.013, brightness * 120.0, brightness * 100.0, brightness * 50.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //small blue smear
  r = w*0.01;
  x = Math.round(cx + (dx * 1.35));
  y = Math.round(cy + (dy * 1.35));
  gradient.fill(0);
  //green and blue seem swapped
  linearGradientSolid(w*0.01, brightness * 6.0, brightness * 30.0, brightness * 45.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  r = w*0.01;
  x = Math.round(cx + (dx * 1.41));
  y = Math.round(cy + (dy * 1.41));
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  r = w*0.01;
  x = Math.round(cx + (dx * 1.38));
  y = Math.round(cy + (dy * 1.38));
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  r = w*0.005;
  x = Math.round(cx + (dx * 1.38));
  y = Math.round(cy + (dy * 1.38));
  gradient.fill(0);
  linearGradientFade2(w * 0.005, brightness * 140.0, brightness * 140.0, brightness * 140.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  //surrounding blue
  r = w*0.018;
  x = Math.round(cx + (dx * 1.38));
  y = Math.round(cy + (dy * 1.38));
  gradient.fill(0);
  linearGradientSolidFade2(w*0.018, 0, 0, brightness * 90.0, false, 32, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  //yellow dot
  r = w*0.005;
  x = Math.round(cx + (dx * 1.18));
  y = Math.round(cy + (dy * 1.18));
  gradient.fill(0);
  linearGradientFade2(w * 0.005, brightness * 240.0, brightness * 240.0, brightness * 240.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  //yellow dot
  r = w*0.015;
  x = Math.round(cx - dx * 0.35);
  y = Math.round(cy - dy * 0.35);
  gradient.fill(0);
  linearGradientFade2(w * 0.007, brightness * 30.0, brightness * 25.0, brightness * 5.0, false, gradient);
  linearGradientFade2(w * 0.006, brightness * 30.0, brightness * 25.0, brightness * 5.0, true, gradient);
  linearGradientFade2(w * 0.003, brightness * 30.0, brightness * 25.0, brightness * 5.0, true, gradient);
  linearGradientFade2(w * 0.01, brightness * 30.0, brightness * 25.0, brightness * 5.0, true, gradient);
  linearGradientFade2(w * 0.015, brightness * 30.0, brightness * 25.0, brightness * 5.0, true, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  //yellow dot
  r = w*0.015;
  x = Math.round(cx + dx * 0.55);
  y = Math.round(cy + dy * 0.55);
  linearGradientFade2(w * 0.0025, brightness * 150.0, brightness * 120, brightness * 40.0, true, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  //yellow dot
  r = w*0.015;
  x = Math.round(cx - dx * 2.5);
  y = Math.round(cy - dy * 2.5);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  // greenish small spots
  r = w*0.008;
  x = Math.round(cx - dx * 2.46);
  y = Math.round(cy - dy * 2.46);
  gradient.fill(0);
  linearGradientSolid(w * 0.008, brightness * 4.0, brightness * 45.0, brightness * 25.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  r = w*0.008;
  x = Math.round(cx - dx * 2.475);
  y = Math.round(cy - dy * 2.475);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  // blue dots
  r = w*0.004;
  x = Math.round(cx - dx * 2.525);
  y = Math.round(cy - dy * 2.525);
  gradient.fill(0);
  linearGradientFade2(w*0.004, brightness * 10.0, brightness * 90.0, brightness * 100.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  r = w*0.004;
  x = Math.round(cx - dx * 0.06);
  y = Math.round(cy - dy * 0.06);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  //blue disc mini
  r = w*0.007;
  x = Math.round(cx - dx * 0.075);
  y = Math.round(cy - dy * 0.075);
  gradient.fill(0);
  linearGradientSolid(w*0.007, brightness * 4.0, brightness * 24.0, brightness * 25, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  //huge orange disc
  r = (w*39)/100;
  x = Math.round(cx - dx * 1.8);
  y = Math.round(cy - dy * 1.8);
  gradient.fill(0);
  linearGradientSolidFade2((w*39)/100, brightness * 7.0, brightness * 5.0, 0, false, 0.015625 * ((w*39)/100), gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  //med orange disc
  r = (w*10)/100;
  x = Math.round(cx + dx * 0.5);
  y = Math.round(cy + dy * 0.5);
  gradient.fill(0);
  linearGradientSolidFade2((w*10)/100, brightness * 7.0, brightness * 5.0, 0, false, 0.015625 * ((w * 10) / 100), gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  //large orange disc
  r = (w*20)/100;
  x = Math.round(cx + dx * 0.5);
  y = Math.round(cy + dy * 0.5);
  gradient.fill(0);
  linearGradientSolidFade2((w*20)/100, brightness * 7.0, brightness * 5.0, 0, false, 0.015625 * ((w * 20) / 100), gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
}

function lensNkn(output:ArrayBuffer, w:number, h:number, options:FilterRenderLensFlareOptions) {
  const o32 = new Uint32Array(output);

  const brightness = options.brightness/100;
  const x1 = options.x;
  const y1 = options.y;
  const x2 = (1.0-options.x);
  const y2 = (1.0-options.y)
  const cx = w/2;
  const cy = h/2;
  const ringSize = (w/42);
  const dx = cx - x1*w;
  const dy = cy - y1*h;

  //star
  renderStar(o32, w, h, x1, y1, brightness, 30, 0.45);

  //render burst
  {
    const spread = Math.PI*2/100;
    const burstSize = brightness * (w*7)/100 + (w*7)/100;
    const colR = brightness/52;
    const colG = brightness/52;
    const colB = brightness/52;
    for(let i = 0; i < 12; i++) {
      const alpha1 = i*(Math.PI*2)/12 + Math.PI*0.05;
      const alphaStart = alpha1 - spread;
      const alphaEnd = alpha1 + spread;
      const alphaStep = (alphaEnd - alphaStart)/8;
      const x0 = Math.round(cx - (dx * 100.0) / 100.0);
      const y0 = Math.round(cy - (dy * 100.0) / 100.0);
      for(let j = 0; j < 8; j++) {
        const x1 = Math.floor(x0 + Math.cos(alphaStart+(j*alphaStep)) * burstSize);
        const y1 = Math.floor(y0 + Math.sin(alphaStart+(j*alphaStep)) * burstSize);
        renderLine(o32, w, h, x0, y0, x1, y1, colR, colG, colB, true, false);
      }
    }
  }

  let gradient = new Uint32Array(100000);
  let x,y,r;

  //light source
  r = brightness * w * 0.5;
  x = Math.round(cx - (dx * 100.0) / 100.0);
  y = Math.round(cy - (dy * 100.0) / 100.0);
  gradient.fill(0);
  linearGradientFade2(w * 0.08 * (brightness + 0.05), 280.0, 280.0, 280.0, false, gradient);
  linearGradientFade2(w * 0.04,brightness * 250.0,brightness * 550.0,brightness * 250.0,true, gradient);
  linearGradientRing((w * 9)/100 + ringSize/4, brightness * brightness * 80.0, brightness * brightness * 15.0, brightness * brightness * 4.0, true, ringSize, gradient)
  //tweaked this
  linearGradientFade2(w * 0.14 * (brightness + 0.35), brightness * 100.0,brightness * 15.0, brightness * 17.0, true, gradient);
  const b3 = brightness*brightness*brightness;
  linearGradientFade2(w * 0.5 * brightness, b3 * 70.0, b3 * 60.0, b3 * 65.0, true, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  r = w / 70;
  x = (dx * 57.0) / 100.0 + cx;
  y = (dy * 57.0) / 100.0 + cy;
  gradient.fill(0);
  linearGradientFade2(w/200, brightness * 100.0, brightness*230.0, brightness*150.0, false, gradient);
  linearGradientFade2(w/70, brightness * 100.0, brightness*120.0, brightness*100.0, true, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  r = w/50;
  x = (dx * 7.0) / 10.0 + cx;
  y = (dy * 7.0) / 10.0 + cy;
  gradient.fill(0);
  linearGradientFade2(w/50, brightness * 75.0, brightness * 45.0, brightness * 100.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  r = (w*20.0)/100;
  x = (dx * 90.0) / 100.0 + cx;
  y = (dy * 90.0) / 100.0 + cy;
  gradient.fill(0);
  //unsure about b
  linearGradientRing((w*16)/100 + (w/25)/4, brightness * 12.0, brightness * 3.0, 0.0, false, w/25, gradient);
  linearGradientFade2((w*14)/100, brightness * 20.0, brightness * 10.0, 0.0, true, gradient);
  linearGradientSolidFade2((w*20)/100, brightness * 9.0, brightness * 27.0, brightness * 20.0, true, 64, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //yellow shade 1
  r = (w*10.0)/100;
  x = (dx * 98.0) / 100.0 + cx;
  y = (dy * 98.0) / 100.0 + cy;
  gradient.fill(0);
  linearGradientFade2((w*10.0)/100, brightness * 10.0, brightness * 5.0, 0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //yellow shade 2
  r = (w*7.0)/100;
  x = (dx * 105.0) / 100.0 + cx;
  y = (dy * 105.0) / 100.0 + cy;
  gradient.fill(0);
  linearGradientFade2((w*10.0)/100, brightness * 10.0, brightness * 5.0, 0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //yellow shade 3
  r = (w*7.0)/100;
  x = (dx * 110.0) / 100.0 + cx;
  y = (dy * 110.0) / 100.0 + cy;
  gradient.fill(0);
  linearGradientFade2((w*10.0)/100, brightness * 15.0, brightness * 7.0, 0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //blue disc fade
  r = (w*5.0)/100;
  x = cx - (dx * 30.0) / 100.0;
  y = cy - (dy * 30.0) / 100.0;
  gradient.fill(0);
  linearGradientSolidFade2((w*5.0)/100, brightness * 5.0, brightness * 5.0, brightness * 20.0, false, (w*5)/100, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //blue disc
  r = (w*3.0)/100;
  x = cx - (dx * 34.0) / 100.0;
  y = cy - (dy * 34.0) / 100.0;
  gradient.fill(0);
  linearGradientSolid((w*3.0)/100, brightness * 5.0, brightness * 5.0, brightness * 20.0, false, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //lightblue fade 1
  r = (w*2.0)/100;
  x = cx - (dx * 174.0) / 100.0;
  y = cy - (dy * 174.0) / 100.0;
  gradient.fill(0);
  linearGradientSolidFade2((w*2.0)/100, 0, brightness * 35.0, brightness * 40.0, false, (w*5)/100, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);

  //lightblue fade 2
  r = (w*2.0)/100;
  x = cx - (dx * 180.0) / 100.0;
  y = cy - (dy * 180.0) / 100.0;
  renderRadialGradient(o32, w, h, x, y, r, gradient);


  //lightblue smeared 3x
  r = (w*4.0)/100;
  x = cx - (dx * 205.0) / 100.0;
  y = cy - (dy * 205.0) / 100.0;
  gradient.fill(0);
  linearGradientSolidFade2((w*4.0)/100, 0, brightness * 10.0, brightness * 12.0, false, (w*5)/100, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  r = (w*4.0)/100;
  x = cx - (dx * 210.0) / 100.0;
  y = cy - (dy * 210.0) / 100.0;
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  r = (w*4.0)/100;
  x = cx - (dx * 215.0) / 100.0;
  y = cy - (dy * 215.0) / 100.0;
  renderRadialGradient(o32, w, h, x, y, r, gradient);
}

function lensPnvs(output:ArrayBuffer, w:number, h:number, options:FilterRenderLensFlareOptions) {
  const o32 = new Uint32Array(output);

  const brightness = options.brightness/100;
  const x1 = options.x;
  const y1 = options.y;
  const x2 = (1.0-options.x);
  const y2 = (1.0-options.y)
  const cx = w/2;
  const cy = h/2;
  const ringSize = (w/42);
  const dx = cx - x1*w;
  const dy = cy - y1*h;

  let gradient = new Uint32Array(100000);;
  let x,y,r;

  //render burst
  {
    const spread = Math.PI*2/100;
    const burstSize = brightness * (w*7)/100 + (w*7)/100;
    const colR = brightness/52;
    const colG = brightness/52;
    const colB = brightness/52;
    for(let i = 0; i < 12; i++) {
      const alpha1 = i*(Math.PI*2)/12 + Math.PI*0.05;
      const alphaStart = alpha1 - spread;
      const alphaEnd = alpha1 + spread;
      const alphaStep = (alphaEnd - alphaStart)/8;
      const x0 = Math.round(cx - (dx * 100.0) / 100.0);
      const y0 = Math.round(cy - (dy * 100.0) / 100.0);
      for(let j = 0; j < 8; j++) {
        const x1 = Math.floor(x0 + Math.cos(alphaStart+(j*alphaStep)) * burstSize);
        const y1 = Math.floor(y0 + Math.sin(alphaStart+(j*alphaStep)) * burstSize);
        renderLine(o32, w, h, x0, y0, x1, y1, colR, colG, colB, true, false);
      }
    }
  }

  //render blue streaks (horizontal)
  {
    let k = 5;
    let yOfs = -3;
    do {
      let colB = (1.8-Math.abs(yOfs/1.8)) * 0.25 * brightness;
      clamp(colB, 0, 1);
      const colR = colB * 0.3;
      const colG = colB * 0.6;

      let xx0 = Math.floor(x1 * w);
      let yy0 = Math.floor(y1 * h + yOfs);
      let xx1 = Math.floor(dx <= 0.0 ? cx - w : w + cx);
      let yy1 = Math.floor(yy0);
      //horizontal line through light source
      renderLine(o32, w, h, xx0, yy0, xx1, yy1, colR, colG, colB, true, true);

      xx0 = Math.floor(x1 * w);
      yy0 = Math.floor(y1 * h + yOfs);
      xx1 = Math.floor(dx <= 0.0 ? w + cx : cx - w);
      yy1 = Math.floor(yy0);
      renderLine(o32, w, h, xx0, yy0, xx1, yy1, colR, colG, colB, true, true);

      xx0 = Math.floor((dx + cx) - w/5);
      yy0 = Math.floor(dy + cy + yOfs);
      xx1 = Math.floor((dx + cx) + w/5);
      yy1 = Math.floor(yy0);
      renderLine(o32, w, h, xx0, yy0, xx1, yy1, colR, colG, colB, true, true);
      yOfs++;
      k--;
    } while(k !== 0)
  }

  //render blue streaks (diagonal)
  {
    let k = 5;
    let t = -3;
    let xOfs = x1*w + dx * 0.125;
    let yOfs = y1*h + dy * 0.125;
    do {
      let colB = (1.8-Math.abs(t/1.8)) * 0.25 * brightness;
      clamp(colB, 0, 1);
      const colR = colB * 0.3;
      const colG = colB * 0.6;

      const ww = (w + (w >> 0x1f & 3)) >> 2;
      let xx0 = Math.ceil(xOfs - ww);
      let yy0 = Math.ceil(yOfs - ww);
      let xx1 = Math.ceil(xOfs);
      let yy1 = Math.ceil(yOfs);
      renderLine(o32, w, h, xx0, yy0, xx1, yy1, colR, colG, colB, true, false);

      xx0 = Math.ceil(ww + xOfs);
      yy0 = Math.ceil(ww + yOfs);
      xx1 = Math.ceil(xOfs);
      yy1 = Math.ceil(yOfs);
      renderLine(o32, w, h, xx0, yy0, xx1, yy1, colR, colG, colB, true, false);

      yOfs--;
      k--;
      t++;
    } while(k !== 0)
  }

  {
    let k = 5;
    let t = -3;
    let xOfs = (dx+cx) - dx/5;
    let yOfs = (dy+cy) - dy/5;
    do {
      let colB = (1.8-Math.abs(t/1.8)) * 0.25 * brightness;
      clamp(colB, 0, 1);
      const colR = colB * 0.3;
      const colG = colB * 0.6;

      const ww = w/4;
      let xx0 = Math.floor(xOfs - ww);
      let yy0 = Math.floor(yOfs - ww);
      let xx1 = Math.floor(xOfs);
      let yy1 = Math.floor(yOfs);
      renderLine(o32, w, h, xx0, yy0, xx1, yy1, colR, colG, colB, true, false);

      xx0 = Math.floor(ww + xOfs);
      yy0 = Math.floor(ww + yOfs);
      xx1 = Math.floor(xOfs);
      yy1 = Math.floor(yOfs);
      renderLine(o32, w, h, xx0, yy0, xx1, yy1, colR, colG, colB, true, false);

      yOfs--;
      k--;
      t++;
    } while(k !== 0)
  }

  //light source
  r = brightness * w * 0.3;
  x = Math.round(cx - (dx * 100.0) / 100.0);
  y = Math.round(cy - (dy * 100.0) / 100.0);
  gradient.fill(0);
  linearGradientFade2((brightness + 0.05) * w * 0.05,280,280,280,false, gradient);
  linearGradientFade2(w * 0.08, brightness * 250.0, brightness * 200.0, brightness * 150.0, true, gradient);
  linearGradientFade2(w * 0.12 * (brightness + 0.35), 100.0 + brightness * 100.0, 15.0 + brightness * 15.0, 17.0 + brightness * 17.0, true, gradient);
  linearGradientFade2(brightness * w * 0.3, 70.0 * brightness * brightness, 60.0 * brightness * brightness,65.0 * brightness * brightness, true, gradient);
  renderRadialGradient(o32, w, h, x, y, r, gradient);


  gradient.fill(0);
  //linearGradientRingSolid((w * 3) / 100,0, brightness * 10.0, brightness * 12.0, true, (w*5.0)/100, gradient);
  linearGradientSolidFade2((w * 3) / 100,0, brightness * 10.0, brightness * 12.0, true, (w*5)/100, gradient);
  r = (w * 3) / 100;
  x = cx - (dx * 25.0) / 100.0;
  y = cy - (dy * 25.0) / 100.0;
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  r = (w * 3) / 100;
  x = cx - (dx * 30.0) / 100.0;
  y = cy - (dy * 30.0) / 100.0;
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  r = (w * 3) / 100;
  x = cx - (dx * 35.0) / 100.0;
  y = cy - (dy * 35.0) / 100.0;
  renderRadialGradient(o32, w, h, x, y, r, gradient);
  r = (w * 3) / 100;
  x = cx - (dx * 20.0) / 100.0;
  y = cy - (dy * 20.0) / 100.0;
  renderRadialGradient(o32, w, h, x, y, r, gradient);
}

function linearGradientSolidFade(radiusOuter:number, r:number, g:number, b:number, add:boolean,radiusInner:number, gradient:Uint32Array) {
  const oR = clamp(r, 0, 255);
  const oG = clamp(g, 0, 255);
  const oB = clamp(b, 0, 255);
  for(let i = Math.floor(radiusInner); i <= Math.ceil(radiusOuter); i++) {
    const k = Math.floor(i*3);
    if(!add) {
      gradient[k] = oR;
      gradient[k+1] = oG;
      gradient[k+2] = oB;
    } else {
      gradient[k] += oR;
      gradient[k+1] += oG;
      gradient[k+2] += oB;
    }
  }
}

function linearGradientSolidFade2(radiusOuter:number, r:number, g:number, b:number, add:boolean, radiusFade:number, gradient:Uint32Array) {
  for(let i = 0; i < radiusOuter; i++) {
    const ofs = i * 3;
    let oR, oG, oB;
    const startFade = (radiusOuter - radiusFade/4);
    const endFade = radiusOuter;

    if(i < startFade) {
      oR = clamp(r, 0, 255);
      oG = clamp(g, 0, 255);
      oB = clamp(b, 0, 255);
    } else {
      const k = (endFade - i)/(endFade - startFade);
      oR = clamp(r * k, 0, 255);
      oG = clamp(g * k, 0, 255);
      oB = clamp(b * k, 0, 255);
    }

    if(!add) {
      gradient[ofs] = oR;
      gradient[ofs+1] = oG;
      gradient[ofs+2] = oB;
    } else {
      let tmp;
      tmp = gradient[ofs] * oR + 128;
      gradient[ofs] = (gradient[ofs] - ((tmp >> 8) + tmp >> 8)) + oR;
      tmp = gradient[ofs+1] * oG + 128;
      gradient[ofs+1] = (gradient[ofs+1] - ((tmp >> 8) + tmp >> 8)) + oG;
      tmp = gradient[ofs+2] * oB + 128;
      gradient[ofs+2] = (gradient[ofs+2] - ((tmp >> 8) + tmp >> 8)) + oB;
    }
  }
}

function linearGradientRing(radius:number, r:number, g:number, b:number, add:boolean, ringSize:number, gradient:Uint32Array) {
  const ringSize2 = ringSize/2;
  for(let i = radius-ringSize; i <= radius; i++) {
    const ofs = Math.floor(i)*3;
    //const k = (1.0-((radius-i)/ringSize));
    const k = 1.0 - Math.abs(i - (radius-ringSize2))/ringSize2;
    const oR = clamp(r * k*k, 0, 255);
    const oG = clamp(g * k*k, 0, 255);
    const oB = clamp(b * k*k, 0, 255);
    if(!add) {
      gradient[ofs] = oR;
      gradient[ofs+1] = oG;
      gradient[ofs+2] = oB;
    } else {
      gradient[ofs] += oR;
      gradient[ofs+1] += oG;
      gradient[ofs+2] += oB;
    }
  }
}

function linearGradientFade2(radius:number, r:number, g:number, b:number, add:boolean, gradient:Uint32Array) {
  let k = Math.ceil(radius);
  for(let i = 0; i < Math.ceil(radius)*3; i+=3) {
    const oR = clamp((r * (k*k)/radius)/(radius), 0, 255);
    const oG = clamp((g * (k*k)/radius)/(radius), 0, 255);
    const oB = clamp((b * (k*k)/radius)/(radius), 0, 255);
    if(!add) {
      gradient[i] = oR;
      gradient[i+1] = oG;
      gradient[i+2] = oB;
    } else {
      let tmp;
      tmp = gradient[i] * oR + 128;
      gradient[i] = (gradient[i] - ((tmp >> 8) + tmp >> 8)) + oR;
      tmp = gradient[i+1] * oG + 128;
      gradient[i+1] = (gradient[i+1] - ((tmp >> 8) + tmp >> 8)) + oG;
      tmp = gradient[i+2] * oB + 128;
      gradient[i+2] = (gradient[i+2] - ((tmp >> 8) + tmp >> 8)) + oB;
    }
    k--;
  }
}

function linearGradientFade(radius:number, r:number, g:number, b:number, add:boolean, gradient:Uint32Array) {
  linearGradientSolid(radius, r, g, b, false, gradient);
  let k = 0;
  for(let i = 0; i < Math.ceil(radius)*3; i+=3) {
    gradient[i  ] = clamp((gradient[i    ] * (k*k)/radius)/radius, 0, 255);
    gradient[i+1] = clamp((gradient[i + 1] * (k*k)/radius)/radius, 0, 255);
    gradient[i+2] = clamp((gradient[i + 2] * (k*k)/radius)/radius, 0, 255);
    k++;
  }
}


//gradient contains r,g,b for each radius of a disc
function linearGradientSolid(radius:number, r:number, g:number, b:number, add:boolean, gradient:Uint32Array) {
  if(!gradient) gradient = new Uint32Array(100000);
  const gradientBufferLen = gradient.length;
  //const radius4 = Math.ceil(radius) * 3;
  //this seems to append a gradient to the buffer.

  // if(init) {
  //   for(let i = radius4; i < gradientBufferLen; i++) gradient[i] = 0;
  // }

  for(let i = 0; i < Math.ceil(radius)*3; i+=3) {
    const oR = clamp(r, 0, 255);
    const oG = clamp(g, 0, 255);
    const oB = clamp(b, 0, 255);
    if(!add) {
      gradient[i] = oR;
      gradient[i+1] = oG;
      gradient[i+2] = oB;
    } else {
      gradient[i] += oR;
      gradient[i+1] += oG;
      gradient[i+2] += oB;
    }
  }
}

function renderRadialGradient(output:Uint32Array, w:number, h:number, cx:number, cy:number, rr:number, gradient:Uint32Array) {
  const le = Math.min(w-1, Math.max(0, Math.ceil(cx - rr)));
  const ri = Math.min(w-1, Math.max(0, Math.ceil(cx + rr)));
  const to = Math.min(h-1, Math.max(0, Math.ceil(cy - rr)));
  const bo = Math.min(h-1, Math.max(0, Math.ceil(cy + rr)));
  for(let y = to; y < bo; y++) {
    for (let x = le; x < ri; x++) {
      const dist = Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy));
      const xx = Math.floor(dist);
      const d = dist - xx;
      const aR = lerp(gradient[xx*3    ], gradient[(xx+1)*3    ], 1.0-d);
      const aG = lerp(gradient[xx*3 + 1], gradient[(xx+1)*3 + 1], 1.0-d);
      const aB = lerp(gradient[xx*3 + 2], gradient[(xx+1)*3 + 2], 1.0-d);
      const b = getPixelRepeat(output, w, h, x, y, 1);
      const bR = b & 255;
      const bG = b >> 8 & 255;
      const bB = b >> 16 & 255;

      //add blend mode
      const cR = clamp(aR + bR, 0, 255);
      const cG = clamp(aG + bG, 0, 255);
      const cB = clamp(aB + bB, 0, 255);

      //if(dist <= rr) {
        output[y * w + x] = cR | cG << 8 | cB << 16 | 255 << 24;
      //}
    }
  }
}

function renderLine(output:Uint32Array, w:number, h:number, x0:number, y0:number, x1:number, y1:number, r:number, g:number, b:number, add:boolean, gradient:boolean) {
  bresenhamLine(x0, y0, x1, y1, (x, y) => {
    const a = getPixelRepeat(output, w, h, x, y, 1);
    let aR = a & 255;
    let aG = a >> 8 & 255;
    let aB = a >> 16 & 255;
    let aA = a >> 24 & 255;
    let bR = clamp(r * 255, 0, 255);
    let bG = clamp(g * 255, 0, 255);
    let bB = clamp(b * 255, 0, 255);

    //gradient?
    if(gradient) {
      const l = Math.sqrt((y1-y0)*(y1-y0) + (x1-x0)*(x1-x0));
      const cx = x0 + (x1 - x0)*0.5;
      const cy = y0 + (y1 - y0)*0.5;
      const d = Math.sqrt((x-cx)*(x-cx) + (y-cy)*(y-cy));
      const f = 1.0 - d/(l/2);
      bR *= f;
      bG *= f;
      bB *= f;
    }

    let cR, cG, cB;
    if(!add) {
      cR = bR;
      cG = bG;
      cB = bB;
    } else {
      let tmp;
      tmp = aR * bR + 128;
      cR = (aR - ((tmp >> 8) + tmp >> 8)) + bR;
      tmp = aG * bG + 128;
      cG = (aG - ((tmp >> 8) + tmp >> 8)) + bG;
      tmp = aB * bB + 128;
      cB = (aB - ((tmp >> 8) + tmp >> 8)) + bB;
    }

    const val = cR | cG << 8 | cB << 16 | aA << 24;
    setPixel(output, w, h, x, y, val);
    return true;
  });
}

function renderLineBundle(o32:Uint32Array, w:number, h:number, x1:number, y1:number, length:number, alpha:number, spreadAlpha:number, count:number, brightness:number) {
  for(let i = 0; i < count; i++) {
    const a = (alpha-(spreadAlpha/2)) + (spreadAlpha/count)*i;
    const l = length;

    const col1 = brightness;
    const col2 = col1;
    const col3 = col1;

    const xx0 = Math.floor(x1*w);
    const yy0 = Math.floor(y1*h);
    const xx1 = xx0 + Math.floor(Math.cos(a) * l);
    const yy1 = yy0 + Math.floor(Math.sin(a) * l);
    renderLine(o32, w, h, xx0, yy0, xx1, yy1, col1, col2, col3, true, true);
  }
}

function renderStar(o32:Uint32Array, w:number, h:number, x1:number, y1:number, brightness:number, count:number, fudge:number) {
  const fudge1 = fudge;
  let k = 0;
  do {
    const alpha = ((Math.PI*2/count)*k)+(Math.random()*(Math.PI/count));
    const col1 = ((Math.random()*fudge1) / 25.0 + 0.01) * brightness;
    // const col1 = (colorFn(k) / 25.0 + 0.01) * brightness;
    const col2 = col1;
    const col3 = col1;

    const rr = Math.random()*Math.random();
    const xx0 = Math.floor(x1*w);
    const yy0 = Math.floor(y1*h);
    const xx1 = xx0 + Math.floor(Math.cos(alpha) * (w) * rr);
    const yy1 = yy0 + Math.floor(Math.sin(alpha) * (w) * rr);
    renderLine(o32, w, h, xx0, yy0, xx1, yy1, col1, col2, col3, true, false);
    k++;
  } while(k < count)
}

function debugCircle(output:Uint32Array, w:number, h:number, cx:number, cy:number, rr:number) {
  const le = Math.min(w-1, Math.max(0, Math.ceil(cx - rr)));
  const ri = Math.min(w-1, Math.max(0, Math.ceil(cx + rr)));
  const to = Math.min(h-1, Math.max(0, Math.ceil(cy - rr)));
  const bo = Math.min(h-1, Math.max(0, Math.ceil(cy + rr)));
  for(let y = to; y < bo; y++) {
    for(let x = le; x < ri; x++) {
      const dist = Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy));
      const a = Math.min(1.0, Math.max(0.0, rr-dist))*255.0;
      const b = getPixelRepeat(output, w, h, x, y, 1);
      if(dist <= rr) {
        output[y*w+x] += 0xFF111111;
      }
    }
  }
}