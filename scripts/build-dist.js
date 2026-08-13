
const fs = require('fs');
const path = require('path');


const PROJECT_DIR = path.join(__dirname, '..');
const BUILD_DIR = path.join(PROJECT_DIR, 'build');
const DIST_DIR = path.join(PROJECT_DIR, 'dist');

function readProjectFile (filepath) {
  return fs.readFileSync(path.join(PROJECT_DIR, filepath));
}
function readBuildFile (filepath) {
  return fs.readFileSync(path.join(BUILD_DIR, filepath));
}


function prepareDir () {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR);
}

// A plain `.replace` that finds nothing is a silent no-op, which would
// publish a CJS build that never assigns module.exports. Fail the build
// instead, so a change in the tsc output is caught here and not on install.
function replaceOrFail (content, search, replacement) {
  // `replace` with a string only takes the first hit, so a second occurrence
  // would survive unpatched. Require exactly one.
  const found = content.split(search).length - 1;
  if (found !== 1) {
    throw new Error(
      `Cannot patch the CJS build: expected exactly one ${ JSON.stringify(search) }, found ${ found }.\n`
      + `The tsc output has changed, and publishing this would ship a broken package.`
    );
  }
  return content.replace(search, replacement);
}

function writePackageFile (name, content) {
  console.log('writing',name);
  fs.writeFileSync(
    path.join(DIST_DIR, name),
    content,
  );
}

const package_content = require(path.join(__dirname, '..', 'package.json'));
delete package_content.scripts;
delete package_content.devDependencies;
delete package_content.private;

// Read and patch everything up front. ./dist is wiped below, so anything
// that can fail has to fail before that, or a rejected build leaves behind a
// package.json pointing at files that were never written.
const readme_content = readProjectFile('README.md');
const license_content = readProjectFile('LICENSE');
const mjs_content = readBuildFile('index.mjs');
const types_content = readBuildFile('index.d.ts');

// Reassigning module.exports discards everything tsc hung off the original
// exports object, so the named exports have to be re-established below rather
// than left where tsc put them.
let cjs_content = readBuildFile('index.cjs').toString();
cjs_content = replaceOrFail(cjs_content, `Object.defineProperty(exports, "__esModule", { value: true });`,'');
cjs_content = replaceOrFail(cjs_content, `exports.secrets = secrets;`,'');
cjs_content = replaceOrFail(cjs_content, `exports.default = defaulted;`,`
module.exports = defaulted;
module.exports.default = defaulted;
module.exports.secrets = secrets;
Object.defineProperty(module.exports, "__esModule", { value: true });
`);

prepareDir();

writePackageFile('package.json', JSON.stringify(package_content, null, 4));
writePackageFile('README.md', readme_content);
writePackageFile('LICENSE', license_content);
writePackageFile('index.mjs', mjs_content);
writePackageFile('index.cjs', cjs_content);
writePackageFile('index.d.ts', types_content);
