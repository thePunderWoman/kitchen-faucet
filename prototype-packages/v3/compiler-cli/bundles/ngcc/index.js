
      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  mainNgcc
} from "../chunk-47B4U2OV.js";
import "../chunk-7EPRE6SL.js";
import {
  clearTsConfigCache
} from "../chunk-HXCAIVB5.js";
import "../chunk-2GUZADLT.js";
import "../chunk-FMYW7P67.js";
import "../chunk-PQFM3USW.js";
import {
  ConsoleLogger,
  LogLevel
} from "../chunk-JNEP5RGL.js";
import "../chunk-352FNUDH.js";
import "../chunk-LIWNNBSG.js";
import "../chunk-FMXYCPT5.js";
import {
  NodeJSFileSystem,
  setFileSystem
} from "../chunk-ATVJELWP.js";
import "../chunk-WKMTX5YY.js";
import "../chunk-NDREJTCS.js";

// bazel-out/darwin_arm64-fastbuild/bin/packages/compiler-cli/ngcc/index.mjs
import { dirname, join } from "path";
import { fileURLToPath } from "url";
function process(options) {
  setFileSystem(new NodeJSFileSystem());
  return mainNgcc(options);
}
var containingDirPath = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(__ESM_IMPORT_META_URL__));
var ngccMainFilePath = join(containingDirPath, "./main-ngcc.js");
export {
  ConsoleLogger,
  LogLevel,
  clearTsConfigCache,
  containingDirPath,
  ngccMainFilePath,
  process
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=index.js.map
