// Optional: runs sync.js on a loop instead of relying on cron / Task
// Scheduler. Use whichever fits how you want this machine managed —
// `npm run sync` once via a scheduled task, or `npm run watch` left
// running in a terminal / as a background service.
require('dotenv').config()
const { execFile } = require('child_process')
const path = require('path')

const INTERVAL_MINUTES = Number(process.env.SYNC_INTERVAL_MINUTES) || 15

function runSyncOnce() {
  execFile('node', [path.join(__dirname, 'sync.js')], (err, stdout, stderr) => {
    if (stdout) process.stdout.write(stdout)
    if (stderr) process.stderr.write(stderr)
    if (err) console.error('sync.js exited with an error:', err.message)
  })
}

console.log(`Watching — syncing every ${INTERVAL_MINUTES} minute(s). Press Ctrl+C to stop.`)
runSyncOnce()
setInterval(runSyncOnce, INTERVAL_MINUTES * 60 * 1000)
