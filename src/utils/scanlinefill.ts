interface Vector2 { x : number; y : number; }
interface Rect { x : number; y : number; w : number; h : number; }
interface IEdgePointer {
  dx : number|null;
  xIntersect : number|null;
  yUpper : number|null;
  nextp : IEdgePointer|null;
}

/**
 * fill a scanline with information given in AET
 * @param scans
 * @param scan scan scanline number
 * @param aet aet active edge table (linkedlist)
 * @param win win window
 */
function getScans(scans:number[][], scan:number, aet:IEdgePointer, win:Rect) {
  let p2:IEdgePointer|null = null;

  let p1 = aet.nextp;
  while ((p1 !== null) && (p1.nextp !== null)) {
    p2 = p1.nextp;
    if(p1.xIntersect === null || p2.xIntersect === null) {
      throw new Error("xIntersect is null");
    }
    scans.push([Math.floor(p1.xIntersect), Math.floor(p2.xIntersect)])
    p1 = p2.nextp;
  }
}

/**
 * Fills a polygon using scanline method
 *
 * @see: fowley et al., Computer Graphics Principles and Practice
 * @param pts - array of points
 * @param win - the polygon must fit inside the window boundaries
 * @return
 */
export function scanFill(pts:Array<Vector2>, win:Rect) {
  let scans:(number[]|undefined)[] = [];
  let SET:Array<IEdgePointer> = [];

  if (pts.length < 2) return;

  //initialize SET & makeSet
  for (let i = 0; i <= win.h; i++) {
    //for(let i = 0; i <= win.h+win.y; i++) {
    SET.push({nextp: null, xIntersect : null, dx : null, yUpper : null });
  }
  makeSET(pts, SET, win);

  //init AET
  let AET:IEdgePointer = {nextp: null, xIntersect : null, dx : null, yUpper : null};

  //scan
  for (let i = 0; i <= win.h; i++) {
    buildAET(i, AET, SET);
    if (AET.nextp !== null) {
      getScans(scans as any, i, AET, win);
      updateAET(i, AET, win);
      resortAET(AET);
    } else {
      scans.push(undefined);
    }
  }

  return scans;
}

/**
 * insert edge e into list (increasing order of xIntersect)
 * @param l - linked list of edges (terminated with null)
 * @param e - the edge to insert
 */
function insertEdge(l:IEdgePointer, e:IEdgePointer) {
  //inserts an edge into an edge list
  let q = l;
  let p = l.nextp;
  while (p !== null) {
    if(e.xIntersect === null || p.xIntersect === null) {
      throw new Error("xIntersect is null");
    }
    if (e.xIntersect < p.xIntersect) {
      p = null; //found the place to insert
    } else {
      q = p;
      p = p.nextp;
    }
  }
  e.nextp = q.nextp;
  q.nextp = e;
}

/**
 * creates a new edge entry for ET*
 * @param lower
 * @param upper
 * @param yComp
 * @return
 */
function makeEdgeEntry(lower:Vector2, upper:Vector2, yComp:number) {
  let e : IEdgePointer = {
    dx : null,
    xIntersect : null,
    yUpper : null,
    nextp : null
  };
  e.dx = (upper.x - lower.x) / (upper.y - lower.y);
  e.xIntersect = lower.x;
  if (upper.y < yComp) {
    e.yUpper = upper.y - 1;
  } else {
    e.yUpper = upper.y;
  }
  return e;
}

/**
 * For an index, return y-coordinate of next non-horizontal line
 * @param k - index in vertex list
 * @param pts  - polygon vertices
 * @return
 */
function yNext(k:number, pts:Array<Vector2>) {
  let j = 0;
  if ((k + 1) > (pts.length - 1)) {
    j = 0;
  } else {
    j = k + 1;
  }

  while (pts[k].y == pts[j].y) {
    if ((j + 1) > (pts.length - 1)) {
      j = 0;
    } else {
      j++;
    }
  }

  return pts[j].y;
}

/**
 * creates an sorted edge table
 * @param pts - vertex array
 * @param set - sorted edge table
 * @param win  win
 * @return - set
 */
function makeSET(pts:Array<Vector2>, set:Array<IEdgePointer>, win:any) {
  let v1 = pts[pts.length - 1];             //last vertex
  let yPrev = pts[pts.length - 2].y;  //vertex before last vertex
  let e:IEdgePointer|null = null;

  //loop through all (connected) vertices
  for (let i = 0; i < pts.length; i++) {
    let v2 = pts[i];
    if (v1.y !== v2.y) {
      //edge is non-horizontal
      if (v1.y < v2.y) { //upgoing edge
        e = makeEdgeEntry(v1, v2, yNext(i, pts));
        insertEdge(set[v1.y - win.y], e);
      } else { //downgoing edge
        e = makeEdgeEntry(v2, v1, yPrev);
        insertEdge(set[v2.y - win.y], e);
      }
      yPrev = v1.y; //this is probably a bug in the textbook!
    }
    v1 = v2; //next point
  }
  return set;
}

/**
 * populate active edge table (AET) given current scanline index
 * and SET
 * @param i - scanline index
 * @param aet -  active edge table (linked list)
 * @param set - - sorted edge table (array of linked lists)
 */
function buildAET(i:number, aet:IEdgePointer, set:Array<IEdgePointer>) {
  let q:IEdgePointer|null = null;
  let p = set[i].nextp;
  while (p !== null) {
    q = p.nextp;
    insertEdge(aet, p);
    p = q;
  }
}


/**
 * delete element after q in linked list
 * @param q - linked list
 */
function deleteAfter(q:any) {
  let tmp = q.nextp;
  q.nextp = tmp.nextp;
}

/**
 * updateAET
 * remove completed edges
 * update xIntersect of others
 * @param i - scanline index
 * @param aet - active edge table (linked list)
 * @param win - window
 */
function updateAET(i:number, aet:IEdgePointer, win:any) {
  let q = aet;
  let p = aet.nextp;
  while (p !== null) {
    if(p.yUpper === null) {
      throw new Error("yUpper is null");
    }
    if ((i + win.y) >= p.yUpper) {
      //remove completed edge
      p = p.nextp;
      deleteAfter(q);
    } else {
      if(p.xIntersect === null) {
        throw new Error("xIntersect is null");
      }
      if(p.dx === null) {
        throw new Error("dx is null");
      }
      //update edge xIntersect
      p.xIntersect += p.dx;
      q = p;
      p = p.nextp;
    }
  }
}

/**
 * resort the aet by reinserting all entries
 * @param aet
 */
function resortAET(aet:IEdgePointer) {
  let q:IEdgePointer|null = null;
  let p = aet.nextp;

  aet.nextp = null;
  while (p !== null) {
    q = p.nextp;
    insertEdge(aet, p);
    p = q;
  }
}