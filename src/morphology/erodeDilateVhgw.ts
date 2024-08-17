import {U8Array} from "../utils/Types";
import {scanDiag} from "./scanDiag";

//vanHerks method for morphology
//https://tpgit.github.io/Leptonica/graymorphlow_8c_source.html
export function dilateErodeDiag(datas:U8Array, datad:U8Array, w:number, h:number, size:number, operation:"dilate"|"erode", direction:"diag1"|"diag2") {
  if(size === 0) {
    for(let i = 0; i < datas.length; i++) datad[i] = datas[i];
    return;
  }

  const op = operation === "dilate" ? Math.max : Math.min;
  const initVal = operation === "dilate" ? 0 : 255;
  const buffer = new Uint8Array(Math.ceil(Math.sqrt(w*w + h*h)) + Math.ceil(size / 2));
  const maxarray = new Uint8Array(2*size+1);
  const hsize = Math.floor(size / 2);

  let len = 0;
  let i:number|null = null;
  const ofsBuffer = new Uint32Array(buffer.length);
  scanDiag(w, h, direction=== "diag1" ? 0 : 1, 0, +1, (x,y,line)=>{
    if(i !== line) {
      if(i !== null) processLine(ofsBuffer, len);
      i = line;
      len = 0;
      ofsBuffer[len++] = y*w+x;
    } else {
      ofsBuffer[len++] = y*w+x;
    }
  });

  function processLine(ofsBuffer:Uint32Array, len:number) {
    let i = 0, j, k;
    let startmax, startx, starty;
    let maxval;
    let lines, lined;
    const nsteps = Math.ceil(len / size);

    if(buffer.length < (len + 2 * hsize)) {
      console.log("buffer.length is too small",buffer.length,len);
    }

    /* fill buffer with pixels and add border */
    for (j = 0; j < hsize; j++) buffer[j] = initVal;
    for (j = 0; j < len; j++) buffer[j + hsize] = datas[ofsBuffer[j]];
    for (j = 0; j < hsize; j++) buffer[len + hsize + j] = initVal;

    for (j = 0; j < nsteps; j++) {
      /* refill the minarray */
      startmax = (j + 1) * size - 1;
      maxarray[size - 1] = buffer[startmax];
      for (k = 1; k < size; k++) {
        maxarray[size - 1 - k] = op(maxarray[size - k], buffer[startmax - k]);
        maxarray[size - 1 + k] = op(maxarray[size + k - 2], buffer[startmax + k]);
      }

      /* compute dilation values */
      startx = j * size;
      datad[ofsBuffer[startx]] = maxarray[0];
      datad[ofsBuffer[startx + size - 1]] = maxarray[2 * size - 2];
      for (k = 1; k < size - 1; k++) {
        maxval = op(maxarray[k], maxarray[k + size - 1]);
        datad[ofsBuffer[startx + k]] = maxval;
      }
    }
  }
}


export function dilateErode(datas:U8Array, datad:U8Array, w:number, h:number,
  size:number, operation:"dilate"|"erode", direction:"horiz"|"vert") {
  const op = operation === "dilate" ? Math.max : Math.min;
  const initVal = operation === "dilate" ? 0 : 255;
  const buffer = new Uint8Array(Math.max(w, h) + size);
  const maxarray = new Uint8Array(2*size+1);
  const dim1 = direction === "horiz" ? w : h;
  const dim2 = direction === "horiz" ? h : w;
  const step = direction === "horiz" ? w : 1;
  const step2 = direction === "horiz" ? 1 : w;

  let i, j, k;
  let hsize, nsteps, startmax, startx, starty;
  let maxval;
  let lines, lined;

  hsize = Math.floor(size / 2);
  nsteps = Math.ceil(dim1 / size);
  for (i = 0; i < dim2; i++) {
    lines = i * step;
    lined = i * step;

    /* fill buffer with pixels and add border */
    for (j = 0; j < hsize; j++) buffer[j] = initVal;
    for (j = 0; j < dim1; j++) buffer[j + hsize] = datas[lines + j*step2];
    for (j = 0; j < hsize; j++) buffer[dim1 + hsize + j] = initVal;

    for (j = 0; j < nsteps; j++) {
      /* refill the minarray */
      startmax = (j + 1) * size - 1;
      maxarray[size - 1] = buffer[startmax];
      for (k = 1; k < size; k++) {
        maxarray[size - 1 - k] = op(maxarray[size - k], buffer[startmax - k]);
        maxarray[size - 1 + k] = op(maxarray[size + k - 2], buffer[startmax + k]);
      }

      /* compute dilation values */
      startx = j * size;
      datad[lined + startx*step2] = maxarray[0];
      datad[lined + (startx + size - 1)*step2] = maxarray[2 * size - 2];
      for (k = 1; k < size - 1; k++) {
        maxval = op(maxarray[k], maxarray[k + size - 1]);
        const xofs = (startx + k)*step2;
        datad[lined + xofs] = maxval;
      }
    }
  }
}

export function dilateVhgw(src:U8Array, dst:U8Array, w : number, h : number, size : number, shape:"square"|"octagon") {
  const tmp = new Uint8Array(w*h);
  const tmp2 = new Uint8Array(w*h);
  if(shape === "octagon") {
    let s1 = size*0.5;
    let s2 = size*2-size*0.5;
    s1 = 2*Math.floor(s1/2)+1;
    s2 = 2*Math.ceil(s2/2)+1;

    dilateErodeDiag(src, tmp, w, h, s1, "dilate", "diag1");
    dilateErodeDiag(tmp, tmp2, w, h, s1, "dilate", "diag2");
    dilateErode(tmp2, tmp, w, h, s2, "dilate", "horiz");
    dilateErode(tmp, dst, w, h, s2, "dilate", "vert");

  } else {
    dilateErode(src, tmp, w, h, size, "dilate", "horiz");
    dilateErode(tmp, dst, w, h, size, "dilate", "vert");
  }
}

export function erodeVhgw(src:U8Array, dst:U8Array, w : number, h : number, size : number, shape:"square"|"octagon") {
  const tmp = new Uint8Array(w*h);
  const tmp2 = new Uint8Array(w*h);
  if(shape === "octagon") {
    let s1 = size*0.5;
    let s2 = size*2-size*0.5;
    s1 = 2*Math.floor(s1/2)+1;
    s2 = 2*Math.ceil(s2/2)+1;

    dilateErodeDiag(src, tmp, w, h, s1, "erode", "diag1");
    dilateErodeDiag(tmp, tmp2, w, h, s1, "erode", "diag2");
    dilateErode(tmp2, tmp, w, h, s2, "erode", "horiz");
    dilateErode(tmp, dst, w, h, s2, "erode", "vert");

  } else {
    dilateErode(src, tmp, w, h, size, "erode", "horiz");
    dilateErode(tmp, dst, w, h, size, "erode", "vert");
  }
}