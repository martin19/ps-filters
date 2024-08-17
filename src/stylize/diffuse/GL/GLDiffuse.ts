// import Arrays = twgl.Arrays;
// import {twgl} from "../../../../../../lib_cp_ts/Utils/twgl/twgl";
// import {IWebGLContext} from "../../../../../../lib_cp_ts/GL/GLTools";
// import {GLModule, GLModuleOptions} from "../../../../../../lib_cp_ts/GL/GLModule";
// import {ShaderRegistry} from "../../../../../../lib_cp_ts/Shaders/ShaderRegistry";
// import {GL} from "../../../../../../lib_cp_ts/GL/GL";
// import {ITexture} from "../../../../../../lib_cp_ts/Effects/GLTypes";
//
// let vertex:string;
// let fragment:string;
//
// var gl : IWebGLContext;
//
// export interface DiffuseOptions {
//   sigmax : number;
//   sigmay : number;
// }
//
// export interface GLDiffuseOptions extends GLModuleOptions {}
//
// export class GLDiffuse extends GLModule {
//
//   constructor(options:GLDiffuseOptions) {
//     super(options);
//     gl = options.gl;
//   }
//
//   async loadPrograms() {
//     vertex = ShaderRegistry.getShader("Filters/shaders/vertex-filter.glsl");
//     fragment = ShaderRegistry.getShader("Filters/stylize/diffuse/shaders/fragment-diffuse.glsl");
//     this.programInfo["diffuse"] = await twgl.createProgramInfo(gl, {vertex: vertex, fragment: fragment}, true);
//   }
//
//   activate(options?:any):void {
//     if(this.isActive()) return;
//     var programInfo = this.programInfo["diffuse"];
//     var program = programInfo.program;
//     gl.useProgram(program);
//     var arrays:Arrays = {
//       "a_position": {numComponents: 2, data: gl.fullScreenQuad},
//       "a_texcoord": {numComponents: 2, data: gl.fullScreenQuad}
//     };
//     var bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
//     twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
//     gl.tools.activeModule = this;
//   }
//
//   deactivate():void {
//   }
//
//   run(texDst:ITexture, texSrc:ITexture, texGrd:ITexture, options?:DiffuseOptions) {
//     this.activate();
//     gl.tools.setTarget(texDst);
//     gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, texSrc);
//
//     var uniforms = {
//       "u_texSrc": texSrc,
//       "u_texGrd": texGrd,
//       "u_rDst":[0,0,texDst.width,texDst.height],
//       "u_rSrc":[0,0,texDst.width,texDst.height],
//       "u_sigmax": options?.sigmax ?? 0,
//       "u_sigmay": options?.sigmay ?? 0,
//     };
//     twgl.setUniforms(this.programInfo["diffuse"], uniforms);
//     gl.drawArrays(gl.TRIANGLES, 0, 6);
//   }
// }