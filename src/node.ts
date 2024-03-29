import {createHash} from "node:crypto";
import {existsSync} from "node:fs";
import {copyFile, readFile, writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import op from "node:path";
import {basename, extname, join} from "node:path/posix";
import {pathToFileURL} from "node:url";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import {packageDirectory} from "pkg-dir";
import type {AstNode, OutputChunk, Plugin, ResolveIdResult} from "rollup";
import {rollup} from "rollup";
import esbuild from "rollup-plugin-esbuild";
import {prepareOutput, toOsPath} from "./files.js";
import type {ImportReference} from "./javascript/imports.js";
import {isJavaScript, parseImports} from "./javascript/imports.js";
import {parseNpmSpecifier} from "./npm.js";
import {isPathImport} from "./path.js";
import {faint} from "./tty.js";

export async function resolveNodeImport(root: string, spec: string): Promise<string> {
  return resolveNodeImportInternal(op.join(root, ".observablehq", "cache", "_node"), root, spec);
}

const bundlePromises = new Map<string, Promise<void>>();

async function resolveNodeImportInternal(cacheRoot: string, packageRoot: string, spec: string): Promise<string> {
  const {name, path = "."} = parseNpmSpecifier(spec);
  const require = createRequire(pathToFileURL(op.join(packageRoot, "/")));
  const pathResolution = require.resolve(spec);
  const packageResolution = await packageDirectory({cwd: op.dirname(pathResolution)});
  if (!packageResolution) throw new Error(`unable to resolve package.json: ${spec}`);
  const {version} = JSON.parse(await readFile(op.join(packageResolution, "package.json"), "utf-8"));
  const hash = createHash("sha256").update(spec).update(version).digest("hex").slice(0, 8);
  const ext = extname(path);
  const resolution = `${name}@${version}/${hash}/${basename(path === "." ? name : path, ext)}${ext || ".js"}`;
  const outputPath = op.join(cacheRoot, toOsPath(resolution));
  if (!existsSync(outputPath)) {
    let promise = bundlePromises.get(outputPath);
    if (!promise) {
      promise = (async () => {
        process.stdout.write(`${spec} ${faint("→")} ${resolution}\n`);
        await prepareOutput(outputPath);
        if (isJavaScript(pathResolution)) {
          await writeFile(outputPath, await bundle(spec, cacheRoot, packageResolution));
        } else {
          await copyFile(pathResolution, outputPath);
        }
      })();
      bundlePromises.set(outputPath, promise);
      promise.catch(() => {}).then(() => bundlePromises.delete(outputPath));
    }
    await promise;
  }
  return `/_node/${resolution}`;
}

/**
 * Resolves the direct dependencies of the specified node import path, such as
 * "/_node/d3-array@3.2.4/src/index.js", returning a set of node import paths.
 */
export async function resolveNodeImports(root: string, path: string): Promise<ImportReference[]> {
  if (!path.startsWith("/_node/")) throw new Error(`invalid node path: ${path}`);
  return parseImports(join(root, ".observablehq", "cache"), path);
}

async function bundle(input: string, cacheRoot: string, packageRoot: string): Promise<string> {
  const bundle = await rollup({
    input,
    plugins: [
      nodeResolve({browser: true, rootDir: packageRoot}),
      importResolve(input, cacheRoot, packageRoot),
      esbuild({
        target: ["es2022", "chrome96", "firefox96", "safari16", "node18"],
        exclude: [], // don’t exclude node_modules
        minify: true
      })
    ],
    onwarn(message, warn) {
      if (message.code === "CIRCULAR_DEPENDENCY") return;
      warn(message);
    }
  });
  try {
    const output = await bundle.generate({format: "es"});
    const code = output.output.find((o): o is OutputChunk => o.type === "chunk")!.code; // TODO don’t assume one chunk?
    return code;
  } finally {
    await bundle.close();
  }
}

function importResolve(input: string, cacheRoot: string, packageRoot: string): Plugin {
  async function resolve(specifier: string | AstNode): Promise<ResolveIdResult> {
    return typeof specifier !== "string" || // AST node?
      isPathImport(specifier) || // relative path, e.g., ./foo.js
      /^\w+:/.test(specifier) || // windows file path, https: URL, etc.
      specifier === input // entry point
      ? null // don’t do any additional resolution
      : {id: await resolveNodeImportInternal(cacheRoot, packageRoot, specifier), external: true}; // resolve bare import
  }
  return {
    name: "resolve-import",
    resolveId: resolve,
    resolveDynamicImport: resolve
  };
}
