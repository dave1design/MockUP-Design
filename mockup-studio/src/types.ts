import type { SceneId } from './render/scenes';

export type Category = 'phones' | 'tablets' | 'laptops' | 'desktops';

export type Point = [number, number];
/** Top-left, top-right, bottom-right, bottom-left, in mockup canvas pixels. */
export type Quad = [Point, Point, Point, Point];

export interface MockupLicense {
  type: string;
  source: string;
  author: string;
  url?: string;
  checked?: string;
}

export interface Mockup {
  id: string;
  name: string;
  category: Category;
  tags: string[];
  /** Device frame SVG with a transparent screen hole. */
  frame: string;
  /** Preview SVG: the frame with a sample screen. */
  thumbnail: string;
  canvas: { width: number; height: number };
  screen: {
    quad: Quad;
    /** Unprojected screen size, used for the aspect ratio and fitting. */
    width: number;
    height: number;
    /** Corner radius of the screen in the same units, used to clip the image. */
    radius: number;
    /** More screens on the same device scene that show the same design (e.g. a phone pair). */
    extra?: Quad[];
  };
  color: string;
  license: MockupLicense;
  /**
   * "over" (default): the frame has a transparent screen and is drawn on top.
   * "under": the image is a flat photo; the design is drawn on top of its screen area.
   */
  layer?: 'over' | 'under';
  /** True for mockups the owner added (in this browser or imported from a folder). */
  custom?: boolean;
  /** True for mockups imported from the owner's folder into public/my-mockups. */
  imported?: boolean;
  /** Transparent PNG drawn over the design (camera notch, dynamic island). */
  overlay?: string;
}

export interface Manifest {
  version: number;
  mockups: Mockup[];
}

export type FitMode = 'fill' | 'fit';

export type Background =
  | { type: 'transparent' }
  | { type: 'solid'; color: string }
  | { type: 'gradient'; from: string; to: string; angle: number }
  | { type: 'scene'; id: SceneId }
  | { type: 'image'; src: string };

/** Extra room around the device so the background reads as a scene. */
export type StageRatio = 'auto' | '1:1' | '4:3' | '16:9' | '4:5';
export interface Stage {
  ratio: StageRatio;
  /** Space around the device, as a fraction of its size (0 to 0.4). */
  padding: number;
}

export interface RenderSettings {
  stage: Stage;
  fit: FitMode;
  zoom: number;
  /** Image offset as a fraction of the screen size, from -0.5 to 0.5. */
  offsetX: number;
  offsetY: number;
  background: Background;
  shadow: boolean;
}
