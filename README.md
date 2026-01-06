# Cowsay Twitter Bot

This project is a simple implementation of the classic command-line program `cowsay` that tweets a quote a day.
We've been curating quotes from the internet for a while.

![Twitter Follow](https://img.shields.io/twitter/follow/cowsayco?style=social)

![Cowsay - I see dead code image](./src/profile%20pic.png) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) ![GitHub repo size](https://img.shields.io/github/repo-size/meowso/cowsay) ![GitHub top language](https://img.shields.io/github/languages/top/meowso/cowsay) ![GitHub last commit](https://img.shields.io/github/last-commit/meowso/cowsay) ![GitHub issues](https://img.shields.io/github/issues/meowso/cowsay) ![GitHub pull requests](https://img.shields.io/github/issues-pr/meowso/cowsay)

---

## Installation

```bash
npm install
```

## Scripts

- **npm run clean:** Removes the dist directory.
- **npm run compile:** Compiles the TypeScript files.
- **npm run start:** Runs the clean, compile, say, lolcat, convert, and tweet scripts in order.
- **npm run convert:** Runs the convert.js script.
- **npm run say:** Runs the say.js script.
- **npm run lolcat:** Runs the lolcat.js script and outputs to lolcat.ansi.
- **npm run tweet:** Runs the tweet.js script.

## Dependencies

- ansi-to-html: ^0.7.2
- cowsay: ^1.6.0
- dotenv: ^16.4.5
- lolcatjs: ^2.4.3
- node-html-to-image: ^4.0.0
- node-pty: ^1.0.0
- twitter-api-v2: ^1.16.3
- typescript: ^5.4.5
- word-wrap: ^1.2.5
- @types/node: ^20.12.2
- @types/lolcatjs: ^2.4.1

## Website

Check our website [cowsay.farm](https://cowsay.farm).

## Author

[Bruno Palma](https://about.me/m3au)

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
If you want to add your own quotes, please open an issue with the quote and the author.

## License

This project is licensed under the MIT License.
