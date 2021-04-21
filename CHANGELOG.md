# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.5.2...HEAD)

## [2.5.2](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.5.1...2.5.2) - 2021-04-21

## [2.5.1](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.5.0...2.5.1) - 2021-04-01

## [2.5.0](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.3.0...2.5.0) - 2020-11-16

### Changed

-   Update icon. [2508778](https://github.com/atomist-skills/github-auto-merge-skill/commit/250877823d262ddfd39d60d4f62a823b0c2f1da0)

### Removed

-   Remove unused chat provider. [6d2d3e3](https://github.com/atomist-skills/github-auto-merge-skill/commit/6d2d3e3a3a8a82fbac73e3555748c3451b6f973d)

### Fixed

-   Fix package start script. [6aa1044](https://github.com/atomist-skills/github-auto-merge-skill/commit/6aa1044a48e1f74dfe040801355db0f79fc7bba9)

## [2.3.0](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.2.0...2.3.0) - 2020-10-16

### Changed

-   Update skill category. [efd82fa](https://github.com/atomist-skills/github-auto-merge-skill/commit/efd82fa550a9d8ad3d05b029334cb72c1bd3e584)

## [2.2.0](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.1.2...2.2.0) - 2020-10-14

### Added

-   Add dry-run option. [#69](https://github.com/atomist-skills/github-auto-merge-skill/issues/69)
-   Add option to only auto merge for certain PR authors. [#70](https://github.com/atomist-skills/github-auto-merge-skill/issues/70)

### Changed

-   Remove single dispatch. [9961aca](https://github.com/atomist-skills/github-auto-merge-skill/commit/9961aca519f02b244188d1ba113ccaa8b1571429)

### Fixed

-   Hide messages on check for closed pull requests. [5ed064d](https://github.com/atomist-skills/github-auto-merge-skill/commit/5ed064da2b4bb2a4de47d28b33769fc0fbd1a980)

## [2.1.2](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.1.1...2.1.2) - 2020-09-11

### Fixed

-   Fix check auto-merge. [ab5d774](https://github.com/atomist-skills/github-auto-merge-skill/commit/ab5d7745350d9eca25df17710252a6c82c81d21e)

## [2.1.1](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.1.0...2.1.1) - 2020-09-10

### Fixed

-   Fix auto-merge on checks with no checks. [dd3250a](https://github.com/atomist-skills/github-auto-merge-skill/commit/dd3250a8f5533f583dc34457a35d339d53fb344a)

## [2.1.0](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.0.12...2.1.0) - 2020-09-10

### Added

-   Support auto merge for protected branches. [cef1acd](https://github.com/atomist-skills/github-auto-merge-skill/commit/cef1acd5705ff92a2c20bde0823a57e5d6ca0767)
-   Read protection rules to get all required checks before merging. [#13](https://github.com/atomist-skills/github-auto-merge-skill/issues/13)

## [2.0.12](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.0.11...2.0.12) - 2020-07-28

### Changed

-   Update catgory. [#22](https://github.com/atomist-skills/github-auto-merge-skill/issues/22)

## [2.0.11](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.0.10...2.0.11) - 2020-07-17

### Changed

-   Hide markers in PR comments. [673d428](https://github.com/atomist-skills/github-auto-merge-skill/commit/673d428b116b3f5614fcb3c88b9649afd0e2c6bb)

## [2.0.10](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.0.9...2.0.10) - 2020-07-02

### Changed

-   Move to plural in description. [044acd7](https://github.com/atomist-skills/github-auto-merge-skill/commit/044acd751dccc3c7333acdc907b71b20710ac08c)

## [2.0.9](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.0.8...2.0.9) - 2020-06-29

### Added

-   Add different chat providers. [769f535](https://github.com/atomist-skills/github-auto-merge-skill/commit/769f53546f3ea760c92bbb73f518a912a9cfbd04)

### Changed

-   Update description. [c57f1f1](https://github.com/atomist-skills/github-auto-merge-skill/commit/c57f1f155c65f3119ba2a3023af928a9b5004480)
-   Update displayName. [af564fa](https://github.com/atomist-skills/github-auto-merge-skill/commit/af564fa9c845c3f9c70d9097562cb302cd792fe5)

## [2.0.8](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.0.7...2.0.8) - 2020-06-23

### Fixed

-   Fix namespace and displayName. [4fb6270](https://github.com/atomist-skills/github-auto-merge-skill/commit/4fb62705a9c2cbd6430d27b869893e8a5f6a65ee)

## [2.0.7](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.0.6...2.0.7) - 2020-06-23

### Added

-   Include link to skill execution in PR comment. [325af7e](https://github.com/atomist-skills/github-auto-merge-skill/commit/325af7ea0ea32aeff9932e89ee6c6fbe8364e655)

### Changed

-   Move to skill.ts. [7e24553](https://github.com/atomist-skills/github-auto-merge-skill/commit/7e2455346fe5c7203d4202d35aec3b374c3722b0)

## [2.0.6](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.0.5...2.0.6) - 2020-06-19

### Changed

-   Improve commit title and message for merge commits. [8bfa7e3](https://github.com/atomist-skills/github-auto-merge-skill/commit/8bfa7e3e9661478623cd0be02170d6ba0bf5f1bd)

## [2.0.5](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.0.4...2.0.5) - 2020-06-18

### Changed

-   New packaging. [3acaf8c](https://github.com/atomist-skills/github-auto-merge-skill/commit/3acaf8c7a89c67c4b25b361bd9befa2f7adca4d8)

### Fixed

-   Retrieve all PR labels to correctly get all auto-merge settings. [612a4e2](https://github.com/atomist-skills/github-auto-merge-skill/commit/612a4e2469f6b45ebbeef35a3c1113d161408c75)
-   Only add approved reviews to auto-merge comment. [d7b622f](https://github.com/atomist-skills/github-auto-merge-skill/commit/d7b622f942f72c52e58cfb603b0bc29df4a605b7)

## [2.0.4](https://github.com/atomist-skills/github-auto-merge-skill/compare/2.0.3...2.0.4) - 2020-05-18

## [2.0.3](https://github.com/atomist-skills/github-auto-merge-skill/tree/2.0.3) - 2020-05-18

### Added

-   Add GitHub Checks support. [#6](https://github.com/atomist-skills/github-auto-merge-skill/issues/6)
