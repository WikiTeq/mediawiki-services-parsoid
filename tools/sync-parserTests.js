#!/usr/bin/env node

"use strict";

require('../core-upgrade.js');

/**
   == USAGE ==

   Script to synchronize parsoid parserTests with parserTests in other repos.

   Basic use:
     $PARSOID is the path to a checked out git copy of Parsoid
     $REPO is the path to a checked out git copy of the repo containing
       the parserTest file. (Check the `repo` key in tests/parserTests.json)
     $BRANCH is a branch name for the patch to $REPO (ie, 'ptsync-<date>')
     $TARGET identifies which set of parserTests we're synchronizing.
       (This should be one of the top-level keys in tests/parserTests.json)

   $ cd $PARSOID
   $ tools/sync-parserTests.js $REPO $BRANCH $TARGET
   $ cd $REPO
   $ git rebase master
     ... resolve conflicts, sigh ...
   $ php tests/parser/parserTests.php
     ... fix any failures by marking tests parsoid-only, etc ...
   $ git review

     ... time passes, eventually your patch is merged to $REPO ...

   $ cd $PARSOID
   $ tools/fetch-parserTests.txt.js $TARGET --force
   $ php bin/parserTests.php --updateKnownFailures
   $ git add -u
   $ git commit -m "Sync parserTests with core"
   $ git review

   Simple, right?

   == WHY ==

   There are two copies of parserTests files.

   Since Parsoid & core are in different repositories and both Parsoid
   and the legacy parser are still operational, we need a parserTests
   file in each repository. They are usually in sync but since folks
   are hacking both wikitext engines simultaneously, the two copies
   might be modified independently. So, we need to periodically sync
   them (which is just a multi-repo rebase).

   We detect incompatible divergence of the two copies via CI. We run the
   legacy parser against Parsoid's copy of the test file and test failures
   indicate a divergence and necessitates a sync. Core also runs Parsoid
   against core's copy of the test file in certain circumstances (and
   this uses the version of Parsoid from mediawiki-vendor, which is
   "the latest deployed version" not "the latest version").

   This discussion only touched upon tests/parser/parserTests.txt but
   all of the same considerations apply to the parser test file for
   extensions since we have a Parsoid-version and a legacy-parser version
   of many extensions at this time.  When CI runs tests on extension
   repositories it runs them through both the legacy parser and
   Parsoid (but only if you opt-in by adding a 'parsoid-compatible'
   flag to the parser test file).
   https://codesearch.wmcloud.org/search/?q=parsoid-compatible&i=nope

   == THINKING ==

   The "thinking" part of the sync is to look at the patches created and
   make sure that whatever change was made upstream (as shown in the diff
   of the sync patch) doesn't require a corresponding change in Parsoid
   and file a phab task and regenerate the known-differences list if that
   happens to be the case.
 */

var yargs = require('yargs');
var childProcess = require('pn/child_process');
var path = require('path');
var fs = require('pn/fs');

var Promise = require('../lib/utils/promise.js');

var testDir = path.join(__dirname, '../tests/');
var testFilesPath = path.join(testDir, 'parserTests.json');
var testFiles = require(testFilesPath);

var DEFAULT_TARGET = 'parserTests.txt';

var strip = function(s) {
	return s.replace(/(^\s+)|(\s+$)/g, '');
};

Promise.async(function *() {
	// Option parsing and helpful messages.
	var usage = 'Usage: $0 <repo path> <branch name> <target>';
	var opts = yargs
	.usage(usage)
	.options({
		'help': { description: 'Show this message' },
	});
	var argv = opts.argv;
	if (argv.help || argv._.length < 2 || argv._.length > 3) {
		opts.showHelp();
		var morehelp = yield fs.readFile(__filename, 'utf8');
		morehelp = strip(morehelp.split(/== [A-Z]* ==/, 2)[1]);
		console.log(morehelp.replace(/^ {3}/mg, ''));
		return;
	}

	// Ok, let's do this thing!
	var mwpath = path.resolve(argv._[0]);
	var branch = argv._[1];
	var targetName = argv._[2] || DEFAULT_TARGET;

	if (!testFiles.hasOwnProperty(targetName)) {
		console.warn(targetName + ' not defined in parserTests.json');
		return;
	}

	var file = testFiles[targetName];
	var oldhash = file.latestCommit;

	var mwexec = function(cmd) {
		// Execute `cmd` in the mwpath directory.
		return new Promise(function(resolve, reject) {
			console.log('>>>', cmd.join(' '));
			childProcess.spawn(cmd[0], cmd.slice(1), {
				cwd: mwpath,
				env: process.env,
				stdio: 'inherit',
			}).on('close', function(code) {
				if (code === 0) {
					resolve(code);
				} else {
					reject(code);
				}
			}).on('error', reject);
		});
	};

	var pPARSERTESTS = path.join(__dirname, '..', 'tests', 'parser', targetName);
	var mwPARSERTESTS = path.join(mwpath, file.path);

	// Fetch current Parsoid git hash.
	var result = yield childProcess.execFile(
		'git', ['log', '--max-count=1', '--pretty=format:%H'], {
			cwd: __dirname,
			env: process.env,
		}).promise;
	var phash = strip(result.stdout);

	// A bit of user-friendly logging.
	console.log('Parsoid git HEAD is', phash);
	console.log('>>> cd', mwpath);

	// Create a new mediawiki/core branch, based on the previous sync point.
	yield mwexec('git fetch origin'.split(' '));
	yield mwexec(['git', 'checkout', '-b', branch, oldhash]);

	// Copy our locally-modified parser tests over to mediawiki/core.
	// cp __dirname/tests/parser/parserTests.txt $mwpath/tests/parser
	try {
		var data = yield fs.readFile(pPARSERTESTS);
		console.log('>>>', 'cp', pPARSERTESTS, mwPARSERTESTS);
		yield fs.writeFile(mwPARSERTESTS, data);
	} catch (e) {
		// cleanup
		yield mwexec('git checkout master'.split(' '));
		yield mwexec(['git', 'branch', '-d', branch]);
		throw e;
	}

	// Make a new mediawiki/core commit with an appropriate message.
	var commitmsg = 'Sync up with Parsoid ' + targetName;
	commitmsg += '\n\nThis now aligns with Parsoid commit ' + phash;
	// Note the --allow-empty, because sometimes there are no parsoid-side
	// changes to merge. (We just need to get changes from upstream.)
	yield mwexec(['git', 'commit', '-m', commitmsg, '--allow-empty', mwPARSERTESTS]);

	// ok, we were successful at making the commit.  Give further instructions.
	console.log();
	console.log('Success!  Now:');
	console.log(' cd', mwpath);
	console.log(' git rebase --keep-empty origin/master');
	console.log(' .. fix any conflicts .. ');
	console.log(' php tests/parser/parserTests.php');
	console.log(' git review');

	// XXX to rebase semi-automatically, we might do something like:
	//  yield mwexec('git rebase origin/master'.split(' '));
	// XXX but it seems rather confusing to do it this way, since the
	// current working directory when we finish is still parsoid.

	process.exit(0);
})().done();
