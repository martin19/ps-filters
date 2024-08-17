
export class gaussJ {

  /**
   * Solves linear system Ax = 0
   * @param A - linear system
   * @param x - solution of system
   */
  static solve(A:Array<Array<number>>, x:Array<number>) {
    var m = A.length;
    for (var k = 0; k < m; k++)	// column
    {
      // pivot for column
      var i_max = 0;
      var vali = Number.NEGATIVE_INFINITY;
      for (var i = k; i < m; i++) if (A[i][k] > vali) {
        i_max = i;
        vali = A[i][k];
      }
      gaussJ.swapRows(A, k, i_max);

      if (A[i_max][i] == 0) console.log("matrix is singular!");

      // for all rows below pivot
      for (i = k + 1; i < m; i++) {
        for (var j = k + 1; j < m + 1; j++)
          A[i][j] = A[i][j] - A[k][j] * (A[i][k] / A[k][k]);
        A[i][k] = 0;
      }
    }

    for (i = m - 1; i >= 0; i--)	// rows = columns
    {
      var v = A[i][m] / A[i][i];
      x[i] = v;
      for (j = i - 1; j >= 0; j--)	// rows
      {
        A[j][m] -= A[j][i] * v;
        A[j][i] = 0;
      }
    }
  }

  /**
   * creates a matrix filled with zeros
   * @param r
   * @param c
   * @return
   */
  static zerosMat(r:number, c:number) {
    var A:Array<Array<number>> = [];
    for (var i = 0; i < r; i++) {
      A.push([]);
      for (var j = 0; j < c; j++) A[i].push(0);
    }
    return A;
  }

  static printMat(A:Array<number>) {
    for (var i = 0; i < A.length; i++) console.log(A[i]);
  }

  /**
   *
   * @param m
   * @param k
   * @param l
   */
  static swapRows(m:Array<Array<number>>, k:number, l:number) {
    var p = m[k];
    m[k] = m[l];
    m[l] = p;
  }
}

/**
 * @link: http://www.ivank.net/blogspot/cspline/CSPL.js
 */
export class CubicSpline {

  /**
   * Get first derivates for knots
   * @param xs - knot points x
   * @param ys - knot points y
   * @param ks - knot points derivatives
   */
  static getNaturalKs(xs:Array<number>, ys:Array<number>, ks:Array<number>) {
    var n = xs.length - 1;
    var A = gaussJ.zerosMat(n + 1, n + 2);

    //rows
    for (var i = 1; i < n; i++) {
      A[i][i - 1] = 1 / (xs[i] - xs[i - 1]);
      A[i][i] = 2 * (1 / (xs[i] - xs[i - 1]) + 1 / (xs[i + 1] - xs[i]));
      A[i][i + 1] = 1 / (xs[i + 1] - xs[i]);
      A[i][n + 1] = 3 * ( (ys[i] - ys[i - 1]) / ((xs[i] - xs[i - 1]) * (xs[i] - xs[i - 1])) + (ys[i + 1] - ys[i]) / ((xs[i + 1] - xs[i]) * (xs[i + 1] - xs[i])) );
    }

    A[0][0] = 2 / (xs[1] - xs[0]);
    A[0][1] = 1 / (xs[1] - xs[0]);
    A[0][n + 1] = 3 * (ys[1] - ys[0]) / ((xs[1] - xs[0]) * (xs[1] - xs[0]));

    A[n][n - 1] = 1 / (xs[n] - xs[n - 1]);
    A[n][n] = 2 / (xs[n] - xs[n - 1]);
    A[n][n + 1] = 3 * (ys[n] - ys[n - 1]) / ((xs[n] - xs[n - 1]) * (xs[n] - xs[n - 1]));

    gaussJ.solve(A, ks);
  }

  /**
   * Evaluate spline at given x
   * @param x - the position to evaluate
   * @param xs - knot points x
   * @param ys - knot points y
   * @param ks - knot points derivatives
   * @return - the value at position x
   */
  static evalSpline(x:number, xs:Array<number>, ys:Array<number>, ks:Array<number>) {
    var i = 1;
    while (i < xs.length-1 && xs[i] < x) i++;
    var t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
    var a = ks[i - 1] * (xs[i] - xs[i - 1]) - (ys[i] - ys[i - 1]);
    var b = -ks[i] * (xs[i] - xs[i - 1]) + (ys[i] - ys[i - 1]);
    var q = (1 - t) * ys[i - 1] + t * ys[i] + t * (1 - t) * (a * (1 - t) + b * t);
    return q;
  }
}
