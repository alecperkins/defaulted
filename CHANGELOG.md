# Changelog

## [1.1.1](https://github.com/alecperkins/defaulted/compare/v1.1.0...v1.1.1) (2025-04-08)


### Bug Fixes

* toJSON serialization ([6d5521f](https://github.com/alecperkins/defaulted/commit/6d5521fc0d7055837aa4bc544cfac85e24bcc2bc))

## [1.1.0](https://github.com/alecperkins/defaulted/compare/v1.0.2...v1.1.0) (2025-04-05)


### Features

* Support toJSON for non-secrets ([2911012](https://github.com/alecperkins/defaulted/commit/2911012fdbf690c2f3e45039ccac2d6424e93e78)), closes [#7](https://github.com/alecperkins/defaulted/issues/7)

## [1.0.2](https://github.com/alecperkins/defaulted/compare/v1.0.1...v1.0.2) (2024-08-17)


### Miscellaneous Chores

* release ([a77e1d1](https://github.com/alecperkins/defaulted/commit/a77e1d1a267eacfbe65b366081aaadb2fc3a4d69))

## [1.0.1](https://github.com/alecperkins/defaulted/compare/v1.0.0...v1.0.1) (2023-04-14)


### Bug Fixes

* Allow secrets overrides to omit keys ([b3cf800](https://github.com/alecperkins/defaulted/commit/b3cf800b3673924c1f7adc023acb3282fbc5f572))

## [1.0.0](https://github.com/alecperkins/defaulted/compare/v1.0.0-alpha.2...v1.0.0) (2023-04-14)


### Miscellaneous Chores

* release ([9d2600a](https://github.com/alecperkins/defaulted/commit/9d2600a48e2f6c3980eddecbedbebc5b78030521))

## [1.0.0-alpha.2](https://github.com/alecperkins/defaulted/compare/v1.0.0-alpha...v1.0.0-alpha.2) (2023-04-14)


### Features

* defaulted.secrets for easier mandatory secrets ([a7dc5f3](https://github.com/alecperkins/defaulted/commit/a7dc5f32338090d6c56fc8c832cf98cafd5468ce))
* Stricter validation of keys ([092bcca](https://github.com/alecperkins/defaulted/commit/092bcca8200d8ed11a670eb64550521c21fef7a6))


### Bug Fixes

* Ensure ENVIRONMENT is always returned ([9842ada](https://github.com/alecperkins/defaulted/commit/9842ada4ee74bee4d69709eea94b321350f79ab6))


### Miscellaneous Chores

* release ([f2b2e7a](https://github.com/alecperkins/defaulted/commit/f2b2e7a45f5b73240681632b0b1415a7141aa808))

## 1.0.0-alpha (2023-03-30)


### Features

* Cast booleans ([a00c0b0](https://github.com/alecperkins/defaulted/commit/a00c0b0095706e4436e2122abd8e7774dd027737))
* Cast numbers based on default types ([8791182](https://github.com/alecperkins/defaulted/commit/879118236740a708c4ae12f890939e9adb1c8499))
* Include ENVIRONMENT ([a1c03ab](https://github.com/alecperkins/defaulted/commit/a1c03abc712912268b0558f118f0e509e311334c))
* Make config readonly, prevent access of undefined keys ([d858850](https://github.com/alecperkins/defaulted/commit/d858850ea888f3c0b15b5a59d42ac4bbb4fdbc46))
* Merge env with defaults, overrides ([fd2313f](https://github.com/alecperkins/defaulted/commit/fd2313fa4c6189b25812aa909142682bfaf4ac83))
* Throw if override set to undefined is not found in the matching ENVIRONMENT ([da22d80](https://github.com/alecperkins/defaulted/commit/da22d807c5b194afd70ea9296e1c60e53782e52c))
* Validate Boolean casting ([67e47c0](https://github.com/alecperkins/defaulted/commit/67e47c00d2163540c34998fceb16692cb697c33e))
* Validate Number casting ([350483d](https://github.com/alecperkins/defaulted/commit/350483d531b114ed99fb162e563119058bca54d5))


### Bug Fixes

* Reliably throw on assignment ([824cc35](https://github.com/alecperkins/defaulted/commit/824cc351d3c92260aab275d34da208b713b04a59))


### Miscellaneous Chores

* release 1.0.0-alpha ([1f2be3a](https://github.com/alecperkins/defaulted/commit/1f2be3a8c8f01812658bcaac28817ada0f08cdd7))
