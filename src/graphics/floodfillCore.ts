import {U8Array} from "../utils/Types";
import {Rect} from "../../../Utils/Rect";


interface BoundingBox {
  xmin : number,
  xmax : number,
  ymin : number,
  ymax : number
}

/**
 * Fills in a canvas starting from seed point p using Heckbert's scanline floodfill algorithm (4-neighborhood)
 * @param xx
 * @param yy
 * @param win - constrain the filled region within a rectangle
 * @param pixelRead - function determines if a pixel should be filled
 * @param pixelWrite - function fills a pixel
 * @return
 */
function floodfill(xx : number, yy : number, win:Rect, pixelRead:(x:number, y:number)=>boolean, pixelWrite:(x:number, y:number)=>void) {

  //TODO: it is unclear if check must include -1 , seems -1 will corrupt bbox computation by 1
  let inVerticalBounds = function () {
    //return ( (cur.y + cur.dy >= win.y - 1) && (cur.y + cur.dy <= win.y + win.h - 1) );
    return ( (cur.y + cur.dy >= win.y - 1) && (cur.y + cur.dy <= win.y + win.h) );
  };

  let stackPush = function (stack:Array<any>, y:number, x1:number, x2:number, dy:number, bb:BoundingBox) {
    stack.push({y: y, x1: x1, x2: x2, dy: dy});
  };

  //1. initialization
  let x = xx;
  let y = yy; //col counter
  let l : number;

  //init bboxout
  let bb = {
    xmin: +Number.MAX_VALUE,
    xmax: -Number.MAX_VALUE,
    ymin: +Number.MAX_VALUE,
    ymax: -Number.MAX_VALUE
  };

  let stack : Array<any> = [];
  let cur = {y: 0, x1: 0, x2: 0, dy: 0};
  let lineOfs:number;

  //check seed pixel - return empty
  if (!pixelRead(xx - win.x, yy)) {
    return new Rect();   //empty bbox
  }

  //check seed pixel coordinates
  if ((x < win.x) || (x > win.x + win.w) || (y < win.y) || (y > win.y + win.h)) {
    return new Rect(); //empty bbox
  }

  stackPush(stack, y, x, x, 1, bb); // needed in some cases
  stackPush(stack, y+1, x, x, -1, bb); // seed segment (popped 1st)

  //2. processing
  while (stack.length > 0) {

    // pop segment off stack and fill a neighboring scan line
    cur = stack.pop();
    cur.y = cur.y + cur.dy;

    x = cur.x1;
    for (; x >= win.x && pixelRead(x - win.x, cur.y); x--) {
      pixelWrite(x - win.x, cur.y);
      bb.xmin = Math.min(x-win.x, bb.xmin);
      bb.xmax = Math.max(x-win.x, bb.xmax);
      bb.ymin = Math.min(cur.y, bb.ymin);
      bb.ymax = Math.max(cur.y, bb.ymax);
    }

    if (x < cur.x1) {
      l = x + 1;
      if (l < cur.x1) {
        stackPush(stack, cur.y, l, cur.x1 - 1, -cur.dy, bb); // leak on left?
      }
      x = cur.x1 + 1;
    } else {
      for (x++; x <= cur.x2 && !pixelRead(x - win.x, cur.y); x++) {
      }
      l = x;
      if (x > cur.x2) {
        continue;
      }
    }

    do {
      for (; x <= (win.x + win.w - 1) && pixelRead(x - win.x, cur.y); x++) {
        pixelWrite(x - win.x, cur.y);
        bb.xmin = Math.min(x-win.x, bb.xmin);
        bb.xmax = Math.max(x-win.x, bb.xmax);
        bb.ymin = Math.min(cur.y, bb.ymin);
        bb.ymax = Math.max(cur.y, bb.ymax);
      }


      stackPush(stack, cur.y, l, x - 1, cur.dy, bb);
      if (x > cur.x2 + 1) {
        stackPush(stack, cur.y, cur.x2 + 1, x - 1, -cur.dy, bb);   // leak on right?
      }
      //skip:
      for (x++; x <= cur.x2 && !pixelRead(x - win.x, cur.y); x++) {
      }
      l = x;
    } while (x <= cur.x2);

  }

  return new Rect(bb.xmin, bb.ymin, bb.xmax - bb.xmin + 1, bb.ymax - bb.ymin + 1).intersect(win);
}

function nonContiguousFill(win:Rect, pixelRead:(x:number, y:number)=>boolean, pixelWrite:(x:number, y:number)=>void) {
  for(let y = win.y; y < win.y+win.h; y++) {
    for(let x = win.x; x < win.x+win.w; x++) {
      if(pixelRead(x,y)) pixelWrite(x,y);
    }
  }
  //TODO: compute actual bounds.
  return win;
}

/**
 * Simple 4x4 solid wand-fill using Gfx.floodFill
 * @param input
 * @param output
 * @param w
 * @param h
 * @param options
 * @return
 */
export function floodFill1(input:U8Array, output:U8Array, w : number, h : number, options : {
  x:number,
  y:number,
  bboxIn?:Rect,
  seedColor:number[],
  tolerance?:number,
  contiguous?:boolean
}) {

  const xx = options.x;
  const yy = options.y;
  const tol = options.tolerance ?? 0;
  const seedColor = options.seedColor;
  const bboxIn = options.bboxIn ?? new Rect(0, 0, w, h);

  const pixelRead1 = (x : number, y : number) => {
    const idx = w * y + x;
    const r = input[idx];
    let isInside : boolean;
    if(seedColor[0] === 0) {
      isInside = (r === 0);
    } else {
      isInside = ((Math.floor(Math.abs(r - seedColor[0])) <= tol));
    }

    let m = output[idx];
    let isMasked = (m === 255);
    return ( isInside && !isMasked );
  };

  const pixelWrite = (x:number, y:number) => {
    let idx = (w * y + x);
    output[idx] = 255;
  };

  output.fill(0);
  if(options.contiguous === false) {
    return nonContiguousFill(bboxIn, pixelRead1, pixelWrite);
  } else {
    return floodfill(xx, yy, bboxIn, pixelRead1, pixelWrite);
  }
}

export function floodFill4(input:U8Array, output:U8Array, w : number, h : number, options : {
  x:number,
  y:number,
  bboxIn?:Rect,
  seedColor:number[],
  tolerance?:number,
  contiguous?:boolean
}) {

  const xx = options.x;
  const yy = options.y;
  const tol = options.tolerance ?? 0;
  const seedColor = options.seedColor;
  const bboxIn = options.bboxIn ?? new Rect(0, 0, w, h);

  /**
   * Returns true if pixel should be filled
   * @param x
   * @param y
   * @return
   */
  const pixelRead4 = (x:number, y:number) => {
    let idx = w * y + x;
    let idx4 = (w * y + x) << 2;

    //strict match (pixel-value = seed-color at this position)
    const r = input[idx4];
    const g = input[idx4 + 1];
    const b = input[idx4 + 2];
    const a = input[idx4 + 3];
    let isInside : boolean;
    if(seedColor[0] === 0 && seedColor[1] === 0 && seedColor[2] === 0 && seedColor[3] === 0) {
      isInside = (r === 0 && g === 0 && b === 0 && a === 0);
    } else {
      isInside = (((Math.abs(r - seedColor[0]) + Math.abs(g - seedColor[1]) + Math.abs(b - seedColor[2])) / 3) <= tol) && (a !== 0);
    }

    let m = output[idx];
    let isMasked = (m === 255);
    return ( isInside && !isMasked );
  };

  const pixelWrite = (x:number, y:number) => {
    let idx = w * y + x;
    output[idx] = 255;
  };

  output.fill(0);
  if(options.contiguous === false) {
    return nonContiguousFill(bboxIn, pixelRead4, pixelWrite);
  } else {
    return floodfill(xx, yy, bboxIn, pixelRead4, pixelWrite);
  }
}

function fillRect1(output:U8Array, w : number, h : number, rect : Rect, value:number) {
  for(let y = rect.y; y < rect.y+rect.h; y++) {
    for(let x = rect.x; x < rect.x+rect.w; x++) {
      output[y*w+x] = value;
    }
  }
}