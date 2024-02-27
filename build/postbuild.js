const fs = require('fs')
const key = process.argv[2]
const key_two = process.argv[3]

const path = require('path')
const db_path = path.join(__dirname, '../src/db/db.ts')
const password_gen = path.join(__dirname, '../src/modules/util/password-generator.ts')
function replaceKey(path, key) {
    var file = fs.readFileSync(path, 'utf-8')
    console.log(`cleaning up key...`)

    file = file.replace(`Buffer.from([${[...Buffer.from(key, 'utf-8')]}]).toString('hex')`, '"shrimp_key"')
    fs.writeFileSync(path, file, 'utf-8')
}

replaceKey(db_path, key)
replaceKey(password_gen, key_two)
console.log('done')