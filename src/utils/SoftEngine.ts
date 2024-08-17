
// module SoftEngine {
    import {mat4type, vec3type} from "../../../Utils/gl-matrix/types";
import {mat4, vec3} from "../../../Utils/gl-matrix/gl-matrix";

export interface Face {
        A: number;
        B: number;
        C: number;
    }

    export type Color4 = number[];

    export class Camera {
        Position: vec3type;
        Target: vec3type;

        constructor() {
            this.Position = vec3.create();
            this.Target = vec3.create();
        }

        static LookAtLH(eye: vec3type, target : vec3type, up : vec3type):mat4type {
            let zAxis = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), target, eye));
            let xAxis = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), up, zAxis));
            let yAxis = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), zAxis, xAxis));
            let ex = -vec3.dot(xAxis, eye);
            let ey = -vec3.dot(yAxis, eye);
            let ez = -vec3.dot(zAxis, eye);
            return mat4.fromValues(
              xAxis[0], yAxis[0], zAxis[0], 0,
              xAxis[1], yAxis[1], zAxis[1], 0,
              xAxis[2], yAxis[2], zAxis[2],
              0, ex, ey, ez, 1);
        }

        static PerspectiveFovLH(fov: number, aspect: number, znear: number, zfar: number):mat4type {
            let matrix = mat4.create();
            let tan = 1.0 / (Math.tan(fov * 0.5));
            matrix[0] = tan / aspect;
            matrix[1] = matrix[2] = matrix[3] = 0.0;
            matrix[5] = tan;
            matrix[4] = matrix[6] = matrix[7] = 0.0;
            matrix[8] = matrix[9] = 0.0;
            matrix[10] = -zfar / (znear - zfar);
            matrix[11] = 1.0;
            matrix[12] = matrix[13] = matrix[15] = 0.0;
            matrix[14] = (znear * zfar) / (znear - zfar);
            return matrix;
        }
    }

    export interface Vertex {
        Normal: vec3type;
        Coordinates: vec3type;
        WorldCoordinates: vec3type;
    }

    export class Mesh {
        Position: vec3type;
        Rotation: vec3type;
        Vertices: Vertex[];
        Faces: Face[];

        constructor(verticesCount: number, facesCount: number) {
            this.Vertices = new Array(verticesCount);
            this.Faces = new Array(facesCount);
            this.Rotation = vec3.create();
            this.Position = vec3.create();
        }
    }

    export interface ScanLineData {
        currentY: number;
        ndotla: number;
        ndotlb: number;
        ndotlc: number;
        ndotld: number;
    }


    export class Device {
        static ssaaPat = [[1/8, 3/8],[3/8,-1/8],[-1/8,-3/8],[-3/8,1/8]];
        static ssaaSamples = 4;

        // the back buffer size is equal to the number of pixels to draw
        // on screen (width*height) * 4 (R,G,B & Alpha values). 
        private backbuffer: Uint8ClampedArray;
        private backbufferSsaa : Uint8Array;
        private workingWidth: number;
        private workingHeight: number;
        // equals to backbuffer.data
        private backbufferdata: number[] = [];
        private depthbuffer: number[];

        constructor(backbuffer:Uint8ClampedArray, w:number, h:number) {
            this.backbuffer = backbuffer;
            this.workingWidth = w;
            this.workingHeight = h;
            this.depthbuffer = new Array(this.workingWidth * this.workingHeight * Device.ssaaSamples);
            this.backbufferSsaa = new Uint8Array(this.workingWidth * this.workingHeight * Device.ssaaSamples * 4);
        }

        // This function is called to clear the back buffer with a specific color
        public clear(): void {
            //clear backbuffer
            this.backbuffer.fill(0);

            // clear out back buffer
            this.backbufferSsaa.fill(0);

            // Clearing depth buffer
            for (var i = 0; i < this.depthbuffer.length; i++) {
                // Max possible value 
                this.depthbuffer[i] = 10000000;
            }
        }

        // Called to put a pixel on screen at a specific X,Y coordinates
        public putPixel(x: number, y: number, z: number, color: Color4, ssaaIndex:number): void {
            // As we have a 1-D Array for our back buffer
            // we need to know the equivalent cell index in 1-D based
            // on the 2D coordinates of the screen
            var index: number = ((x >> 0) + (y >> 0) * this.workingWidth);
            var index4: number = index*Device.ssaaSamples*4 + ssaaIndex * 4;

            if (this.depthbuffer[index*Device.ssaaSamples + ssaaIndex] < z) {
                return; // Discard
            }

            this.depthbuffer[index*Device.ssaaSamples + ssaaIndex] = z;

            // RGBA color space is used by the HTML5 canvas 
            this.backbufferSsaa[index4] = color[0] * 255;
            this.backbufferSsaa[index4 + 1] = color[1] * 255;
            this.backbufferSsaa[index4 + 2] = color[2] * 255;
            this.backbufferSsaa[index4 + 3] = color[3] * 255;
        }

        // drawPoint calls putPixel but does the clipping operation before
        public drawPoint(point: vec3type, color: Color4, ssaaIndex : number): void {
            // Clipping what's visible on screen
            if (point[0] >= 0 && point[1] >= 0 && point[0] < this.workingWidth && point[1] < this.workingHeight) {
                // Drawing a point
                this.putPixel(point[0], point[1], point[2], color, ssaaIndex);
            }
        }

        // Once everything is ready, we can flush the back buffer
        // into the front buffer. 
        // public present(): void {
        //     this.workingContext.putImageData(this.backbuffer, 0, 0);
        // }

        // Clamping values to keep them between 0 and 1
        public clamp(value: number, min: number = 0, max: number = 1): number {
            return Math.max(min, Math.min(value, max));
        }

        // Interpolating the value between 2 vertices 
        // min is the starting point, max the ending point
        // and gradient the % between the 2 points
        public interpolate(min: number, max: number, gradient: number) {
            return min + (max - min) * this.clamp(gradient);
        }

        // Project takes some 3D coordinates and transform them
        // in 2D coordinates using the transformation matrix
        // It also transform the same coordinates and the normal to the vertex 
        // in the 3D world
        public project(vertex: Vertex, transMat: mat4type, world: mat4type): Vertex {
            // transforming the coordinates into 2D space
            let point2d = vec3.transformMat4(vec3.create(), vertex.Coordinates, transMat);

            // transforming the coordinates & the normal to the vertex in the 3D world
            let point3DWorld = vec3.transformMat4(vec3.create(), vertex.Coordinates, world);


            let normal3DWorld = vec3.transformMat4(vec3.create(), vertex.Normal, world);
            // The transformed coordinates will be based on coordinate system
            // starting on the center of the screen. But drawing on screen normally starts
            // from top left. We then need to transform them again to have x:0, y:0 on top left.
            let x = point2d[0] * this.workingWidth + this.workingWidth / 2.0;
            let y = -point2d[1] * this.workingHeight + this.workingHeight / 2.0;

            return ({
                Coordinates: vec3.fromValues(x, y, point2d[2]),
                Normal: normal3DWorld,
                WorldCoordinates: point3DWorld
            });
        }

        // drawing line between 2 points from left to right
        // papb -> pcpd
        // pa, pb, pc, pd must then be sorted before
        public processScanLine(data: ScanLineData, va: Vertex, vb: Vertex, vc: Vertex, vd: Vertex, color: Color4, ssaaIndex:number): void {
            var pa = va.Coordinates;
            var pb = vb.Coordinates;
            var pc = vc.Coordinates;
            var pd = vd.Coordinates;

            // Thanks to current Y, we can compute the gradient to compute others values like
            // the starting X (sx) and ending X (ex) to draw between
            // if pa.Y == pb.Y or pc.Y == pd.Y, gradient is forced to 1
            var gradient1 = pa[1] != pb[1] ? (data.currentY - pa[1]) / (pb[1] - pa[1]) : 1;
            var gradient2 = pc[1] != pd[1] ? (data.currentY - pc[1]) / (pd[1] - pc[1]) : 1;

            var sx = this.interpolate(pa[0], pb[0], gradient1) >> 0;
            var ex = this.interpolate(pc[0], pd[0], gradient2) >> 0;

            // starting Z & ending Z
            var z1: number = this.interpolate(pa[2], pb[2], gradient1);
            var z2: number = this.interpolate(pc[2], pd[2], gradient2);

            // drawing a line from left (sx) to right (ex) 
            for (var x = sx; x < ex; x++) {
                var gradient: number = (x - sx) / (ex - sx);

                var z = this.interpolate(z1, z2, gradient);
                var ndotl = data.ndotla;
                // changing the color value using the cosine of the angle
                // between the light vector and the normal vector
                this.drawPoint(vec3.fromValues(x, data.currentY, z),
                  [color[0] * ndotl, color[1] * ndotl, color[2] * ndotl, 1],
                  ssaaIndex
                );
            }
        }

        // Compute the cosine of the angle between the light vector and the normal vector
        // Returns a value between 0 and 1
        public computeNDotL(vertex: vec3type, normal: vec3type, lightPosition: vec3type): number {
            let lightDirection = vec3.subtract(vec3.create(), lightPosition, vertex);
            normal = vec3.normalize(vec3.create(), normal);
            lightDirection = vec3.normalize(vec3.create(), lightDirection);

            return Math.max(0, vec3.dot(normal, lightDirection));
        }

        public drawTriangle(v1: Vertex, v2: Vertex, v3: Vertex, color: Color4, ssaaIndex:number): void {
            // Sorting the points in order to always have this order on screen p1, p2 & p3
            // with p1 always up (thus having the Y the lowest possible to be near the top screen)
            // then p2 between p1 & p3
            if (v1.Coordinates[1] > v2.Coordinates[1]) {
                let temp = v2;
                v2 = v1;
                v1 = temp;
            }

            if (v2.Coordinates[1] > v3.Coordinates[1]) {
                let temp = v2;
                v2 = v3;
                v3 = temp;
            }

            if (v1.Coordinates[1] > v2.Coordinates[1]) {
                let temp = v2;
                v2 = v1;
                v1 = temp;
            }

            let p1 = v1.Coordinates;
            let p2 = v2.Coordinates;
            let p3 = v3.Coordinates;

            // normal face's vector is the average normal between each vertex's normal
            // computing also the center point of the face
            let vnFace = vec3.scale(vec3.create(), vec3.add(vec3.create(), vec3.add(vec3.create(), v1.Normal, v2.Normal), v3.Normal), 1/3);
            let centerPoint =vec3.scale(vec3.create(), vec3.add(vec3.create(), vec3.add(vec3.create(), v1.WorldCoordinates, v2.WorldCoordinates), v3.WorldCoordinates), 1/3);


            // Light position
            var lightPos = vec3.fromValues(0, 10, 10);
            // computing the cos of the angle between the light vector and the normal vector
            // it will return a value between 0 and 1 that will be used as the intensity of the color
            var ndotl = this.computeNDotL(centerPoint, vnFace, lightPos);

            var data: ScanLineData = { ndotla: ndotl, currentY : 0, ndotlb : 0, ndotlc : 0, ndotld : 0 };

            // computing lines' directions
            var dP1P2: number; var dP1P3: number;

            // http://en.wikipedia.org/wiki/Slope
            // Computing slopes
            if (p2[1] - p1[1] > 0)
                dP1P2 = (p2[0] - p1[0]) / (p2[1] - p1[1]);
            else
                dP1P2 = 0;

            if (p3[1] - p1[1] > 0)
                dP1P3 = (p3[0] - p1[0]) / (p3[1] - p1[1]);
            else
                dP1P3 = 0;

            // First case where triangles are like that:
            // P1
            // -
            // -- 
            // - -
            // -  -
            // -   - P2
            // -  -
            // - -
            // -
            // P3
            if (dP1P2 > dP1P3) {
                for (let y = p1[1] >> 0; y <= p3[1] >> 0; y++) {
                    data.currentY = y;

                    if (y < p2[1]) {
                        this.processScanLine(data, v1, v3, v1, v2, color, ssaaIndex);
                    }
                    else {
                        this.processScanLine(data, v1, v3, v2, v3, color, ssaaIndex);
                    }
                }
            }
            // First case where triangles are like that:
            //       P1
            //        -
            //       -- 
            //      - -
            //     -  -
            // P2 -   - 
            //     -  -
            //      - -
            //        -
            //       P3
            else {
                for (let y = p1[1] >> 0; y <= p3[1] >> 0; y++) {
                    data.currentY = y;

                    if (y < p2[1]) {
                        this.processScanLine(data, v1, v2, v1, v3, color, ssaaIndex);
                    }
                    else {
                        this.processScanLine(data, v2, v3, v1, v3, color, ssaaIndex);
                    }
                }
            }
        }

        // The main method of the engine that re-compute each vertex projection
        // during each frame
        public render(camera: Camera, meshes: Mesh[], ssaaIndex : number): void {
            // To understand this part, please read the prerequisites resources
            let viewMatrix = Camera.LookAtLH(camera.Position, camera.Target, vec3.fromValues(0.0,1.0,0.0));
            let projectionMatrix = Camera.PerspectiveFovLH(0.78, this.workingWidth / this.workingHeight, 0.01, 1.0);

            for (let index = 0; index < meshes.length; index++) {
                // current mesh to work on
                let cMesh = meshes[index];

                // Beware to apply rotation before translation
                let rotZ = mat4.rotateZ(mat4.create(), mat4.create(), cMesh.Rotation[2]);
                let rotY = mat4.rotateY(mat4.create(), mat4.create(), cMesh.Rotation[1]);
                let rotX = mat4.rotateX(mat4.create(), mat4.create(), cMesh.Rotation[0]);
                let R = mat4.multiply(mat4.create(), mat4.multiply(mat4.create(), rotZ, rotY), rotX);
                let T = mat4.fromTranslation(mat4.create(), vec3.fromValues(cMesh.Position[0], cMesh.Position[1], cMesh.Position[2]));
                let worldMatrix = mat4.multiply(mat4.create(), R, T);

                // let transformMatrix = mat4.multiply(mat4.create(), mat4.multiply(mat4.create(), worldMatrix, viewMatrix), projectionMatrix);
                let transformMatrix = mat4.multiply(mat4.create(), projectionMatrix, mat4.multiply(mat4.create(), viewMatrix, worldMatrix));

                // console.log(viewMatrix);
                // console.log(projectionMatrix);
                // console.log(transformMatrix);
                // return;

                for (var indexFaces = 0; indexFaces < cMesh.Faces.length; indexFaces++) {
                    let currentFace = cMesh.Faces[indexFaces];
                    let vertexA = cMesh.Vertices[currentFace.A];
                    let vertexB = cMesh.Vertices[currentFace.B];
                    let vertexC = cMesh.Vertices[currentFace.C];

                    let pixelA = this.project(vertexA, transformMatrix, worldMatrix);
                    let pixelB = this.project(vertexB, transformMatrix, worldMatrix);
                    let pixelC = this.project(vertexC, transformMatrix, worldMatrix);

                    pixelA.Coordinates[0] += Device.ssaaPat[ssaaIndex][0];
                    pixelA.Coordinates[1] += Device.ssaaPat[ssaaIndex][1];
                    pixelB.Coordinates[0] += Device.ssaaPat[ssaaIndex][0];
                    pixelB.Coordinates[1] += Device.ssaaPat[ssaaIndex][1];
                    pixelC.Coordinates[0] += Device.ssaaPat[ssaaIndex][0];
                    pixelC.Coordinates[1] += Device.ssaaPat[ssaaIndex][1];


                    //var color: number = 0.25 + ((indexFaces % cMesh.Faces.length) / cMesh.Faces.length) * 0.75;
                    var color = 1.0;
                    this.drawTriangle(pixelA, pixelB, pixelC, [color, color, color, 1], ssaaIndex);
                }
            }
        }

        // Loading the JSON file in an asynchronous manner and
        // calling back with the function passed providing the array of meshes loaded
        public LoadJSONFileAsync(fileName: string):Promise<Mesh[]> {
            return new Promise(resolve => {
                let jsonObject = {};
                let xmlhttp = new XMLHttpRequest();
                xmlhttp.open("GET", fileName, true);
                let that = this;
                xmlhttp.onreadystatechange = function () {
                    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                        jsonObject = JSON.parse(xmlhttp.responseText);
                        resolve(that.CreateMeshesFromJSON(jsonObject));
                    }
                };
                xmlhttp.send(null);
            });
        }

        private CreateMeshesFromJSON(jsonObject:any): Mesh[] {
            let meshes: Mesh[] = [];
            for (let meshIndex = 0; meshIndex < jsonObject.meshes.length; meshIndex++) {
                let verticesArray: number[] = jsonObject.meshes[meshIndex].vertices;
                // Faces
                let indicesArray: number[] = jsonObject.meshes[meshIndex].indices;

                let uvCount: number = jsonObject.meshes[meshIndex].uvCount;
                let verticesStep = 1;

                // Depending of the number of texture's coordinates per vertex
                // we're jumping in the vertices array  by 6, 8 & 10 windows frame
                switch (uvCount) {
                    case 0:
                        verticesStep = 6;
                        break;
                    case 1:
                        verticesStep = 8;
                        break;
                    case 2:
                        verticesStep = 10;
                        break;
                }

                // the number of interesting vertices information for us
                const verticesCount = verticesArray.length / verticesStep;
                // number of faces is logically the size of the array divided by 3 (A, B, C)
                const facesCount = indicesArray.length / 3;
                const mesh = new Mesh(verticesCount, facesCount);

                // Filling the Vertices array of our mesh first
                for (let index = 0; index < verticesCount; index++) {
                    const x = verticesArray[index * verticesStep];
                    const y = verticesArray[index * verticesStep + 1];
                    const z = verticesArray[index * verticesStep + 2];
                    // Loading the vertex normal exported by Blender
                    const nx = verticesArray[index * verticesStep + 3];
                    const ny = verticesArray[index * verticesStep + 4];
                    const nz = verticesArray[index * verticesStep + 5];
                    mesh.Vertices[index] = {
                        Coordinates: vec3.fromValues(x, y, z),
                        Normal: vec3.fromValues(nx, ny, nz),
                        WorldCoordinates: new Float32Array()
                    };
                }
                
                // Then filling the Faces array
                for (let index = 0; index < facesCount; index++) {
                    const a = indicesArray[index * 3];
                    const b = indicesArray[index * 3 + 1];
                    const c = indicesArray[index * 3 + 2];
                    mesh.Faces[index] = {
                        A: a,
                        B: b,
                        C: c
                    };
                }
                
                // Getting the position you've set in Blender
                const position = jsonObject.meshes[meshIndex].position;
                mesh.Position = vec3.fromValues(position[0], position[1], position[2]);
                meshes.push(mesh);
            }
            return meshes; 
        }

        public ssaaResolve() {
            const backbuffer = this.backbuffer;
            const msaaData = this.backbufferSsaa;

            for(let i = 0; i < this.workingWidth*this.workingHeight; i++) {
                let sumR = 0;
                let sumG = 0;
                let sumB = 0;
                let sumA = 0;
                for(let k = 0; k < Device.ssaaSamples; k++) {
                    sumR += msaaData[i*(Device.ssaaSamples*4) + (k*4)];
                    sumG += msaaData[i*(Device.ssaaSamples*4) + (k*4) + 1];
                    sumB += msaaData[i*(Device.ssaaSamples*4) + (k*4) + 2];
                    sumA += msaaData[i*(Device.ssaaSamples*4) + (k*4) + 3];
                }
                backbuffer[i*4] = sumR/4;
                backbuffer[i*4 + 1] = sumG/4;
                backbuffer[i*4 + 2] = sumB/4;
                backbuffer[i*4 + 3] = sumA/4;
            }
        }
    }
// }