# Contributing to Reshape

Hello there! First of all, thanks for being interested in reshape and helping out. We all think you are awesome, and by contributing to open source projects, you are making the world a better place. That being said, there are a few ways to make the process of contributing code to reshape smoother, detailed below:

### Filing Issues

If you are opening an issue about a bug, make sure that you include clear steps for how we can reproduce the problem. _If we can't reproduce it, we can't fix it_. If you are suggesting a feature, make sure your explanation is clear and detailed.

### Getting Set Up

- Clone the project down
- Make sure [nodejs](http://nodejs.org) has been installed and is above version `6.x`
- Run `npm install`
- Put in work

### Testing

This project is constantly evolving, and to ensure that things are secure and working for everyone, we need to have tests. If you are adding a new feature, please make sure to add a test for it. The test suite for this project uses [ava](https://github.com/sindresorhus/ava).

To run the test suite just use `npm test` or install ava globally and use the `ava` command to run the tests.

### Code Style

This project uses ES6, interpreted directly by node.js. To keep a consistent coding style in the project, we are using [standard js](http://standardjs.com/). In order for tests to pass, all code must pass standard js linting. This project also uses an [editorconfig](http://editorconfig.org/). It will make life much easier if you have the [editorconfig plugin](http://editorconfig.org/#download) for your text editor. For any inline documentation in the code, we're using [JSDoc](http://usejsdoc.org/).

### Commit Cleanliness

It's ok if you start out with a bunch of experimentation and your commit log isn't totally clean, but before any pull requests are accepted, we like to have a nice clean commit log. That means [well-written and clear commit messages](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html) and commits that each do something significant, rather than being typo or bug fixes.

If you submit a pull request that doesn't have a clean commit log, we will ask you to clean it up before we accept. This means being familiar with rebasing - if you are not, [this guide](https://help.github.com/articles/interactive-rebase) by GitHub should help you to get started. And if you are still confused, feel free to ask!
