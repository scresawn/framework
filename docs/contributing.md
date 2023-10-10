# Contributing

If you’d like to contribute to the Observable CLI, here’s how. Clone the [git repo](https://github.com/observablehq/cli), and then run [Yarn (1.x)](https://classic.yarnpkg.com/lang/en/docs/install/) to install dependencies:

```sh
git clone git@github.com:observablehq/cli.git
cd cli
yarn
```

Next start the local preview server like so:

```sh
yarn dev
```

Then visit <http://127.0.0.1:3000> and you should see something like this:

<figure>
  ${await FileAttachment("localhost.webp").image()}
  <figcaption>http://127.0.0.1:3000</figcaption>
</figure>

The local preview server restarts automatically if you edit any of the TypeScript files, though you may need to reload. The default page is [docs/index.md](https://github.com/observablehq/cli/blob/main/docs/index.md?plain=1); if you edit that file and save changes, the live preview in the browser will automatically update.

To generate the static site:

```sh
yarn build
```

This creates the `dist` folder. View the site using your preferred web server, such as:

```sh
http-server dist
```

This documentation site is built on GitHub using the Observable CLI; see the [deploy workflow](https://github.com/observablehq/cli/blob/main/.github/workflows/deploy.yml). Please open a pull request if you’d like to contribute to the documentation or to CLI features. Contributors are expected to follow our [code of conduct](https://github.com/observablehq/.github/blob/master/CODE_OF_CONDUCT.md). 🙏