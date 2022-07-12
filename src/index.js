const cron = require('node-cron')
const fse = require('fs-extra')
const path = require('path')
const fs = require('fs');
const readline = require('readline');

/**
 * 定时任务
 * @param {*} cronStr crontab表达式
 * @param {*} trick 定时执行的任务
 */
function schedule(cronStr, trick) {
    cron.schedule(cronStr, () => {
        trick()
    });
}

function copyLogFile(per, lend) {
    fse.copySync(per, lend)
}

function removeContent(dir) {
    fse.outputFileSync(dir, '')
}

function processLineByLine(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    rl.on('line',function(line){
        console.log('line',line)
    })
}


function main() {
    const baseDir = path.resolve(__dirname, '../logs/test.log')
    const logPath = path.resolve(__dirname, '../schedule-logs/20220712.log')
    // 每天凌晨将logs中的test.log 复制到schedule-logs对应的日期日志中
    copyLogFile(baseDir, logPath)
    // schedule('* * * * * *',copyLogFile)
    //复制完成后将test.log内容清空
    removeContent(baseDir);
    //逐行读取日志内容
    processLineByLine(logPath)
}

main()