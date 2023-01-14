#!/usr/bin/env node

      import {createRequire as __cjsCompatRequire} from 'module';
      const require = __cjsCompatRequire(import.meta.url);
      const __ESM_IMPORT_META_URL__ = import.meta.url;
    
import {
  parseCommandLineOptions
} from "../chunk-KXQWVCNC.js";
import {
  mainNgcc
} from "../chunk-S2WQ6FG7.js";
import "../chunk-7EPRE6SL.js";
import "../chunk-7SFAEJGT.js";
import "../chunk-MYVAKRMI.js";
import "../chunk-QTJRXWZR.js";
import "../chunk-PQFM3USW.js";
import "../chunk-JNEP5RGL.js";
import "../chunk-TMOVAXDQ.js";
import "../chunk-LIWNNBSG.js";
import "../chunk-FMXYCPT5.js";
import "../chunk-ATVJELWP.js";
import "../chunk-WKMTX5YY.js";
import "../chunk-NDREJTCS.js";

// bazel-out/darwin_arm64-fastbuild/bin/packages/compiler-cli/ngcc/main-ngcc.mjs
process.title = "ngcc";
var startTime = Date.now();
var options = parseCommandLineOptions(process.argv.slice(2));
(async () => {
  try {
    await mainNgcc(options);
    if (options.logger) {
      const duration = Math.round((Date.now() - startTime) / 1e3);
      options.logger.debug(`Run ngcc in ${duration}s.`);
    }
    process.exitCode = 0;
  } catch (e) {
    console.error(e.stack || e.message);
    process.exit(typeof e.code === "number" ? e.code : 1);
  }
})();
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
//# sourceMappingURL=main-ngcc.js.map
