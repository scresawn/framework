import {existsSync} from "node:fs";
import {readFile} from "node:fs/promises";
import {join} from "node:path/posix";
import type {Config} from "./config.js";
import type {JavaScriptNode} from "./javascript/parse.js";
import {parseMarkdown} from "./markdown.js";

export interface PageSource {
  title: string | null;
  head: string | null;
  header: string | null;
  body: string;
  footer: string | null;
  data: PageConfig;
  style: string | null;
  code: PageCode[];
}

export interface PageConfig {
  title?: string | null;
  toc?: {show?: boolean; label?: string};
  style?: string | null;
  theme?: string[];
  head?: string | null;
  header?: string | null;
  footer?: string | null;
  index?: boolean;
  keywords?: string[];
  draft?: boolean;
  sidebar?: boolean;
  sql?: {[key: string]: string};
}

export interface PageCode {
  id: string;
  node: JavaScriptNode;
}

export interface PageGenerator {
  /** The path to watch if this page changes. */
  readonly path: string;
  /** Generate the page. */
  generate(): Promise<PageSource>;
}

export function findPage(path: string, config: Config): PageGenerator {
  return (
    maybeStaticHtml(path, config) ??
    maybeStaticMarkdown(path, config) ??
    maybeDynamicMarkdown(path, config) ??
    notFound()
  );
}

function pageExtension(path: string, ext: string): string {
  return path.replace(/\.html$/i, "") + ext;
}

async function generateMarkdown(file: string, path: string, config: Config): Promise<PageSource> {
  const source = await readFile(file, "utf-8");
  return parseMarkdown(source, {...config, path});
}

function maybeStaticMarkdown(path: string, config: Config): PageGenerator | undefined {
  const {root} = config;
  const file = join(root, pageExtension(path, ".md"));
  if (existsSync(file)) {
    return {
      path: file,
      generate: () => generateMarkdown(file, path, config)
    };
  }
}

function maybeDynamicMarkdown(path: string, config: Config): PageGenerator | undefined {
  const {root, loaders} = config;
  const loader = loaders.find(join("/", pageExtension(path, ".md")));
  if (loader) {
    return {
      path: loader.path,
      generate: async () => generateMarkdown(join(root, await loader.load()), path, config)
    };
  }
}

function maybeStaticHtml(path: string, config: Config): PageGenerator | undefined {
  const {root} = config;
  const file = join(root, pageExtension(path, ".html"));
  if (existsSync(file)) {
    return {
      path: file,
      generate: async () => {
        const source = await readFile(file, "utf-8");
        return {
          title: null, // TODO <title> element
          head: null, // TODO config.head or <head> element
          header: null, // TODO config.header or <header> element
          body: source,
          footer: null, // TODO config.footer or <footer> element
          data: {},
          style: "observablehq:theme-air,midnight.css", // TODO config.style
          code: [] // TODO <script type="observablehq"> elements?
        };
      }
    };
  }
}

function notFound(): never {
  throw Object.assign(new Error("page not found"), {code: "ENOENT"});
}