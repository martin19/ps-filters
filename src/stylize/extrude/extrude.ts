import {clamp, joinRGBA, premultiplyAlphaPacked, splitRGBA, unmultiplyAlphaPacked} from "../../utils/utils-filter";
import {drawTrianglesAA} from "./rasterizer";
import {U8Array} from "../../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../../FilterRegistry/FilterRegistry";
import {Vector2} from "../../../../Utils/Vector2";

export const filterDescriptorStylizeExtrude:FilterDescriptor = {
  id : "stylizeExtrude",
  name : "Extrude",
  filter1 : filterStylizeExtrude1,
  filter4 : filterStylizeExtrude4,
  parameters : {
    shape: {name: "shape", type: "enum", values: ["block", "pyramid"], default: "block"},
    size: {name: "size", type: "int", min: 2, max: 255, default: 50},
    depth: {name: "depth", type: "int", min: 1, max: 255, default: 100},
    depthMode: {name: "depthMode", type: "enum", values: ["random", "levelBased"], default: "levelBased"},
    solidFrontFaces: {name: "solidFrontFaces", type: "boolean", default: false},
    maskIncomplete: {name: "maskIncomplete", type: "boolean", default: false},
  }
}

export interface FilterStylizeExtrudeOptions {
  shape : "block"|"pyramid",
  size : number,
  depth : number,
  depthMode : "random"|"levelBased",
  solidFrontFaces: boolean,
  maskIncomplete : boolean,
  // perspective : number,
}

export async function filterStylizeExtrude1(input:FilterInput, output:FilterOutput, options:FilterStylizeExtrudeOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  filterStylizeExtrudeCore([i8], [o8], w, h, options);
}

export async function filterStylizeExtrude4(input:FilterInput, output:FilterOutput, options:FilterStylizeExtrudeOptions) {
  const i8 = new Uint8Array(input.img);
  const o8 = new Uint8Array(output.img);
  const w = input.w;
  const h = input.h;

  premultiplyAlphaPacked(i8.buffer);
  let {a:aI, b:bI, g:gI, r:rI} = splitRGBA(i8);
  let cIn = [rI, gI, bI, aI];
  let cOut = [
    new Uint8Array(w*h),
    new Uint8Array(w*h),
    new Uint8Array(w*h),
    new Uint8Array(w*h),
  ];

  filterStylizeExtrudeCore(cIn, cOut, w, h, options);
  cOut[3].set(cIn[3]);

  joinRGBA(o8, cOut[0], cOut[1], cOut[2], cOut[3]);
  unmultiplyAlphaPacked(o8.buffer);
}

function makeGrid(w:number, h:number, options:FilterStylizeExtrudeOptions):number[][] {
  const size = options.size;
  let tilesX = Math.ceil(w / size);
  let tilesY = Math.ceil(h / size);

  const grid:number[][] = [];
  let y = (h/2)-Math.floor(tilesY/2)*size;
  for(let i = 0; i < tilesY; i++) {
    let x = (w/2)-Math.floor(tilesX/2)*size;
    for(let j = 0; j < tilesX; j++) {
      grid.push([x,y]);
      x += size;
    }
    y += size;
  }

  return grid;
}

function createMesh(x0 : number, y0 : number, x1 : number, y1 : number, size : number, cols:number[][], options:FilterStylizeExtrudeOptions) {
  const size2 = size/2;

  const lt0:Vector2 = new Vector2(x0 - size2, y0 - size2);
  const rt0:Vector2 = new Vector2(x0 + size2, y0 - size2);
  const rb0:Vector2 = new Vector2(x0 + size2, y0 + size2);
  const lb0:Vector2 = new Vector2(x0 - size2, y0 + size2);

  let lt1:Vector2 = new Vector2(0,0), rt1:Vector2 = new Vector2(0,0),
    rb1:Vector2 = new Vector2(0,0), lb1:Vector2  = new Vector2(0,0);
  if(options.shape === "block") {
    lt1 = new Vector2(x1 - size2, y1 - size2);
    rt1 = new Vector2(x1 + size2, y1 - size2);
    rb1 = new Vector2(x1 + size2, y1 + size2);
    lb1 = new Vector2(x1 - size2, y1 + size2);
  } else if(options.shape === "pyramid") {
    lt1 = new Vector2(x1, y1);
    rt1 = new Vector2(x1, y1);
    rb1 = new Vector2(x1, y1);
    lb1 = new Vector2(x1, y1);
  }

  const colorT:number[][] = [cols[0], cols[0]];
  const colorR:number[][] = [cols[1], cols[1]];
  const colorB:number[][] = [cols[2], cols[2]];
  const colorL:number[][] = [cols[3], cols[3]];
  const trisT:Vector2[][] = [[lt0, rt0, lt1], [rt0, rt1, lt1]];
  const trisR:Vector2[][] = [[rt0, rb0, rb1], [rt0, rb1, rt1]];
  const trisB:Vector2[][] = [[rb1, rb0, lb1], [rb0, lb0, lb1]];
  const trisL:Vector2[][] = [[lt0, lt1, lb0], [lb0, lt1, lb1]];

  const triangles:Vector2[][] = [];
  let colors:number[][] = [];

  //cases for different block variants:
  if(x1 <= x0 && y1 <= y0) {
    triangles.push(...trisB, ...trisR);
    colors.push(...colorB, ...colorR);
    if(x0 - x1 < size2) {
      triangles.push(...trisL);
      colors.push(...colorL);
    }
    if(y0 - y1 < size2) {
      triangles.push(...trisT);
      colors.push(...colorT);
    }
  } else if(x1 > x0 && y1 <= y0) {
    triangles.push(...trisB, ...trisL);
    colors.push(...colorB, ...colorL);
    if(x1 - x0 < size2) {
      triangles.push(...trisR);
      colors.push(...colorR);
    }
    if(y0 - y1 < size2) {
      triangles.push(...trisT);
      colors.push(...colorT);
    }
  } else if(x1 > x0 && y1 > y0) {
    triangles.push(...trisT, ...trisL);
    colors.push(...colorT, ...colorL);
    if(x1 - x0 < size2) {
      triangles.push(...trisR);
      colors.push(...colorR);
    }
    if(y1 - y0 < size2) {
      triangles.push(...trisB);
      colors.push(...colorB);
    }
  } else if(x1 <= x0 && y1 > y0) {
    triangles.push(...trisT, ...trisR);
    colors.push(...colorT, ...colorR);
    if(x0 - x1 < size2) {
      triangles.push(...trisL);
      colors.push(...colorL);
    }
    if(y1 - y0 < size2) {
      triangles.push(...trisB);
      colors.push(...colorB);
    }
  }

  return { triangles, colors };
}

function renderLayer(output:U8Array[], w:number, h:number, x0:number, y0:number, x1:number, y1:number, size:number, colors:number[][], options:FilterStylizeExtrudeOptions) {
  let mesh = createMesh(x0, y0, x1, y1, size, colors, options);
  drawTrianglesAA(output, w, h, mesh.triangles, mesh.colors);
}

function computeGridColors(input:U8Array[], w:number, h:number, grid:number[][], options:FilterStylizeExtrudeOptions):number[][][] {

  function getAvgColor(input:U8Array[], w:number, h:number, x0:number, y0:number, x1:number, y1:number):number[] {
    const i0 = input[0];
    const i1 = input[1];
    const i2 = input[2];
    const i3 = input[3];
    x0 = Math.max(0, Math.min(x0, w-1));
    x1 = Math.max(0, Math.min(x1, w-1));
    y0 = Math.max(0, Math.min(y0, h-1));
    y1 = Math.max(0, Math.min(y1, h-1));
    const avg:number[] = [0,0,0,0];
    let totalAlpha = 0;
    for(let y = y0; y < y1; y++) {
      for(let x = x0; x < x1; x++) {
        const ofs = (y*w+x);
        avg[0] += i0[ofs];
        avg[1] += i1[ofs];
        avg[2] += i2[ofs];
        avg[3] += i3[ofs];
        totalAlpha += i3[ofs]/255;
      }
    }
    const area = (y1-y0)*(x1-x0);
    avg[0] /= totalAlpha;
    avg[1] /= totalAlpha;
    avg[2] /= totalAlpha;
    avg[3] /= totalAlpha;
    return avg;
  }

  const size2 = Math.ceil(options.size/2);
  const colors:number[][][] = [];
  for(let i = 0; i < grid.length; i++) {
    let avg = getAvgColor(input, w, h,
      grid[i][0]-size2,
      grid[i][1]-size2,
      grid[i][0]+size2,
      grid[i][1]+size2);
    const faceColors:number[][] = [];
    //center (100%), top (110%), right (87%), bottom (80%), left (93%)
    [1, 1.1, 0.87, 0.8, 0.93].forEach(br => {
      faceColors.push([
        clamp(avg[0]*br, 0,255),
        clamp(avg[1]*br, 0,255),
        clamp(avg[2]*br, 0,255),
        avg[3]
      ]);
    });
    colors.push(faceColors);
  }
  return colors;
}

function computePerspective(w:number, h:number, coords:number[][], depths:number[], options:FilterStylizeExtrudeOptions):number[][] {
  const f = 255;
  const xys:number[][] = [];
  const cx = w / 2;
  const cy = h / 2;

  //try different projections
  for(let i = 0; i < coords.length; i++) {
    const [x, y] = coords[i];
    const z = depths[i];
    const s = options.size;

    // const f = options.perspective;
    const f = 1.5;

    //transform
    const xp = (x - cx)*(1+f*z) + cx;  //z=0 scale by 1, z = 256 scale by 3
    const yp = (y - cy)*(1+f*z) + cy;
    const sp = options.solidFrontFaces ? s*(1+f*z) : s;
    xys.push([xp, yp, sp]);
  }

  return xys;
}

function renderTopFace(input:U8Array[], output:U8Array[], w:number, h:number, x0:number, y0:number, x1:number, y1:number, size : number,
                       colors:number[][], options:FilterStylizeExtrudeOptions) {

  const i0 = input[0];
  const i1 = input[1];
  const i2 = input[2];
  const i3 = input[3];
  const o0 = output[0];
  const o1 = output[1];
  const o2 = output[2];
  const o3 = output[3];

  const size2 = size/2;
  let sx = Math.floor(x1-size2);
  let ex = Math.floor(x1+size2);
  let sy = Math.floor(y1-size2);
  let ey = Math.floor(y1+size2);
  sx = Math.max(0, Math.min(sx, w-1));
  ex = Math.max(0, Math.min(ex, w-1));
  sy = Math.max(0, Math.min(sy, h-1));
  ey = Math.max(0, Math.min(ey, h-1));
  for(let yDst = sy; yDst <= ey; yDst++) {
    for(let xDst = sx; xDst <= ex; xDst++) {

      const xSrc = xDst - Math.floor((x1-x0));
      const ySrc = yDst - Math.floor((y1-y0));
      const ofsDst = (yDst*w+xDst);
      if(options.solidFrontFaces) {
        o0[ofsDst] = colors[0][0];
        o1[ofsDst] = colors[0][1];
        o2[ofsDst] = colors[0][2];
        o3[ofsDst] = colors[0][3];
      } else {
        if(xSrc >= 0 && xSrc < w && ySrc >= 0 && ySrc < h) {
          const ofsSrc = (ySrc*w+xSrc);
          o0[ofsDst] = i0[ofsSrc];
          o1[ofsDst] = i1[ofsSrc];
          o2[ofsDst] = i2[ofsSrc];
          o3[ofsDst] = i3[ofsSrc];
        }
      }
    }
  }
}

function filterStylizeExtrudeCore(input:U8Array[], output:U8Array[], w:number, h:number, options:FilterStylizeExtrudeOptions) {
  for(let c = 0; c < input.length; c++) {
    const ii = input[c];
    const oo = output[c];
    for(let i = 0; i < ii.length; i++) oo[i] = ii[i];
  }


  const centers = makeGrid(w, h, options);
  const gridColors = computeGridColors(input, w, h, centers, options);
  let depths:number[];
  if(options.depthMode === "random") {
    depths = centers.map(() => { return Math.random()*(options.depth/256) });
  } else {
    depths = gridColors.map((colors) => {
      const color = colors[0];
      return ((color[0]*0.2126+color[1]*0.7152+color[2]*0.0722)/255)*(options.depth/256);
    });
  }
  const coords = computePerspective(w, h, centers, depths, options);


  //get index to centers array sorted by decreasing distance from image center
  const cx = w/2;
  const cy = h/2;
  const blockIndices = centers.map((center, i) => [i, (cx-center[0])**2 + (cy-center[1])**2])
    .sort((a, b) => a[1] < b[1] ? 1 : -1)
    .map(value => value[0]);

  for(let i = 0; i < blockIndices.length; i++) {
    const ib = blockIndices[i];
    const center = centers[ib];
    const colors = gridColors[ib];
    const xys = coords[ib];
    const depth = depths[ib];

    renderLayer(output, w, h,
      center[0], center[1], xys[0], xys[1], xys[2], colors, options);
    if(options.shape === "block") {
      renderTopFace(input, output, w, h,
      center[0], center[1], xys[0], xys[1], xys[2], colors, options);
    }
  }
}