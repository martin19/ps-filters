import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorStylizeWind:FilterDescriptor = {
  id : "stylizeWind",
  name : "Wind",
  filter4 : filterStylizeWind4,
  parameters : {
    type: {name: "type", type: "enum", values: ["wind", "blast", "stagger"], default: "wind"},
    direction: {name: "direction", type: "enum", values: ["fromTheRight", "fromTheLeft"], default: "fromTheLeft"},
  }
}

export interface FilterStylizeWindOptions {
  type : "wind"|"blast"|"stagger",
  direction : "fromRight"|"fromLeft",
}

async function filterStylizeWind4(input:FilterInput, output:FilterOutput, options:FilterStylizeWindOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  filterStylizeWindCore(i8.buffer, o8.buffer, w, h, options);
}


function flipH(input:ArrayBuffer, w:number, h:number) {
  const i32 = new Uint32Array(input);
  const o32 = new Uint32Array(w*h);
  for(let y = 0; y < h; y++) {
    let ofsIn = y*w;
    let ofsOut = y*w+(w-1);
    for(let x = w-1; x >= 0; x--) {
      o32[ofsOut--] = i32[ofsIn++];
    }
  }
  i32.set(o32);
}

function invertAlpha(input:Uint8Array) {
  const len = input.length;
  for(let i = 0; i < len; i+=4) {
    input[i + 3] = 255 - input[i + 3];
  }
}

async function filterStylizeWindCore(input:ArrayBuffer, output:ArrayBuffer, w:number, h:number, options:FilterStylizeWindOptions) {
  const tab1 = new Uint16Array(0x10000);
  const tab2 = new Uint16Array(0x10000);
  generateLookupTables(w, tab1, tab2);

  const len = w*h;
  const i32 = new Uint32Array(input);
  const o32 = new Uint32Array(output);
  o32.set(new Uint32Array(input));

  invertAlpha(new Uint8Array(output));

  if(options.direction === "fromRight") flipH(o32.buffer, w, h);

  switch(options.type) {
    case "wind":
      windCore(input, output, w, h, tab1, tab2, options);
      break;
    case "blast":
      blastCore(input, output, w, h, tab1, tab2, options);
      break;
    case "stagger":
      staggerCore(input, output, w, h, tab1, tab2, options);
      staggerCore(input, output, w, h, tab1, tab2, options);
      break;
  }

  if(options.direction === "fromRight") flipH(o32.buffer, w, h);

  invertAlpha(new Uint8Array(output));
}

function windCore(input: ArrayBuffer, output: ArrayBuffer, w: number, h: number, tab1: Uint16Array, tab2: Uint16Array, options: FilterStylizeWindOptions) {
  const o32 = new Uint32Array(output);

  for(let y = 0; y < h; y++) {
    let r = Math.abs(randomLcg16());
    const rowOfs = y*w;
    const w2 = w-1;
    for(let x = w; x > 1; x--) {
      let randomLength1 = tab1[r];
      let randomLength2 = randomLength1;
      r = r + 1 & 0xffff;
      let iOut1 = randomLength2 + rowOfs;
      let iOut2 = iOut1;
      while(randomLength2 < w2) {
        iOut2 += 1;
        const r1 = o32[iOut1] & 255;
        const g1 = o32[iOut1] >>> 8 & 255;
        const b1 = o32[iOut1] >>> 16 & 255;
        const a1 = o32[iOut1] >>> 24 & 255;
        const lum1 = r1 + g1 + b1 + a1;
        const r2 = o32[iOut2] & 255;
        const g2 = o32[iOut2] >>> 8 & 255;
        const b2 = o32[iOut2] >>> 16 & 255;
        const a2 = o32[iOut2] >>> 24 & 255;
        const lum2 = r2 + g2 + b2 + a2;
        if(lum1 <= lum2) break;
        randomLength2 = randomLength1 + 1;
        randomLength1 = randomLength2;
        iOut1 += 1;

        const res = ((r1 + r2) >>> 1) | (((g1 + g2) >>> 1) << 8) | (((b1 + b2) >>> 1) << 16) | (((a1 + a2) >>> 1) << 24);
        o32[iOut2] = res;
      }
    }
  }
}

function blastCore(input: ArrayBuffer, output: ArrayBuffer, w: number, h: number, tab1: Uint16Array, tab2: Uint16Array, options: FilterStylizeWindOptions) {
  const o32 = new Uint32Array(output);

  for(let y = 0; y < h; y++) {
    let r = Math.abs(randomLcg16());
    const rowOfs = y*w;
    const w2 = w-1;
    for(let x = w; x > 1; x--) {
      let randomLength = tab1[r];
      r = r + 1 & 0xffff;
      let iOut1 = randomLength + rowOfs;
      let iOut2 = iOut1;
      let i = 0;
      for (; randomLength < w2; randomLength = randomLength + 1) {
        iOut2++;
        const r1 = o32[iOut1] & 255;
        const g1 = o32[iOut1] >>> 8 & 255;
        const b1 = o32[iOut1] >>> 16 & 255;
        const a1 = o32[iOut1] >>> 24 & 255;
        const lum1 = r1 + g1 + b1 + a1;
        const r2 = o32[iOut2] & 255;
        const g2 = o32[iOut2] >>> 8 & 255;
        const b2 = o32[iOut2] >>> 16 & 255;
        const a2 = o32[iOut2] >>> 24 & 255;
        const lum2 = r2 + g2 + b2 + a2;
        if(lum1 <= lum2) break;
        i++;
        o32[iOut2] = o32[iOut1];
        if(i == 10) break;
        iOut1++;
      }
    }
  }
}

function staggerCore(input: ArrayBuffer, output: ArrayBuffer, w: number, h: number, tab1: Uint16Array, tab2: Uint16Array, options: FilterStylizeWindOptions) {
  const o32 = new Uint32Array(output);

  for(let y = 0; y < h; y++) {
    let r = Math.abs(randomLcg16());
    const rowOfs = y*w;
    const w2 = w-1;
    for(let x = w; x > 0; x--) {
      let randomLength1 = tab1[r];
      let randomLength2 = randomLength1;
      r = r + 1 & 0xffff;
      let iOut1 = randomLength1 + rowOfs;
      let iOut2 = iOut1 + 1;
      let i = 0;
      while(randomLength2 < w2) {
        const val1 = (iOut1 < rowOfs) ? 0 : o32[iOut1];
        const val2 = (iOut2 < rowOfs) ? 0 : o32[iOut2];
        const r1 = val1 & 255;
        const g1 = val1 >>> 8 & 255;
        const b1 = val1 >>> 16 & 255;
        const a1 = val1 >>> 24 & 255;
        const lum1 = r1 + g1 + b1 + a1;
        const r2 = val2 & 255;
        const g2 = val2 >>> 8 & 255;
        const b2 = val2 >>> 16 & 255;
        const a2 = val2 >>> 24 & 255;
        const lum2 = r2 + g2 + b2 + a2;
        if(lum1 <= lum2) break;
        const tmp = val1;
        o32[iOut1] = val2;
        o32[iOut2] = tmp;
        randomLength2 = randomLength1-1;
        randomLength1 = randomLength2;
        iOut1--;
        iOut2--;
      }
    }
  }
}

function generateLookupTables(width:number, tab1:Uint16Array, tab2:Uint16Array) {
  let absRandVal = 0;
  let count = 0;
  let k = 0;
  do {
    const randVal = randomLcg16();
    if (randVal < 1) {
      tab2[k] = -randVal;
      absRandVal = -randVal;
    } else {
      tab2[k] = randVal;
      absRandVal = randVal;
    }
    count = k + 1;
    tab1[k] = absRandVal % width;
    k = count;
  } while (count < 0x10000);
}

/**
 * Generates a random number using the linear congruential generator algorithm.
 * @returns A random number between -32767 and 32767 (inclusive).
 */
let seed = Math.floor(Math.random() * 12345678);
function randomLcg16(): number {
  // Update the seed using the linear congruential generator algorithm
  seed = seed * 0x41a7 + Math.floor(seed / 0x1f31d) * -0x7fffffff;
  // Ensure the seed is within a valid range
  if (seed < 1) {
    seed += 0x7fffffff;
  }
  // Convert the seed into a random number within the range of -32767 to 32767
  return (seed - 1) % 0xfffe - 0x7fff;
}