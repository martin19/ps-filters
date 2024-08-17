import {U8Array} from "./utils/Types";
import {filterDescriptorBlurBox} from "./blur/box";
import {filterDescriptorBlur} from "./blur/blur";
import {filterDescriptorBlurMore} from "./blur/blurMore";
import {filterDescriptorBlurGauss} from "./blur/gauss";
import {filterDescriptorBlurLens} from "./blur/lens";
import {filterDescriptorBlurMotion} from "./blur/motion";
import {filterDescriptorBlurRadial} from "./blur/radial";
import {filterDescriptorBlurSmart} from "./blur/smart";
import {filterDescriptorBlurSurface} from "./blur/surface";
import {filterDescriptorDistortPinch} from "./distort/pinch";
import {filterDescriptorDistortPolar} from "./distort/polar";
import {filterDescriptorDistortRipple} from "./distort/ripple";
import {filterDescriptorDistortShear} from "./distort/shear";
import {filterDescriptorDistortSpherize} from "./distort/spherize";
import {filterDescriptorDistortTwirl} from "./distort/twirl";
import {filterDescriptorDistortWave} from "./distort/wave";
import {filterDescriptorDistortZigZag} from "./distort/zigzag";
import {filterDescriptorNoiseAdd} from "./noise/add";
import {filterDescriptorNoiseDespeckle} from "./noise/despeckle";
import {filterDescriptorNoiseDustAndScratches} from "./noise/dustAndScratches";
import {filterDescriptorNoiseMedian} from "./noise/median";
import {filterDescriptorNoiseReduceNoise} from "./noise/reduceNoise/reduceNoise";
import {filterDescriptorPixelateColorHalftone} from "./pixelate/colorHalftone";
import {filterDescriptorPixelateCrystallize} from "./pixelate/crystallize";
import {filterDescriptorPixelateFacet} from "./pixelate/facet";
import {filterDescriptorPixelateFragment} from "./pixelate/fragment";
import {filterDescriptorPixelateMezzotint} from "./pixelate/mezzotint";
import {filterDescriptorPixelateMosaic} from "./pixelate/mosaic";
import {filterDescriptorPixelatePointillize} from "./pixelate/pointillize";
import {filterDescriptorRenderClouds} from "./render/clouds";
import {filterDescriptorRenderDifferenceClouds} from "./render/differenceClouds";
import {filterDescriptorRenderFibers} from "./render/fibers";
import {filterDescriptorSharpenSharpen} from "./sharpen/sharpen";
import {filterDescriptorSharpenSharpenMore} from "./sharpen/sharpenMore";
import {filterDescriptorSharpenSharpenEdges} from "./sharpen/sharpenEdges";
import {filterDescriptorSharpenSmartSharpen} from "./sharpen/smartSharpen";
import {filterDescriptorSharpenUnsharpMask} from "./sharpen/unsharpMask";
import {filterDescriptorStylizeDiffuse} from "./stylize/diffuse/diffuse";
import {filterDescriptorStylizeEmboss} from "./stylize/emboss";
import {filterDescriptorStylizeExtrude} from "./stylize/extrude/extrude";
import {filterDescriptorStylizeFindEdges} from "./stylize/findEdges";
import {filterDescriptorStylizeSolarize} from "./stylize/solarize";
import {filterDescriptorStylizeTiles} from "./stylize/tiles";
import {filterDescriptorStylizeTraceContour} from "./stylize/traceContour";
import {filterDescriptorStylizeWind} from "./stylize/wind";
import {filterDescriptorOtherCustom} from "./other/custom";
import {filterDescriptorOtherHighPass} from "./other/highPass";
import {filterDescriptorOtherMaximum} from "./other/maximum";
import {filterDescriptorOtherMinimum} from "./other/minimum";
import {filterDescriptorOtherOffset} from "./other/offset";
import {filterDescriptorEdgeCanny} from "./edge/canny";
import {filterDescriptorBlurAverage} from "./blur/average";
import {filterDescriptorRenderLensFlare} from "./render/lenseFlare";

export interface FilterInput {
  w : number;
  h : number;
  img : ArrayBuffer;
  mask? : ArrayBuffer;
  backgroundColor? : number[];
  foregroundColor? : number[];
  filterRect? : { x : number, y : number, w : number, h : number };
}

export interface FilterOutput {
  img : ArrayBuffer;
}

export interface FilterOptions {}

export interface FilterParameter {
  name : string;
  type : "int"|"float"|"boolean"|"enum"|"float[]"|"point[]"|"color";
  values? : string[];
  min? : number;
  max? : number;
  step? : number;
  default : number|boolean|string|number[]|{ x : number, y : number }[];
}

export interface FilterPadding {
  left : number;
  top : number;
  right : number;
  bottom : number;
}

export type FilterFn = (input:FilterInput, output:FilterOutput, options?:FilterOptions) => Promise<void>;
export type FilterRequestPaddingFn = (w:number, h:number, options?:FilterOptions) => FilterPadding|null;

export interface FilterDescriptor {
  id : string;
  name? : string;
  componentId? : string;
  parameters? : {[key:string]:FilterParameter};
  filter1? : FilterFn;
  filter4? : FilterFn;
  getPadding? : FilterRequestPaddingFn;
}

export class FilterRegistry {
  static map : Map<string, FilterDescriptor> = new Map<string, FilterDescriptor>();
  static init() {
    FilterRegistry.add(filterDescriptorBlurAverage);
    FilterRegistry.add(filterDescriptorBlur);
    FilterRegistry.add(filterDescriptorBlurMore);
    FilterRegistry.add(filterDescriptorBlurBox);
    FilterRegistry.add(filterDescriptorBlurGauss);
    FilterRegistry.add(filterDescriptorBlurLens);
    FilterRegistry.add(filterDescriptorBlurMotion);
    FilterRegistry.add(filterDescriptorBlurRadial);
    // this.add(filterDescriptorBlurShape);
    FilterRegistry.add(filterDescriptorBlurSmart);
    FilterRegistry.add(filterDescriptorBlurSurface);
    // this.add(filterDescriptorDistortDisplace);
    FilterRegistry.add(filterDescriptorDistortPinch);
    FilterRegistry.add(filterDescriptorDistortPolar);
    FilterRegistry.add(filterDescriptorDistortRipple);
    FilterRegistry.add(filterDescriptorDistortShear);
    FilterRegistry.add(filterDescriptorDistortSpherize);
    FilterRegistry.add(filterDescriptorDistortTwirl);
    FilterRegistry.add(filterDescriptorDistortWave);
    FilterRegistry.add(filterDescriptorDistortZigZag);
    FilterRegistry.add(filterDescriptorNoiseAdd);
    FilterRegistry.add(filterDescriptorNoiseDespeckle);
    FilterRegistry.add(filterDescriptorNoiseDustAndScratches);
    FilterRegistry.add(filterDescriptorNoiseMedian);
    FilterRegistry.add(filterDescriptorNoiseReduceNoise);
    FilterRegistry.add(filterDescriptorPixelateColorHalftone);
    FilterRegistry.add(filterDescriptorPixelateCrystallize);
    FilterRegistry.add(filterDescriptorPixelateFacet);
    FilterRegistry.add(filterDescriptorPixelateFragment);
    FilterRegistry.add(filterDescriptorPixelateMezzotint);
    FilterRegistry.add(filterDescriptorPixelateMosaic);
    FilterRegistry.add(filterDescriptorPixelatePointillize);
    FilterRegistry.add(filterDescriptorRenderClouds);
    FilterRegistry.add(filterDescriptorRenderDifferenceClouds);
    FilterRegistry.add(filterDescriptorRenderFibers);
    FilterRegistry.add(filterDescriptorRenderLensFlare);
    // this.add(filterDescriptorRenderLightingEffects);
    FilterRegistry.add(filterDescriptorSharpenSharpen);
    FilterRegistry.add(filterDescriptorSharpenSharpenEdges);
    FilterRegistry.add(filterDescriptorSharpenSharpenMore);
    FilterRegistry.add(filterDescriptorSharpenSmartSharpen);
    FilterRegistry.add(filterDescriptorSharpenUnsharpMask);
    FilterRegistry.add(filterDescriptorStylizeDiffuse);
    FilterRegistry.add(filterDescriptorStylizeEmboss);
    FilterRegistry.add(filterDescriptorStylizeExtrude);
    FilterRegistry.add(filterDescriptorStylizeFindEdges);
    FilterRegistry.add(filterDescriptorStylizeSolarize);
    FilterRegistry.add(filterDescriptorStylizeTiles);
    FilterRegistry.add(filterDescriptorStylizeTraceContour);
    FilterRegistry.add(filterDescriptorStylizeWind);
    FilterRegistry.add(filterDescriptorOtherCustom);
    FilterRegistry.add(filterDescriptorOtherHighPass);
    FilterRegistry.add(filterDescriptorOtherMaximum);
    FilterRegistry.add(filterDescriptorOtherMinimum);
    FilterRegistry.add(filterDescriptorOtherOffset);
    //non-ps filters.
    FilterRegistry.add(filterDescriptorEdgeCanny);
  }
  static add(filter : FilterDescriptor) {
    FilterRegistry.map.set(filter.id, filter);
  }
  static get(id:string):FilterDescriptor|undefined {
    return FilterRegistry.map.get(id);
  }

  static getDefaultParams(id: string) {
    const descriptor = FilterRegistry.map.get(id);
    const defaultParams : {[key:string]:any} = {};
    if(!descriptor?.parameters) return defaultParams;
    Object.keys(descriptor.parameters).forEach(key => {
      defaultParams[key] = descriptor.parameters?.[key].default;
    });
    return defaultParams;
  }
}

FilterRegistry.init();