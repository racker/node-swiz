st login: Wed May 30 13:45:19 on ttys000
Phoebes-MacBook-Pro:~ phoebesimon$ cd VirtualBox\ VMs/raxvm/ele/ele_source/node-rackspace-shared-utils/
Phoebes-MacBook-Pro:node-rackspace-shared-utils phoebesimon$ ls
LICENSE		jshint.json	node_modules	scripts
README.md	lib		package.json	tests
Phoebes-MacBook-Pro:node-rackspace-shared-utils phoebesimon$ cd lib/
Phoebes-MacBook-Pro:lib phoebesimon$ ls
errors.js	fs.js		instruments.js	request.js
flow_control.js	index.js	misc.js		uuid.js
Phoebes-MacBook-Pro:lib phoebesimon$ vim uuid.js 
Phoebes-MacBook-Pro:lib phoebesimon$ git checkout -b uuid-move-validate-UUID
M	lib/uuid.js
Switched to a new branch 'uuid-move-validate-UUID'
Phoebes-MacBook-Pro:lib phoebesimon$ git status
# On branch uuid-move-validate-UUID
# Changes not staged for commit:
#   (use "git add <file>..." to update what will be committed)
#   (use "git checkout -- <file>..." to discard changes in working directory)
#
#	modified:   uuid.js
#
no changes added to commit (use "git add" and/or "git commit -a")
Phoebes-MacBook-Pro:lib phoebesimon$ git add uuid.js 
Phoebes-MacBook-Pro:lib phoebesimon$ git commit
[uuid-move-validate-UUID 4040d1c] uuid.js: took out check for valid UUID
 1 files changed, 0 insertions(+), 16 deletions(-)
Phoebes-MacBook-Pro:lib phoebesimon$ git push origin uuid-move-validate-UUID
Username: 
Password: 
error: The requested URL returned error: 403 while accessing https://github.com/racker/node-rackspace-shared-utils.git/info/refs

fatal: HTTP request failed
Phoebes-MacBook-Pro:lib phoebesimon$ git push origin uuid-move-validate-UUID
Username: 
Password: 
error: The requested URL returned error: 403 while accessing https://github.com/racker/node-rackspace-shared-utils.git/info/refs

fatal: HTTP request failed
Phoebes-MacBook-Pro:lib phoebesimon$ git push origin uuid-move-validate-UUID
Username: 
Password: 
error: The requested URL returned error: 403 while accessing https://github.com/racker/node-rackspace-shared-utils.git/info/refs

fatal: HTTP request failed
Phoebes-MacBook-Pro:lib phoebesimon$ git push origin uuid-move-validate-UUID
Username: 
Password: 
Counting objects: 7, done.
Delta compression using up to 8 threads.
Compressing objects: 100% (4/4), done.
Writing objects: 100% (4/4), 410 bytes, done.
Total 4 (delta 3), reused 0 (delta 0)
To https://github.com/racker/node-rackspace-shared-utils.git
 * [new branch]      uuid-move-validate-UUID -> uuid-move-validate-UUID
Phoebes-MacBook-Pro:lib phoebesimon$ ls
errors.js	fs.js		instruments.js	request.js
flow_control.js	index.js	misc.js		uuid.js
Phoebes-MacBook-Pro:lib phoebesimon$ cd ..
Phoebes-MacBook-Pro:node-rackspace-shared-utils phoebesimon$ ls
LICENSE		jshint.json	node_modules	scripts
README.md	lib		package.json	tests
Phoebes-MacBook-Pro:node-rackspace-shared-utils phoebesimon$ cd tests
Phoebes-MacBook-Pro:tests phoebesimon$ ls
assert.js			test-util-misc.js
test-instruments.js		test-util-request.js
test-util-flow-control.js	test-uuid.js
Phoebes-MacBook-Pro:tests phoebesimon$ vim test-uuid.js 
Phoebes-MacBook-Pro:tests phoebesimon$ cd ..
Phoebes-MacBook-Pro:node-rackspace-shared-utils phoebesimon$ ls
LICENSE		jshint.json	node_modules	scripts
README.md	lib		package.json	tests
Phoebes-MacBook-Pro:node-rackspace-shared-utils phoebesimon$ cd tests
Phoebes-MacBook-Pro:tests phoebesimon$ ls
assert.js			test-util-misc.js
test-instruments.js		test-util-request.js
test-util-flow-control.js	test-uuid.js
Phoebes-MacBook-Pro:tests phoebesimon$ vim test-uuid.js

var uint = require('../lib/uuid').Uint;
var uuidFromTimestamp = require('../lib/uuid').uuidFromTimestamp;
var uuidFromBuffer = require('../lib/uuid').uuidFromBuffer;

exports['test_zero'] = function(test, assert) {
  var sizes = [1, 4, 8, 16, 32, 64, 128];
  sizes.forEach(function(sz) {
    var x = new uint(sz);
    assert.strictEqual(x.intValue(), 0);
  });
  test.finish();
};

exports['test_invalid_sizes'] = function(test, assert) {
  var invalidSizes = [0, -1, -8];
  invalidSizes.forEach(function(sz) {
    try {
      var x = new uint(sz);
      assert.ok(false, 'you shouldn\'t be able to do that.');
    } catch (err) {
      assert.ok(err);
    }
  });
"test-uuid.js" 347L, 10144C

