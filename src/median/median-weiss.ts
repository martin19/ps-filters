import {U8Array} from "../utils/Types";
import {getPixelRepeat} from "../utils/utils-filter";

export function medianWeiss(input:U8Array, output:U8Array, w:number, h:number, radius:number) {
  //example for N = 9, T = 2
  const N = 9;
  const r = 4;
  const rr = radius+radius;
  const rr1 = radius+radius+1;
  const pixelsInWindow = rr1**2;
  const hStar = new Int16Array(rr1*256);
  const hC = new Uint32Array(256);
  const th = ((radius+radius+1)**2)/2;

  function addRowToHStar(x0:number, y:number, sign:number) {
    //initialize first r partial histograms (P_0..P_3)
    for(let h = 0; h < r; h++) {
      const hOfs = h*256;
      for(let i = h; i < r; i++) {
        const val1 = input[y*w+i];
        const val2 = input[y*w+(rr1+i)]
        hStar[hOfs+val1]+=sign;
        hStar[hOfs+val2]-=sign;
      }
    }

    //initialize central histogram (P_4)
    const hOfs = r;
    for(let i = r; i < 2*r+r; i++) {
      const val = input[y*w+i];
      hStar[hOfs+val]+=sign;
    }

    //initialize last r partial histograms (P_5..P_8)
    for(let h = r; h < rr1; h++) {
      const hOfs = (h+1)*256;
      for(let i = r; i < h; i++) {
        const val1 = input[y*w+i];
        const val2 = input[y*w+(rr1+i)]
        hStar[hOfs+val1]-=sign;
        hStar[hOfs+val2]+=sign;
      }
    }
  }

  function computeMedians(x0 : number, y : number) {
    const ofsC = (r+1)*256;

    //compute medians of (P_0..P_3)
    {
      for(let i = 0; i < r; i++) {
        const ofsI = 256*i

        //compute n-th median
        let med = 0;
        let sum = 0;
        while(sum < th) {
          sum = sum + hStar[ofsI+med] + hStar[ofsC+med];
        }
        output[y*h+x0+i] = med;
      }
    }

    //compute medians of (P_4)
    {
      let med = 0;
      let sum = 0;
      while(sum < th) {
        sum = sum + hStar[ofsC+med];
      }
      output[y*h+x0+r] = med;
    }

    //compute medians of (P_5..P_8)
    {
      for(let i = r; i < rr1; i++) {
        const ofsI = 256*i

        //compute n-th median
        let med = 0;
        let sum = 0;
        while(sum < th) {
          sum = sum + hStar[ofsI+med] + hStar[ofsC+med];
        }
        output[y*h+x0+i] = med;
      }
    }
  }

  function initializeHStar(x0:number) {
    for(let y = 0; y < rr1; y++) {
      addRowToHStar(x0, y, 1);
    }
  }

  for(let x = 0; x < w; x+=rr1) {
    initializeHStar(x);
    computeMedians(x, 0);
    for(let y = 1; y < h; y++) {
      addRowToHStar(x, y+rr, 1);
      addRowToHStar(x, y, -1);
      computeMedians(x, y);
    }
  }

  //TODO: make sure adding subtracting rows works as expected.
  //TODO: make sure indices for x0 are used correctly, x0 references the leftmost column of a column batch
  //TODO: generalize for arbitrary radius
  //TODO: add more tiers
}

