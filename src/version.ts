import pkg from "../package.json";

/** Texto do canto do menu principal (ex.: `v 1.0.0`). Vem do `package.json` no momento do build. */
export const APP_VERSION_LABEL = `v ${pkg.version}`;
