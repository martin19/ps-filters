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
// export interface StructureTensorOptions {
//   sharpness : number,
//   anisotropy : number
// }
//
// export interface GLStructureTensorOptions extends GLModuleOptions {}
//
// export class GLStructureTensor extends GLModule {
//
//   constructor(options:GLStructureTensorOptions) {
//     super(options);
//     gl = options.gl;
//   }
//
//   async loadPrograms() {
//     vertex = ShaderRegistry.getShader("Filters/shaders/vertex-filter.glsl");
//     fragment = ShaderRegistry.getShader("Filters/stylize/diffuse/shaders/fragment-structuretensor.glsl");
//     this.programInfo["structuretensor"] = await twgl.createProgramInfo(gl, {vertex: vertex, fragment: fragment}, true);
//   }
//
//   activate(options?:any):void {
//     if(this.isActive()) return;
//     var programInfo = this.programInfo["structuretensor"];
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
//   run(texDst:ITexture, texSrc:ITexture, texGrd:ITexture, options?:StructureTensorOptions) {
//     this.activate();
//     gl.tools.setTarget(texDst);
//     gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, texSrc);
//
//     var uniforms = {
//       "u_texSrc": texSrc,
//       "u_texGrd": texGrd,
//       "u_rDst":[0,0,texDst.width,texDst.height],
//       "u_rSrc":[0,0,texDst.width,texDst.height],
//       "u_sharpness":options.sharpness,
//       "u_anisotropy":options.anisotropy,
//     };
//     twgl.setUniforms(this.programInfo["structuretensor"], uniforms);
//     gl.drawArrays(gl.TRIANGLES, 0, 6);
//   }
// }