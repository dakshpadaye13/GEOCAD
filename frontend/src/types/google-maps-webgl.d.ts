declare namespace google.maps {
  export interface CoordinateTransformer {
    fromLatLngToVector3(
      latLng: LatLng | LatLngLiteral | { lat: number; lng: number; altitude?: number },
      output?: Float64Array
    ): Float64Array;
    getProjectionMatrix(): Float64Array;
  }

  export interface WebGLDrawOptions {
    gl: WebGLRenderingContext | WebGL2RenderingContext;
    transformer: CoordinateTransformer;
  }

  export interface WebGLStateOptions {
    gl: WebGLRenderingContext | WebGL2RenderingContext;
  }

  export class WebGLOverlayView extends MVCObject {
    constructor();
    onAdd?(): void;
    onContextRestored?(options: WebGLStateOptions): void;
    onDraw?(options: WebGLDrawOptions): void;
    onContextLost?(): void;
    onRemove?(): void;
    requestRedraw(): void;
    setMap(map: Map | null): void;
  }
}
