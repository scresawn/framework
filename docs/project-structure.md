# Project structure

A Framework project consists of a home page (`index.md`) and any of the following:

- Additional pages (`.md`)
- Data loaders (`.csv.py`, `.json.ts`, _etc._)
- Static data files (`.csv`, `.json`, `.parquet`, _etc._)
- Other static assets (`.png`, `.css`, _etc._)
- Shared components (`.js`)
- A project configuration file (`observablehq.config.js`)

Pages are written in Markdown (`.md`) intermingled with HTML, JavaScript, SQL, and other languages. JavaScript can also be imported from local modules (`.js`) and npm. Data loaders can be written in Python, R, JavaScript, or any other language, and output data snapshots. These snapshots, along with static data files, can be loaded into pages to render charts, tables, and other dynamic content.

And a typical project is structured like this:

```ini
.
├─ docs                   # source root
│  ├─ .observablehq
│  │  ├─ cache            # data loader cache
│  │  └─ deploy.json      # deployment metadata
│  ├─ components
│  │  └─ dotmap.js        # shared JavaScript module
│  ├─ data
│  │  └─ quakes.csv.ts    # data loader
│  ├─ index.md            # home page
│  └─ quakes.md           # page
├─ .gitignore
├─ README.md
├─ observablehq.config.js # project configuration
├─ package.json           # node package dependencies
└─ yarn.lock              # node package lockfile
```

#### `docs`

This is the “source root” — where your source files live. It doesn’t have to be named `docs`, but that’s the default; you can change it using the **root** [config option](./config). Pages go here. Each page is a Markdown file. Framework uses [file-based routing](#routing), which means that the name of the file controls where the page is served. You can create as many pages as you like. Use folders to organize your pages.

#### `docs/.observablehq/cache`

This is where the [data loader](./loaders) cache lives. You don’t typically have to worry about this since it’s autogenerated when the first data loader is referenced. You can `rm -rf docs/.observablehq/cache` to clean the cache and force data loaders to re-run.

#### `docs/.observablehq/deploy.json`

This file is automatically generated the first time you deploy to Observable, saving some information to make it easier to redeploy next time.

#### `docs/components`

You can put shared [JavaScript modules](./imports) anywhere in your source root, but we recommend putting them here. This helps you pull code out of Markdown files and into JavaScript, making it easier to reuse code across pages, write tests and run linters, and even share code with vanilla web applications.

#### `docs/data`

You can put [data loaders](./loaders) or static files anywhere in your source root, but we recommend putting them here.

#### `docs/index.md`

This is the home page for your site. You can have as many additional pages as you’d like, but you should always have a home page, too.

#### `observablehq.config.js`

This is the [project configuration](./config) file, such as the pages and sections in the sidebar navigation, and the project’s title. The config file can be written in either TypeScript (`.ts`) or JavaScript (`.js`).

## Routing

Framework uses file-based routing: each page in your project has a corresponding Markdown file (`.md`) of the same name. For example, here’s a simple project that only has two pages (`hello.md` and `index.md`) in the source root (`docs`):

```ini
.
├─ docs
│  ├─ hello.md
│  └─ index.md
└─ ...
```

<!-- In addition to pages, you can have [importable](./imports) JavaScript modules (`.js`), [data loaders](./loaders) for generating data snapshots (_e.g._, `.csv.py`), and [static assets](./files) such as images and files (_e.g._, `.png`). -->

When the site is built, the output root (`dist`) will contain two corresponding static HTML pages (`hello.html` and `index.html`), along with a few additional assets needed for the site to work.

```ini
.
├─ dist
│  ├─ _observablehq
│  │  └─ ... # additional assets for serving the site
│  ├─ hello.html
│  └─ index.html
└─ ...
```

For this site, routes map to files as:

```
/      → dist/index.html → docs/index.md
/hello → dist/hello.html → docs/hello.md
```

This assumes [“clean URLs”](./config#cleanurls) as supported by most static site servers; `/hello` can also be accessed as `/hello.html`, and `/` can be accessed as `/index` and `/index.html`. (Some static site servers automatically redirect to clean URLs, but we recommend being consistent when linking to your site.)

Projects should always have a top-level `index.md`; this is the root page of your project, and it’s what people visit by default.

Pages can live in folders. For example:

```ini
.
├─ docs
│  ├─ missions
|  |  ├─ index.md
|  |  ├─ apollo.md
│  │  └─ gemini.md
│  └─ index.md
└─ ...
```

With this setup, routes are served as:

```
/                → dist/index.html           → docs/index.md
/missions/       → dist/missions/index.html  → docs/missions/index.md
/missions/apollo → dist/missions/apollo.html → docs/missions/apollo.md
/missions/gemini → dist/missions/gemini.html → docs/missions/gemini.md
```

As a variant of the above structure, you can move the `missions/index.md` up to a `missions.md` in the parent folder:

```ini
.
├─ docs
│  ├─ missions
|  |  ├─ apollo.md
│  │  └─ gemini.md
│  ├─ missions.md
│  └─ index.md
└─ ...
```

Now routes are served as:

```
/                → dist/index.html           → docs/index.md
/missions        → dist/missions.html        → docs/missions.md
/missions/apollo → dist/missions/apollo.html → docs/missions/apollo.md
/missions/gemini → dist/missions/gemini.html → docs/missions/gemini.md
```
