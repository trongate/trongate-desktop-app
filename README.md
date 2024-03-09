<div align="center">
  <h1>Trongate Desktop App</h1>
  <img src="https://trongate.io/trongate_logo/trongate_logo_dark_blue_bg.png" alt="logo" width="600" height="auto" />
  <h1>Break the rules, use Trongate</h1>
  
  <h3>
   GitHub stars are the metric by which the success of frameworks gets measured. We need 1,200 GitHub stars to make Trongate a top ten PHP framework. If Trongate becomes a top ten PHP framework, it will be one of the most electrifying events in the history of PHP! 
  </h3>

<!-- Badges -->
<p>
  <a href="https://www.php.net/">
    <img src="https://img.shields.io/badge/Electron.js-v27.3.5-777BB4"
    alt="Nodejs and Electron required" />
  </a>
  <a href="https://www.php.net/">
    <img src="https://img.shields.io/badge/Node.js-v18.17.1-777BB4"
    alt="Nodejs and Electron required" />
  </a>
  <a href="https://github.com/trongate/trongate-desktop-app/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/trongate/trongate-desktop-app" alt="contributors" />
  </a>
  <a href="">
    <img src="https://img.shields.io/github/last-commit/trongate/trongate-desktop-app" alt="last update" />
  </a>
  <a href="https://github.com/trongate/trongate-desktop-app/network/members">
    <img src="https://img.shields.io/github/forks/trongate/trongate-desktop-app" alt="forks" />
  </a>
  <a href="https://github.com/trongate/trongate-desktop-app/stargazers">
    <img src="https://img.shields.io/github/stars/trongate/trongate-desktop-app" alt="desktop stars" />
  </a>
    <a href="https://github.com/trongate/trongate-desktop-app/issues/">
    <img src="https://img.shields.io/github/issues/trongate/trongate-desktop-app" alt="open issues" />
  </a>

  <p>The Trongate PHP Framework</p>
  <a href="https://github.com/trongate/trongate-framework/stargazers">
    <img src="https://img.shields.io/github/stars/trongate/trongate-framework" alt="framework stars" />
  </a>
</p>
   
<h4>
    <a href="https://trongate.io">Website</a>
  <span> · </span>
    <a href="https://trongate.io/docs_m/contents">Documentation</a>
  <span> · </span>
    <a href="https://trongate.io/learning-zone">Learning Zone</a>
  <span> · </span>
    <a href="https://trongate.io/help_bar">Need some help</a>
  <span> · </span>
    <a href="https://trongate.io/your_messages/compose">Request a Feature</a>
  </h4>
</div>

<br />

# :notebook_with_decorative_cover: Table of Contents

- [About the Project](#star2-about-the-project)
  - [Features](#dart-features)
- [Getting Started](#toolbox-getting-started)
  - [Prerequisites](#bangbang-prerequisites)
  - [Installation](#gear-installation)
- [Usage](#eyes-usage)
- [Contributing](#wave-contributing)
- [License](#warning-license)
- [Contact](#handshake-contact)

<!-- About the Project -->

## :star2: About the Project

<div align="left"> 
  <p>The Trongate Desktop App is an Electron-based application designed to streamline development with the Trongate PHP framework. It offers a range of features to enhance productivity and simplify the development process.</p>
  <p>The Trongate framework was built with a love of pure PHP and a belief that PHP is best when it's easy, stable, and fast. It actively rejects PSR-4 auto-loading, Composer, Packagist, rewrite culture, certification, and all forms of bureaucracy.</p>
  <p>The Trongate framework is free, as is the desktop app, and they always will be. That's a promise!</p>
</div>

<!-- Features -->

### :dart: Features <span style="color: pink;"><i>(click to reveal)</i></span>

<details>
  <summary>Create a new Trongate app</summary>
  <p>
    No command line. No Git. No 'Composer dot phar'. No  Yaml. No Packagist. Trongate installs itself. Simply download the free Trongate desktop app and set up entire database driven apps in seconds!
  </p>
</details>
<details>
  <summary>Properties Builder</summary>
  <p>
    The properties builder creates the database schema and code scaffold for general CRUD operations, enhancing productivity with automatic code generation.
  </p>
</details>
<details>
  <summary>Graphical Query Builder</summary>
  <p>
    Trongate is the only framework that comes with a free graphical SQL query builder. So, now you can build complex table joins easily and liberate yourself from costly db management software.
  </p>
</details>
<details>
  <summary>Module Import Wizard</summary>
  <p>
    Easily import entire modules, including SQL data. Drag 'n' drop web development, at last.
  </p>
</details>
<details>
  <summary>Module Market Portal</summary>
  <p>
    Import custom modules into your app from the online <a href="https://trongate.io/module-market">Module Market</a>, offering a wide range of additional functionality.
  </p>
</details>
<details>
  <summary>Create Module Relations</summary>
  <p>
    Create table joins or pivot tables to link data seamlessly within your application.
  </p>
</details>
<details>
  <summary>File Uploaders</summary>
  <p>
    Add single or multi-file image uploaders to your modules effortlessly, streamlining the process of handling file uploads.
  </p>
</details>

<!-- Getting Started -->

## :toolbox: Getting Started

<h3>Create Trongate apps</h3>

- The Trongate Desktop App can be downloaded for Mac, Windows, and Linux
  - [from the Trongate website](https://trongate.io/download)

<p>Have MariaDB or MySQL installed and running, either with Xampp or similar <i>(note some people have had connection issues with MySQL on a Mac - usually solved with permission fixes)</i></p>

<h3>Develop and/ or build the Desktop App</h3>
<p>Ensure Nodejs is installed, clone this repo.  Change directory into it and run this command to install the 'Node Modules' needed</p>

- Node.js v18.17.1 and npm 9.6.7 installed
  - Electron v27.3.5 (auto installed as dev dependancy)
  - Electron Builder v24.13.3 (auto installed as dev dependancy)

<p><i>Note: the versions above were bumped up to the latest stable versions, which are close to what DC used at the time of creating the Desktop App - You can use later versions but please alway match the Electron version with the correct Node version - https://releases.electronjs.org/ use the Node Version manager to swap Node versions</i></p>

`npm install`

<p>To run the Desktop app from the downloaded repository</p>

`npm run start` or `npx electron .`

<p>or install Electron globally</p>

`npm install electron@26.2.1 -g`

<p>and run it like this</p>

`electron .`

<p>Create a .gitignore file if you intend to post pull requests</p>

```
# DC stuff
_junk/

# Node artifact files
dist/
node_modules/
package-lock.json

# Git files
.gitignore
```

## Compile the Desktop App

### Windows

`npx electron-builder -w` or `npm run electron:win`

Edit 'package.json' "win": {"target": "zip"}

- change output to a zip file > set 'target' to 'zip'
- change output as a self installer - note: both will install to %localAppData%\Programs\Trongate\
  - (exe) > set 'target' to 'nsis'
  - (msi) > set 'target' to 'msi'

### Mac

`npx electron-builder -m` or `npm run electron:mac`

### Linux

`npx electron-builder -l` or `npm run electron:linux`

<!-- Contributing -->

## :wave: Contributing

Contributions are always welcome! Visit [our GitHub repository](https://github.com/trongate/trongate-desktop-app) to contribute.

<!-- License -->

## :warning: License

[GPL-3.0 license](https://github.com/trongate/trongate-desktop-app?tab=GPL-3.0-1-ov-file#readme)

<!-- Contact -->

## :handshake: Contact

David Connelly - [@davidjconnelly](https://twitter.com/davidjconnelly) - [Get In Touch](https://trongate.io/your_messages/compose)
