const fs = require('fs');
const unzipper = require('unzipper');

[
    'vault-0.10.1-migrate',
    'vault-0.26-basic', 'vault-0.26-ledger', 'vault-0.26-book', 'vault-0.26-snappy',
    'vault-0.27-standard'
].forEach((name) => {
    fs.createReadStream('testdata/' + name + ".zip")
        .pipe(unzipper.Extract({path: 'testdata'}));
});
