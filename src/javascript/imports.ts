import type {Node} from "acorn";
import type {ExportAllDeclaration, ExportNamedDeclaration, ImportDeclaration, ImportExpression} from "acorn";
import {simple} from "acorn-walk";
import {resolvePath} from "../path.js";
import {getStringLiteralValue, isStringLiteral} from "./node.js";
import {syntaxError} from "./syntaxError.js";

export interface ImportReference {
  /** The relative path to the import from the referencing source. */
  name: string;
  /** Is this a reference to a local module, or a non-local (e.g., npm) one? */
  type: "local" | "global";
  /** Is this a static import declaration, or a dynamic import expression? */
  method: "static" | "dynamic";
}

export type ImportNode = ImportDeclaration | ImportExpression;
export type ExportNode = ExportAllDeclaration | ExportNamedDeclaration;

/**
 * Finds all export declarations in the specified node. (This is used to
 * disallow exports within JavaScript code blocks.) Note that this includes both
 * "export const foo" declarations and "export {foo} from bar" declarations.
 */
export function findExports(body: Node): ExportNode[] {
  const exports: ExportNode[] = [];

  simple(body, {
    ExportAllDeclaration: findExport,
    ExportNamedDeclaration: findExport
  });

  function findExport(node: ExportNode) {
    exports.push(node);
  }

  return exports;
}

/** Returns true if the body includes an import declaration. */
export function hasImportDeclaration(body: Node): boolean {
  let has = false;

  simple(body, {
    ImportDeclaration() {
      has = true;
    }
  });

  return has;
}
/**
 * Finds all imports (both static and dynamic, local and global) with
 * statically-analyzable sources in the specified node. Note: this includes only
 * direct imports, not transitive imports. Note: this also includes exports, but
 * exports are only allowed in JavaScript modules (not in Markdown).
 */
export function findImports(body: Node, path: string, input: string): ImportReference[] {
  const imports: ImportReference[] = [];

  simple(body, {
    ImportDeclaration: findImport,
    ImportExpression: findImport,
    ExportAllDeclaration: findImport,
    ExportNamedDeclaration: findImport
  });

  function findImport(node: ImportNode | ExportNode) {
    if (!node.source || !isStringLiteral(node.source)) return;
    const name = decodeURIComponent(getStringLiteralValue(node.source));
    const type = isPathImport(name) ? "local" : "global";
    const method = node.type === "ImportExpression" ? "dynamic" : "static";
    if (type === "local" && !resolvePath(path, name).startsWith("/")) throw syntaxError(`non-local import: ${name}`, node, input); // prettier-ignore
    imports.push({name, type, method});
  }

  return imports;
}

export function isPathImport(specifier: string): boolean {
  return ["./", "../", "/"].some((prefix) => specifier.startsWith(prefix));
}
