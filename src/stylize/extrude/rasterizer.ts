import {U8Array} from "../../utils/Types";
import {Vector2} from "../../../../Utils/Vector2";
import {Rect} from "../../../../Utils/Rect";

function blend(a0:number, a1:number, a2:number, a3:number, b0:number, b1:number, b2:number, b3:number) {
  const aa = a3/255;
  const ba = b3/255;

  //premultiply alpha
  const ar = a0*aa;
  const ag = a1*aa;
  const ab = a2*aa;

  const br = b0*ba;
  const bg = b1*ba;
  const bb = b2*ba;


  //blend
  let cr = Math.max(0, Math.min(255, ar + br*(1.0-aa)));
  let cg = Math.max(0, Math.min(255, ag + bg*(1.0-aa)));
  let cb = Math.max(0, Math.min(255, ab + bb*(1.0-aa)));
  let ca = Math.max(0, Math.min(1.0, aa + ba*(1.0-aa)));
  // let ca = Math.max(0, Math.min(1.0, aa + ba));

  //demultiply alpha
  cr = cr/(ca+0.0001);
  cg = cg/(ca+0.0001);
  cb = cb/(ca+0.0001);
  return [cr, cg, cb, ca*255];
}

function orient2d(a : Vector2, b : Vector2, c : Vector2) {
  return (b.x-a.x)*(c.y-a.y) - (b.y-a.y)*(c.x-a.x);
}

function computeCoverage(w0px:number, w1px:number, w2px:number, sub:number, A01s:number, A12s:number, A20s:number,
                         B01s:number, B12s:number, B20s:number) {
  const s = 1/(sub*sub);

  let w0_row = w0px;
  let w1_row = w1px;
  let w2_row = w2px;

  //compute coverage for current pixel and triangle
  let coverage = 0;
  for(let yy = 0; yy < sub; yy++) {

    // Barycentric coordinates at start of pixel
    let w0 = w0_row;
    let w1 = w1_row;
    let w2 = w2_row;

    for(let xx = 0; xx < sub; xx++) {
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
        coverage += s;
      }

      // One step to the right
      w0 += A12s;
      w1 += A20s;
      w2 += A01s;
    }

    // One row step
    w0_row += B12s;
    w1_row += B20s;
    w2_row += B01s;
  }
  return coverage;
}

export function drawTrianglesAA(output:U8Array[], w : number, h : number, tris:Vector2[][], colors:number[][], roi?:Rect) {
  if(tris.length === 0) return;
  const sub = 2;
  const o0 = output[0];
  const o1 = output[1];
  const o2 = output[2];
  const o3 = output[3];

  // Compute triangle bounding box
  let minX = +Number.MAX_VALUE;
  let maxX = -Number.MAX_VALUE;
  let minY = +Number.MAX_VALUE;
  let maxY = -Number.MAX_VALUE;

  for(let i = 0; i < tris.length; i++) {
    const tri = tris[i];
    minX = Math.min(minX, tri[0].x, tri[1].x, tri[2].x);
    maxX = Math.max(maxX, tri[0].x, tri[1].x, tri[2].x);
    minY = Math.min(minY, tri[0].y, tri[1].y, tri[2].y);
    maxY = Math.max(maxY, tri[0].y, tri[1].y, tri[2].y);
  }

  minX = Math.floor(minX);
  maxX = Math.ceil(maxX);
  minY = Math.floor(minY);
  maxY = Math.ceil(maxY);

  //Clip against roi
  if(roi) {
    minX = Math.max(minX, roi.x);
    minY = Math.max(minY, roi.y);
    maxX = Math.min(maxX, roi.x + roi.w);
    maxY = Math.min(maxY, roi.y + roi.h);
  }

  // Clip against screen bounds
  minX = Math.max(minX, 0);
  minY = Math.max(minY, 0);
  maxX = Math.min(maxX, w - 1);
  maxY = Math.min(maxY, h - 1);

  //TODO: speed this up
  const tmp = new Uint8Array((maxX-minX+1)*(maxY-minY+1)*4);
  tmp.fill(0);

  for(let t = 0; t < tris.length; t++) {
    const tri = tris[t];
    const color = colors[t];

    // Triangle setup
    let A01 = tri[0].y - tri[1].y, B01 = tri[1].x - tri[0].x;
    let A12 = tri[1].y - tri[2].y, B12 = tri[2].x - tri[1].x;
    let A20 = tri[2].y - tri[0].y, B20 = tri[0].x - tri[2].x;
    let A01s = A01/sub, B01s = B01/sub;
    let A12s = A12/sub, B12s = B12/sub;
    let A20s = A20/sub, B20s = B20/sub;

    // Barycentric coordinates at minX/minY corner
    const p = new Vector2(minX, minY);
    let w0_row = orient2d(tri[1], tri[2], p);
    let w1_row = orient2d(tri[2], tri[0], p);
    let w2_row = orient2d(tri[0], tri[1], p);

    // Rasterize
    let ofs = 0;
    for (let y = minY; y <= maxY; y++) {

      // Barycentric coordinates at start of row
      let w0 = w0_row;
      let w1 = w1_row;
      let w2 = w2_row;

      for (let x = minX; x <= maxX; x++) {

        const coverage = computeCoverage(w0, w1, w2, sub, A01s, A12s, A20s, B01s, B12s, B20s);

        const c = blend(color[0], color[1], color[2], coverage*255, tmp[ofs ], tmp[ofs+1], tmp[ofs+2], tmp[ofs+3]);
        tmp[ofs  ] = c[0];
        tmp[ofs+1] = c[1];
        tmp[ofs+2] = c[2];
        tmp[ofs+3] = Math.max(0, Math.min(255, tmp[ofs+3] + coverage*255));

        // One step to the right
        w0 += A12;
        w1 += A20;
        w2 += A01;

        ofs += 4;
      }
      // One row step
      w0_row += B12;
      w1_row += B20;
      w2_row += B01;
    }
  }

  let ofsSrc = 0;
  for(let y = minY; y <= maxY; y++) {
    for(let x = minX; x <= maxX; x++) {
      const ofsDst = (y*w)+x;
      let c = blend(tmp[ofsSrc], tmp[ofsSrc+1], tmp[ofsSrc+2], tmp[ofsSrc+3], o0[ofsDst], o1[ofsDst], o2[ofsDst], o3[ofsDst]);
      o0[ofsDst] = c[0];
      o1[ofsDst] = c[1];
      o2[ofsDst] = c[2];
      o3[ofsDst] = c[3];
      ofsSrc += 4;
    }
  }
}