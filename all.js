// simple script to run npm commands in "all" Tasks subdirectories

let fs = require('fs')
let resolve = require('path').resolve
let join = require('path').join
let cp = require('child_process')
let os = require('os')

// get command to run
if (process.argv.length === 2) {
    console.error("Expected at least one argument!");
    process.exit(1);
}

// get Tasks path
let tasks = resolve(__dirname, 'Tasks')

fs.readdirSync(tasks)
    .forEach(function (mod) {
        let modPath = join(tasks, mod)
        // ensure path has package.json
        if (!fs.existsSync(join(modPath, 'package.json'))) return
        // npm binary based on OS
        let npmCmd = os.platform().startsWith('win') ? 'npm.cmd' : 'npm'
        // install folder
        cp.spawn(npmCmd, [process.argv[2], process.argv[3]], {env: process.env, cwd: modPath, stdio: 'inherit'})
    })
