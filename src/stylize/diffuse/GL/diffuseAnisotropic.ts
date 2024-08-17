// import {GL} from "../../../../../../lib_cp_ts/GL/GL";
// import {ITexture} from "../../../../../../lib_cp_ts/Effects/GLTypes";
// import {GLUtils} from "../../../../../../lib_cp_ts/GL/GLUtils";
// import {U8Array} from "../../../../Utils/Types";
// import {FilterStylizeDiffuseOptions} from "../diffuse";
//
// const gl = GL.ctx;
//
// function copyTextureToBuffer(buffer:Uint8Array, texture : ITexture) {
//   gl.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER,gl.frameBuffer1);
//   gl.framebufferTexture2D(WebGLRenderingContext.FRAMEBUFFER,
//     WebGLRenderingContext.COLOR_ATTACHMENT0,
//     WebGLRenderingContext.TEXTURE_2D, texture, 0);
//   gl.readPixels(0,0,texture.width,texture.height,WebGLRenderingContext.RGBA, WebGLRenderingContext.UNSIGNED_BYTE, buffer);
// }
//
// export function diffuseAnisotropicGL(input:U8Array, output:U8Array, w:number, h:number, options:FilterStylizeDiffuseOptions) {
//   let processBuffer = new Uint8Array(input.length);
//
//   //TODO: fix alpha
//   for(let i = 0; i < output.length; i++) {
//     output[i+3] = 255;
//   }
//
//   for(let c = 0; c < 3; c++) {
//     //copy channel c to input texture
//     for(let i = 0; i < input.length; i+=4) {
//       processBuffer[i] = input[i+c];
//     }
//
//     const tex1 = GLUtils.createBufferTexture(gl, w, h, gl.UNSIGNED_BYTE, gl.CLAMP_TO_EDGE, gl.LINEAR, gl.LINEAR, processBuffer);
//     const tex2 = GLUtils.createBufferTexture(gl, w, h, gl.FLOAT, gl.CLAMP_TO_EDGE, gl.LINEAR, gl.LINEAR);
//     const tex3 = GLUtils.createBufferTexture(gl, w, h, gl.FLOAT, gl.CLAMP_TO_EDGE, gl.LINEAR, gl.LINEAR);
//     const texOut = GLUtils.createBufferTexture(gl, w, h, gl.UNSIGNED_BYTE, gl.CLAMP_TO_EDGE, gl.LINEAR, gl.LINEAR);
//
//     // gl.tools.filterGauss.run(tex3, tex1, { channelIndex : 0, sigma : options.sigmaAngular  });
//
//     //compute sobel (magnitude, direction, dx, dy)
//     gl.tools.filterSobel.run(tex2, tex1);
//
//     //blur gradient field
//     for(let i = 0; i < options.iterations; i++) {
//       gl.tools.copyRect(tex3, tex2);
//       gl.tools.filterGauss.run(tex2, tex3, { channelIndex : 0, sigma : options.sigmaGradientField });
//     }
//
//     //compute structure tensor
//     gl.tools.filterStructureTensor.run(tex3, tex1, tex2, { sharpness : options.sharpness, anisotropy : options.anisotropy });
//
//     //compute lic
//     gl.tools.filterLic.run(texOut, tex1, tex3, {
//       amplitude : options.amplitude,
//       da : options.da,
//       dl : options.dl,
//       gaussPrec : options.gaussPrec
//     });
//
//     const readoutBuffer = new Uint8Array(w*h*4);
//     copyTextureToBuffer(readoutBuffer, texOut);
//     for(let i = 0; i < input.length;i+=4) {
//       output[i+c] = readoutBuffer[i];
//     }
//     gl.deleteTexture(tex1);
//     gl.deleteTexture(tex2);
//     gl.deleteTexture(tex3);
//   }
// }