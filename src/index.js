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

/**
 * 逐行读取日志文件
 * @param {*} filePath 
 */
function processLineByLine(filePath) {
    const logInfo = [];
    const readStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: readStream,
    });
    rl.on('line', function (line) {
        //解析日志信息
        const info = parseLogInfo(line)
        logInfo.push(info)

    })

    rl.on("close", () => {
        const st = statisticsInfo(logInfo)
        console.log('数据读取解析结果:', logInfo)
        console.log('分渠道统计结果:', st)
    });
}

/**
 * 删除过期文件
 */
function removeExpiredLogs(distFolder) {
    const fileNames = fse.readdirSync(distFolder);
    fileNames.forEach((fileName) => {
        try {
            // fileName 格式 '2021-09-14.log'
            const dateStr = fileName.split(".")[0];
            const d = new Date(dateStr);
            const t = Date.now() - d.getTime();
            if (t / 1000 / 60 / 60 / 24 > 90) {
                // 时间间隔，大于 90 天，则删除日志文件
                const filePath = path.join(distFolder, fileName);
                fse.removeSync(filePath);
            }
        } catch (error) {
            console.error(`日志文件格式错误 ${fileName}`, error);
        }
    });
}

/**
 * 解析日志信息
 * @param {*} oneLog 
 */
function parseLogInfo(oneLog) {
    let result = {}
    const reg = /GET\s\/police.png\?(.+?)\s/;
    const matchResult = oneLog.match(reg);
    if (matchResult) {//这个判断没必要，nginx配置可够滤掉改请求意外地请求，本地未配置暂时先加上
        const queryStr = matchResult[1];
        //解析get请求中的参数
        // queryStr.replace(/([^?&=]+)=([^&]+)/g, (_, k, v) => result[k] = v);
        result = new URLSearchParams(queryStr)
    }
    return result
}

/**
 * 分渠道统计
 */
function statisticsInfo(logInfo) {
    const st = {}
    logInfo.forEach(info => {
        const category = info.get('category')
        const action = info.get('action')
        const label = info.get('label')
        const value = info.get('value')
        st[category] = (st[category] ?? 0) + 1
        st[`${category}.${action}`] = (st[`${category}.${action}`] ?? 0) + 1
        st[`${category}.${action}.${label}`] = (st[`${category}.${action}.${label}`] ?? 0) + 1
        st[`${category}.${action}.${label}.${value}`] = (st[`${category}.${action}.${label}.${value}`] ?? 0) + 1
    })
    return parseStatisticsInfo(st)
}

/**
 * 转换分渠道统计数据结构
 */
function parseStatisticsInfo(st) {
    return Object.keys(st).map(key => {
        return {
            date: new Date().toLocaleString('zh-CN').substring(0, 9),
            key,
            value: { num: st[key] }
        }
    })
}

/**
 * 生成日志文件名
 */
function genYesterdayLogFileName() {
    const beijingTime = new Date().toLocaleString('zh-CN')
    return beijingTime.substring(0, 9).replaceAll('/', '-') + '.log'
}

/**
 * 拆分日志
 * @param {*} accessLogPath 
 */
function splitLogFile(accessLogPath) {
    const accessLogFile = path.resolve(accessLogPath, 'access.log')
    const distFolder = path.join(accessLogPath, 'schedule');
    fse.ensureDirSync(distFolder);
    const distFile = path.join(distFolder, genYesterdayLogFileName());
    fse.ensureFileSync(distFile);
    fse.outputFileSync(distFile, "");

    fse.copySync(accessLogFile, distFile);

    fse.outputFileSync(accessLogFile, "");
}


function main() {
    const accessLogPath = '/work/test/nginx-1.22.0/logs'
    //每日凌点拆分日志
    // splitLogFile(accessLogPath)
    //在拆分日志后每日凌晨3点进行日志解析
    processLineByLine(accessLogPath + '/schedule/' + genYesterdayLogFileName())
    //定期删除过期的日志文件
    removeExpiredLogs(accessLogPath + '/schedule')

}

main()