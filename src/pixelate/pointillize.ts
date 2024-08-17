import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {joinRGBA, premultiplyAlphaPacked, splitRGBA, unmultiplyAlphaPacked} from "../utils/utils-filter";

export const filterDescriptorPixelatePointillize:FilterDescriptor = {
  id : "pixelatePointillize",
  name : "Pointillize",
  filter1 : filterPixelatePointillize1,
  filter4 : filterPixelatePointillize4,
  parameters : {
    cellSize: {name: "cellSize", type: "int", min: 3, max: 300, default: 16}
  }
}

export interface FilterPixelatePointillizeOptions {
  cellSize : number;
  backgroundColor : number[];
}

async function filterPixelatePointillize4(input:FilterInput, output:FilterOutput, options:FilterPixelatePointillizeOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  premultiplyAlphaPacked(i8.buffer);
  let {a:aI, b:bI, g:gI, r:rI} = splitRGBA(i8);
  const rO = new Uint8Array(w*h);
  const gO = new Uint8Array(w*h);
  const bO = new Uint8Array(w*h);
  const aO = new Uint8Array(w*h);

  filterPixelatePointillizeCore([rI,gI,bI,aI], [rO,gO,bO,aO], w, h, {...options, ...{
      backgroundColor : input.backgroundColor ?? [  0,   0,   0]
    }
  });
  joinRGBA(o8, rO, gO, bO, aO);
  unmultiplyAlphaPacked(o8.buffer);
}

async function filterPixelatePointillize1(input:FilterInput, output:FilterOutput, options:FilterPixelatePointillizeOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;
  filterPixelatePointillizeCore([i8], [o8], w, h, {...options, ...{
      backgroundColor : input.backgroundColor ?? [  0,   0,   0]
    }
  });
}

function getN8Centers(cells:Uint32Array,y:number,x:number,cellCountX:number,cellCountY:number, channels:number) {
  const centers = [];
  const ind = (x:number,y:number) => ((y*cellCountX)+x)*(2+channels);
  if(y < cellCountY-1) {
    if(x < cellCountX-1) centers.push(ind(x+1,y+1));
    centers.push(ind(x, y+1));
    if(x > 0) centers.push(ind(x-1,y+1));
  }

  if(x < cellCountX-1) centers.push(ind(x+1, y));
  centers.push(ind(x,y));
  if(x > 0) centers.push(ind(x-1,y));

  if(y > 0) {
    if(x < cellCountX-1) centers.push(ind(x+1,y-1));
    centers.push(ind(x, y-1));
    if(x > 0) centers.push(ind(x-1,y-1));
  }
  return centers;
}

function clamp(x:number, min:number, max:number) {
  return Math.max(min, Math.min(max, x));
}

function sourceOver(a:number, b:number, alpha:number) {
  return alpha * a + (1-alpha) * b;
}

function filterPixelatePointillizeCore(input:U8Array[], output:U8Array[], w:number, h:number, options:FilterPixelatePointillizeOptions) {
  const channels = input.length;
  const i0 = input[0];
  const i1 = input[1];
  const i2 = input[2];
  const i3 = input[3];
  const o0 = output[0];
  const o1 = output[1];
  const o2 = output[2];
  const o3 = output[3];


  const cellDist = 0.75*options.cellSize;
  const radius = options.cellSize/2;
  const colVar = 100;
  const backgroundColor = [...options.backgroundColor, 255] ?? [0,0,0,0];

  for(let c = 0; c < channels; c++) {
    const o = output[c];
    for(let i = 0; i < o.length; i++) {
      o[i] = backgroundColor[c];
    }
  }

  const cellCountX = Math.ceil(w/cellDist);
  const cellCountY = Math.ceil(h/cellDist);
  const cellCount = cellCountX*cellCountY;
  const cells = new Uint32Array(cellCount*(2+channels));

  let cellIndex = 0;
  for(let y = 0; y < h; y+=cellDist) {
    for(let x = 0; x < w; x+=cellDist) {
      const cx = x + Math.random()*cellDist;
      const cy = y + Math.random()*cellDist;
      cells[cellIndex++] = cx;
      cells[cellIndex++] = cy;
      const ofs = (clamp(Math.floor(cy),0,h-1)*w+clamp(Math.floor(cx),0,w-1));
      for(let c = 0; c < channels; c++) {
        cells[cellIndex++] = clamp(input[c][ofs]+((Math.random()-0.5)*colVar), 0, 255);
      }
      //TODO: special for alpha const in13 = clamp(input[ofs+3], 0, 255);
    }
  }

  let celly = 0;
  let cellx = 0;
  let oldCelly = -1;
  let oldCellx = -1;
  let centers:number[]|null = null;
  let ofsOut = 0;
  for(let y = 0; y < h; y++) {
    celly = Math.floor(y/cellDist);
    for(let x = 0; x < w; x++) {
      let dMin1 = Number.MAX_VALUE;
      let dMin2 = Number.MAX_VALUE;
      let cMin1:number = 0;
      let cMin2:number = 0;

      cellx = Math.floor(x/cellDist);
      if(cellx !== oldCellx || celly !== oldCelly) {
        centers = getN8Centers(cells, celly, cellx, cellCountX, cellCountY, channels);
        oldCellx = cellx;
        oldCelly = celly;
      }

      if(!centers) return;
      for(let i = 0; i < centers.length; i++) {
        const c = centers[i];
        const d = (cells[c]-x)*(cells[c]-x)+(cells[c+1]-y)*(cells[c+1]-y);
        if(d < dMin1) {
          dMin2 = dMin1;
          cMin2 = cMin1;
          dMin1 = d;
          cMin1 = c;
        } else if(d < dMin2) {
          dMin2 = d;
          cMin2 = c;
        }
      }

      let d1 = Math.sqrt((x-cells[cMin1])**2+(y-cells[cMin1+1])**2);
      let d2 = Math.sqrt((x-cells[cMin2])**2+(y-cells[cMin2+1])**2);
      if(channels === 4) {
        if(d1 < radius) {
          //smooth gradient between cells with linear interpolation
          const wg1 = clamp(d2-d1, 0, 1);
          const wg2 = 1.0-wg1;

          const a = Math.min(1.0, Math.max(0.0, radius-d1));
          const in10 = cells[cMin1+2];
          const in11 = cells[cMin1+3];
          const in12 = cells[cMin1+4];
          const in13 = a;

          const b = Math.min(1.0, Math.max(0.0, radius-d2));
          const in20 = cells[cMin2+2];
          const in21 = cells[cMin2+3];
          const in22 = cells[cMin2+4];
          const in23 = b;

          const c0 = wg1 * in10 + wg2 * (in10 + in20)/2;
          const c1 = wg1 * in11 + wg2 * (in11 + in21)/2;
          const c2 = wg1 * in12 + wg2 * (in12 + in22)/2;
          const alpha = Math.max(a,b);

          o0[ofsOut] = Math.round(sourceOver(c0, o0[ofsOut], alpha));
          o1[ofsOut] = Math.round(sourceOver(c1, o1[ofsOut], alpha));
          o2[ofsOut] = Math.round(sourceOver(c2, o2[ofsOut], alpha));
          o3[ofsOut] = Math.max(alpha*255, o3[ofsOut]);
        }
      } else if(channels === 1) {
        const wg1 = clamp(d2-d1, 0, 1);
        const wg2 = 1.0-wg1;

        const a = Math.min(1.0, Math.max(0.0, radius-d1));
        const in10 = cells[cMin1+2];

        const b = Math.min(1.0, Math.max(0.0, radius-d2));
        const in20 = cells[cMin2+2];

        const c0 = wg1 * in10 + wg2 * (in10 + in20)/2;
        const alpha = Math.max(a,b);

        o0[ofsOut] = Math.round(sourceOver(c0, o0[ofsOut], alpha));
      }
      ofsOut++;
    }
  }
}

