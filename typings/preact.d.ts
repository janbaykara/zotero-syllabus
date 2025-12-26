/* eslint-disable @typescript-eslint/no-empty-object-type */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="preact" />

// This file configures TypeScript to use Preact's JSX types instead of React's
// The JSX transform will use 'h' and 'Fragment' as specified in tsconfig.json

declare global {
  namespace JSX {
    interface IntrinsicElements extends preact.JSX.IntrinsicElements {}
    interface Element extends preact.JSX.Element {}
    interface ElementClass extends preact.JSX.ElementClass {}
    interface ElementAttributesProperty
      extends preact.JSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute
      extends preact.JSX.ElementChildrenAttribute {}
  }
}

// Import h and Fragment so they're available for the JSX transform
// These will be used by the build system (esbuild) when transforming JSX
import { h, Fragment } from "preact";
export { h, Fragment };
