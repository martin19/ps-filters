// import Arrays = twgl.Arrays;
// import {twgl} from "../../../utils/twgl/twgl.js";
// import {ITexture, IWebGLContext} from "../../../GL/GLTools.js";
// import {GLModule, GLModuleOptions} from "../../../GL/GLModule.js";
// import {ShaderRegistry} from "../../../Shaders/ShaderRegistry.js";
// import {GL} from "../../../GL/GL.js";
// import {DiffuseOptions} from "./GLDiffuse";
//
// let vertex:string;
// let fragment:string;
//
// var gl : IWebGLContext;
//
// export interface LicOptions {
//   amplitude : number,
//   dl : number,
//   da : number,
//   gaussPrec : number,
// }
//
// export interface GLLicOptions extends GLModuleOptions {}
//
// export class GLLic extends GLModule {
//
//   constructor(options:GLLicOptions) {
//     super(options);
//     gl = options.gl;
//   }
//
//   async loadPrograms() {
//     vertex = ShaderRegistry.getShader("Filters/shaders/vertex-filter.glsl");
//     fragment = ShaderRegistry.getShader("Filters/stylize/diffuse/shaders/fragment-lic.glsl");
//     this.programInfo["lic"] = await twgl.createProgramInfo(gl, {vertex: vertex, fragment: fragment}, true);
//   }
//
//   activate(options?:any):void {
//     if(this.isActive()) return;
//     var programInfo = this.programInfo["lic"];
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
//   run(texDst:ITexture, texSrc:ITexture, texStructureTensor:ITexture, options?:LicOptions) {
//     this.activate();
//     gl.tools.setTarget(texDst);
//     gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, texSrc);
//
//     var uniforms = {
//       "u_texSrc": texSrc,
//       "u_texStuctureTensor": texStructureTensor,
//       "u_rDst":[0,0,texDst.width,texDst.height],
//       "u_rSrc":[0,0,texDst.width,texDst.height],
//
//       "u_amplitude": options.amplitude,
//       "u_da": options.da,
//       "u_dl": options.dl,
//       "u_gaussPrec": options.gaussPrec
//     };
//     twgl.setUniforms(this.programInfo["lic"], uniforms);
//     gl.drawArrays(gl.TRIANGLES, 0, 6);
//   }
// }