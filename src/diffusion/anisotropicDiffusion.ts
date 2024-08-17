import {boxBlurX, boxBlurY} from "../utils/gauss";
import {conv2} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";


export function anisotropicDiffusion(input:U8Array, output:U8Array, w:number, h:number, sharpness:number, anisotropy:number,
                                     amplitude:number, da:number, dl:number, gaussPrec:number, radiusBlurTensor:number) {
  const len = w*h;
  const I  = new Float32Array(len);
  const Ix = new Float32Array(len);
  const Iy = new Float32Array(len);
  const T  = new Float32Array(len*3);

  for(let i = 0; i < w*h; i++) {
    I[i] = (input[i])/255.0;
  }

  computeSobel(I, Ix, Iy, w, h);

  // for(let i = 0; i < len; i++) output[i] = Iy[i]*255;

  computeStructureTensor(Ix, Iy, T, w, h, sharpness, anisotropy, radiusBlurTensor);

  computeLic(I, T, output, w, h, amplitude, da, dl, gaussPrec);
}

function computeStructureTensor(Ix:Float32Array, Iy:Float32Array, T:Float32Array, w:number, h:number, sharpness:number, anisotropy:number, radiusBlurTensor:number) {

  const Ixx = new Float32Array(w*h);
  const Iyy = new Float32Array(w*h);
  const Ixy = new Float32Array(w*h);
  const tmp = new Float32Array(w*h);
  const A = new Float32Array(w*h);
  const B = new Float32Array(w*h);
  const D = new Float32Array(w*h);

  for(let i = 0; i < w*h; i++) {
    Ixx[i] = Ix[i]*Ix[i];
    Ixy[i] = Ix[i]*Iy[i];
    Iyy[i] = Iy[i]*Iy[i];
  }

  //apply smoothing to matrix components
  //    float avg[9] =  { 1.0f, 1.0f, 1.0f, 1.0f, 1.0f, 1.0f, 1.0f, 1.0f, 1.0f };
  //    conv2(Ixx, A, w, h, avg, 3, 3);
  //    conv2(Ixy, B, w, h, avg, 3, 3);
  //    conv2(Iyy, D, w, h, avg, 3, 3);

  boxBlurX(Ixx, tmp, w, h, radiusBlurTensor);
  boxBlurY(tmp, A, w, h, radiusBlurTensor);
  boxBlurX(Ixy, tmp, w, h, radiusBlurTensor);
  boxBlurY(tmp, B, w, h, radiusBlurTensor);
  boxBlurX(Iyy, tmp, w, h, radiusBlurTensor);
  boxBlurY(tmp, D, w, h, radiusBlurTensor);

  let ofs = 0;
  for(let y = 0; y < h; y++) {
    for(let x = 0; x < w; x++) {
      //compute eigenvectors and eigenvalues
      let a = A[ofs];
      let b = B[ofs];
      let c = b;
      let d = D[ofs];

      let e = a + d;
      let f = Math.sqrt(Math.max(e*e - 4.0*(a*d - b*c), 0.0));
      let l1 = 0.5*(e - f);
      let l2 = 0.5*(e + f);
      let n = Math.sqrt((l2-a)*(l2-a) + b*b);

      let ux, uy, vx, vy;
      if(n > 0.0) {
        ux = b / n;
        uy = (l2 - a)/n;
      } else {
        ux = 1.0;
        uy = 0.0;
      }
      vx = -uy;
      vy = ux;

      if(l1 < l2) {
        let tmp;
        tmp = l2;
        l1 = l2;
        l2 = tmp;
        tmp = vx;
        vx = ux;
        ux = tmp;
        tmp = vy;
        vy = uy;
        uy = tmp;
      }

      //compute diffusion tensor
      if(l1 <= 0.0) l1 = 0.0;
      if(l2 <= 0.0) l2 = 0.0;

      let power1 = Math.max(sharpness, 1e-5);
      let power2 = power1/(1e-7 + 1.0 - anisotropy);

      let n1 = Math.pow(1.0 + l1 + l2, -power1);
      let n2 = Math.pow(1.0 + l1 + l2, -power2);

      let d0 = n1*ux*ux + n2*vx*vx;
      let d1 = n1*ux*uy + n2*vx*vy;
      let d2 = n1*uy*uy + n2*vy*vy;

      let ofs2 = ofs*3;
      T[ofs2++] = d0;
      T[ofs2++] = d1;
      T[ofs2] = d2;

      ofs++;
    }
  }
}

function computeSobel(I:Float32Array, Ix:Float32Array, Iy:Float32Array, w:number, h:number) {
  const sx = [-1.0, 0.0, +1.0, -2.0, 0.0, +2.0, -1.0, 0.0, +1.0];
  const sy = [-1.0,-2.0, -1.0, 0.0, 0.0, 0.0, +1.0,+2.0, +1.0 ];
  conv2(I, Ix, w, h, sx, 3, 3);
  conv2(I, Iy, w, h, sy, 3, 3);
}

function computeLic(I:Float32Array, T:Float32Array, O:U8Array, w:number, h:number, amplitude:number, da:number, dl:number, gaussPrec:number) {
  const len = w*h;
  let sqrt2amplitude = Math.sqrt(2.0*amplitude);
  const W:Float32Array = new Float32Array(len * 3);
  const o:Float32Array = new Float32Array(len);
  o.fill(0);
  const ww = w;
  const hh = h;

  let theta = 0;
  let N = 0;
  while(theta < 360.0) {
    let thetar = (theta*Math.PI/180.0);
    let vx = Math.cos(thetar);
    let vy = Math.sin(thetar);
    let ofsSrc = 0;
    let ofsDst = 0;
    for(let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let a = T[ofsSrc++];
        let b = T[ofsSrc++];
        let c = T[ofsSrc++];
        let u = (a*vx + b*vy);
        let v = (b*vx + c*vy);
        let n = Math.max(1e-5, Math.sqrt(u*u+v*v)),
        dln = dl/n;
        W[ofsDst++] = u * dln;
        W[ofsDst++] = v * dln;
        W[ofsDst++] = n;
      }
    }

    let ofs = 0;
    for(let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let n = W[ofs*3 + 2];
        let fsigma = (n*sqrt2amplitude);
        let fsigma2 = 2*fsigma*fsigma;
        let length = gaussPrec*fsigma;

        let S = 0.0;
        let mean = 0.0;
        let X = x;
        let Y = y;

        let l = 0.0;
        while (l<length && X>=0 && X<ww && Y>=0 && Y<hh) {
          const cx = Math.floor(X);
          const cy = Math.floor(Y);
          const ofs1 = (cy*w+cx);
          const ofs2 = ofs1*3;
          const u = W[ofs2    ];
          const v = W[ofs2 + 1];
          mean += I[ofs1];
          S += 1.0;
          l += dl;
          X += u;
          Y += v;
        }
        o[ofs] += (mean/S);
        ofs++;
      }
    }

    theta += da;
    N++;
  }

  for(let i = 0; i < len; i++) {
    const x = o[i]/N;
    O[i] = Math.max(0, Math.min(255, x*255));
  }
}