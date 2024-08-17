// import Arrays = twgl.Arrays;
// import {twgl} from "../../../utils/twgl/twgl.js";
// import {ITexture, IWebGLContext} from "../../../GL/GLTools.js";
// import {GLModule, GLModuleOptions} from "../../../GL/GLModule.js";
// import {ShaderRegistry} from "../../../Shaders/ShaderRegistry.js";
// import {GL} from "../../../GL/GL.js";
//
// let vertex:string;
// let fragment:string;
//
// var gl : IWebGLContext;
//
// export interface SobelOptions {}
//
// export interface GLSobelOptions extends GLModuleOptions {}
//
// export class GLSobel extends GLModule {
//
//   constructor(options:GLSobelOptions) {
//     super(options);
//     gl = options.gl;
//   }
//
//   async loadPrograms() {
//     vertex = ShaderRegistry.getShader("Filters/shaders/vertex-filter.glsl");
//     fragment = ShaderRegistry.getShader("Filters/stylize/diffuse/shaders/fragment-sobel.glsl");
//     this.programInfo["sobel"] = await twgl.createProgramInfo(gl, {vertex: vertex, fragment: fragment}, true);
//   }
//
//   activate(options?:any):void {
//     if(this.isActive()) return;
//     var programInfo = this.programInfo["sobel"];
//     var program = programInfo.program;
//     gl.useProgram(program);
//     var arrays:Arrays = {
//       "a_position": {numComponents: 2, data: GL.fullScreenQuad},
//       "a_texcoord": {numComponents: 2, data: GL.fullScreenQuad}
//     };
//     var bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
//     twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
//     gl.tools.activeModule = this;
//   }
//
//   deactivate():void {
//   }
//
//   run(texDst:ITexture, texSrc:ITexture, options?:SobelOptions) {
//     this.activate();
//     gl.tools.setTarget(texDst);
//     gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, texSrc);
//
//     var uniforms = {
//       "u_texSrc": texSrc,
//       "u_rDst":[0,0,texDst.width,texDst.height],
//       "u_rSrc":[0,0,texDst.width,texDst.height]
//     };
//     twgl.setUniforms(this.programInfo["sobel"], uniforms);
//     gl.drawArrays(gl.TRIANGLES, 0, 6);
//   }
// }