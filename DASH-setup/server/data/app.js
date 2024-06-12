const path = require('path')
const express = require('express')
const log4js = require("log4js")
const exec = require('child_process').exec
const sleep = require('sleep-promise')
const fs = require('fs')

let LOGGER = require('log4js').getLogger()
let logTime = 0
let encTmp = process.cwd() + '/public' + '/encode_temp/'
let previousIndex = 0
let previousBitrate = 0

const JSON_DATA = fs.readFileSync('static_data.json')
const QUALITY_LEVELS = JSON.parse(JSON_DATA).quality_levels
const RESOLUTIONS = JSON.parse(JSON_DATA).resolutions
const FFMPEG_PRESETS = JSON.parse(JSON_DATA).presets
const CRFS = JSON.parse(JSON_DATA).crfs

let LEVELS = []
for (let level in QUALITY_LEVELS) {
    LEVELS.push(parseInt(level))
}

// video specific
const SEGMENT_COUNT = 183
const FRAMERATE = 24
const SEGMENT_LENGTH = 4000 //4004 for 29.97
const MAX_BITRATE = 20000

let name = ''
let abr = ''
let savePath = ''
let encodeSegment, dashSegment
let LOGencodingTimes = new Map()
let LOGdashingTimes = new Map()
let LOGsegmentSizes = new Map()
let LOGsegmentSentQualities = new Map()
let LOGsegmentRequestedQualities = new Map()
let LOGsegmentDownloadStartTimes = new Map()

let dashed = new Set()

const app = express()
//new run
app.get('/', (req, res, next) => {
    name = req.query.name
    abr = req.query.abr
    savePath = `logs/${abr}/${name}/`
    let filename = `server_${abr}.log`
    fs.access(savePath + filename, fs.constants.F_OK, (err) => {
        if (err) {
            fs.writeFile(savePath + filename, '', (err) => {
                if (err) LOGGER.info(err)
            })
        }
    });
    log4js.configure({
        appenders: {fileAppender: {type: 'file', filename: savePath + filename}},
        categories: {default: {appenders: ['fileAppender'], level: 'info'}}
    })
    //log4js.configure({
    //    appenders: {console: {type: 'console'}},
    //    categories: {default: {appenders: ['console'], level: 'info'}}
    //});
    LOGGER.info(name)
    LOGGER.info(abr)
    logTime = Date.now()
    LOGencodingTimes = new Map()
    LOGdashingTimes = new Map()
    LOGsegmentSizes = new Map()
    LOGsegmentSentQualities = new Map()
    LOGsegmentRequestedQualities = new Map()
    LOGsegmentDownloadStartTimes = new Map()
    dashed = new Set()
    next()
})

//catch calls for segments (.m4s files)
app.get('/videos/*.m4s', async (req, res, next) => {
    await handleM4S(req, res).catch(() => next())
    // after last segment save all logs and clear tmp folder
    if (req.url.includes(`${SEGMENT_COUNT}.m4s`)) {
        await sleep(5000)
        LOGGER.info('save logs')
        saveLog(LOGsegmentDownloadStartTimes, `downloadStartTimes_${logTime}`)
        saveLog(LOGsegmentSizes, `segmentSizes_${logTime}`)
        if (LOGsegmentSentQualities.size !== 0) {
            LOGGER.info('save extra logs')
            saveLog(LOGsegmentSentQualities, `sent_${logTime}`)
            saveLog(LOGsegmentRequestedQualities, `requested_${logTime}`)
            saveLog(LOGencodingTimes, `encodingTimes_${logTime}`)
            saveLog(LOGdashingTimes, `dashingTimes_${logTime}`)
        }
        let files = fs.readdirSync(encTmp)
        LOGGER.info(`delete old files`)
        for (const file of files) {
            fs.unlink(path.join(encTmp, file), () => {
            })
        }
    }
})

app.use(express.static(path.join(__dirname, 'public')))

const PORT = process.env.PORT || 3000
app.listen(PORT)

function handleM4S(req, res) {
    LOGGER.info(`request ${req.path.replace('/videos/', '')}`)
    let name = path.basename(req.path, '.m4s')
    let data = name.split('_')
    let index = Number(data[4].split("dash")[1])
    let bitrate = Number(data[3].split('k')[0])

    //should not occur
    if (index > SEGMENT_COUNT) {
        LOGGER.info('segment index too damn high!')
        res.sendStatus(404)
        return Promise.resolve()
    }
    LOGsegmentRequestedQualities.set(index, QUALITY_LEVELS[bitrate])

    if (req.path.includes('runtime')) {
        return handleM4SRuntime(req, res, name, index, bitrate)
    }

    //send pre-rendered segments for 'default' and 'pre'
    LOGSegmentSize(`${process.cwd()}/public${req.path}`, index)
    LOGsegmentDownloadStartTimes.set(index, Date.now())
    return Promise.reject()
}

function handleM4SRuntime(req, res, name, index, bitrate) {
    //send pre-rendered for very first segment
    if (index === 1) {
        let files = fs.readdirSync(encTmp)
        LOGGER.info('delete old files')
        for (const file of files) {
            fs.unlink(path.join(encTmp, file), () => {
            })
        }
        if (!name.includes('_3840_')) {
            processSegment(index + 1, bitrate, '(predictive)')
        }
        processSegment(index + 1, getRescueBitrate(bitrate), '(rescue)')
        loggStuffFor4k(index, req.path, ' (first segment)', bitrate)
        previousBitrate = bitrate
        return Promise.reject()
    }

    //send pre-rendered for 4k request
    if (name.includes('_3840_')) {
        processSegment(index + 1, getRescueBitrate(bitrate), '(rescue)')
        loggStuffFor4k(index, req.path, ' (4k source)', bitrate)
        previousBitrate = MAX_BITRATE
        return Promise.reject()
    }

    //first segment after 4k streaming
    if (previousBitrate === MAX_BITRATE && index !== previousIndex) {
        LOGGER.info('first segment (perhaps first after max bitrate)')
        sendFile(res, index, getRescueBitrate(MAX_BITRATE), "(first after 4k -> rescue)")
        processSegment(index + 1, bitrate, '(predictive)')
        processSegment(index + 1, getRescueBitrate(bitrate), '(rescue)')
        previousBitrate = bitrate
        previousIndex = index
        return Promise.resolve()
    }

    //requested bitrate way lower
    if (bitrate * 2 < previousBitrate) {
        LOGGER.info('Wanting way smaller bitrate!')
        sendFile(res, index, getRescueBitrate(previousBitrate), "(request difference -> rescue)")
        processSegment(index + 1, bitrate, '(predictive)')
        processSegment(index + 1, getRescueBitrate(bitrate), '(rescue)')
        previousBitrate = bitrate
        previousIndex = index
        return Promise.resolve()
    }

    //abandoned
    // if (previousIndex === index) {
    //     LOGGER.info(`abandoned loading of ${index}_${previousBitrate}`)
    //     sendFile(res, index, getRescueBitrate(previousBitrate), '(RESCUE)')
    //     processSegment(index, getRescueBitrate(getRescueBitrate(previousBitrate)), '(c)')
    //     processSegment(index + 1, bitrate, '(predictive)')
    //     processSegment(index + 1, getRescueBitrate(bitrate), '(rescue)')
    //     previousBitrate = bitrate
    //     return Promise.resolve()
    // }

    //normal case
    sendFile(res, index, previousBitrate, '(as req/pred)')
    processSegment(index + 1, bitrate, '(predictive)')
    processSegment(index + 1, getRescueBitrate(bitrate), '(rescue)')
    previousIndex = index
    previousBitrate = bitrate
    return Promise.resolve()
}

function processSegment(index, bitrate, message) {
    if (index > SEGMENT_COUNT) return
    if (bitrate === -1) {
        LOGGER.info('bitrate too low, skip rescue encode')
        return
    }
    let [encodeSegment, dashSegment] = createCommands(index, bitrate)
    let timer = process.hrtime.bigint()
    LOGGER.info(`encode start ${index}_${bitrate}`)
    exec(encodeSegment, (err) => {
        if (err) console.error(err)
        timer = convertTime(timer)
        LOGencodingTimes.set(index + '-' + bitrate, timer)
        LOGGER.info(`encode end ${index}_${bitrate} ${message} in ${timer}ms`)

        timer = process.hrtime.bigint()
        LOGGER.info(`dash start ${index}_${bitrate}`)
        exec(dashSegment, (err) => {
            if (err) console.error(err)
            timer = convertTime(timer)
            LOGdashingTimes.set(index + '-' + bitrate, timer)
            LOGGER.info(`dash end ${index}_${bitrate} ${message} in ${timer}ms`)
            dashed.add(index + '_' + bitrate)
        })
    })
}

function loggStuffFor4k(index, path, message, bitrate) {
    LOGsegmentSentQualities.set(index, QUALITY_LEVELS[bitrate])
    LOGGER.info(`sending ${index}_${bitrate} ${message}`)
    LOGSegmentSize(process.cwd() + '/public' + path, index)
    LOGsegmentDownloadStartTimes.set(index, Date.now())
}

function createCommands(index, bitrate) {
    let resolution = RESOLUTIONS[bitrate]
    let crf = CRFS[bitrate]
    encodeSegment = 'ffmpeg -y -v error -i '
        + encTmp + 'ToS/dash' + index + '.mp4'
        + ' -c:v libx264 -tune film -x264opts no-scenecut -r '
        + FRAMERATE + ' -g ' + FRAMERATE * 4
        + ' -bf 3 -preset ' + FFMPEG_PRESETS[resolution]
        + ' -crf ' + crf + ' -maxrate ' + bitrate + 'k -bufsize ' + (bitrate * 2)
        + 'k -vf scale=' + resolution + ':-2 '
        + encTmp + index + '_' + bitrate + '.mp4'

    //shell command for dash segment creation
    dashSegment = `MP4Box -quiet -dash ${SEGMENT_LENGTH} -segment-name %s_dash -rap -frag-rap -v -bs-switching inband -profile "dashavc264:live" -moof-sn ${index - 1} -tfdt ${(index - 1) * 4} ${encTmp}${index}_${bitrate}.mp4 -out ${encTmp}playlist.mpd`
    return [encodeSegment, dashSegment]
}

async function sendFile(res, index, bitrate, message) {
    let wait = 0;
    while (!dashed.has(index + '_' + bitrate)) {
        if (wait > 30000) {
            LOGGER.info(`Waited too long! ${index} ${bitrate}`)
            return
        }
        wait += 5
        await sleep(5)
    }
    LOGGER.info(`sending ${index}_${bitrate} (${wait}) ${message}`)
    LOGsegmentDownloadStartTimes.set(index, Date.now())
    LOGencodingTimes.set(index, LOGencodingTimes.get(index + '-' + bitrate))
    LOGSegmentSize(encTmp + index + '_' + bitrate + '_dash1.m4s', index)
    LOGsegmentSentQualities.set(index, QUALITY_LEVELS[bitrate])
    res.sendFile(encTmp + index + '_' + bitrate + '_dash1.m4s')
}

function LOGSegmentSize(name, index) {
    const stats = fs.statSync(name)
    LOGsegmentSizes.set(index, stats.size)
}

function saveLog(log, filename) {
    let jsonObject = {}
    log.forEach((value, key) => {
        jsonObject[key] = value
    })
    fs.writeFile(savePath + filename + '.json', JSON.stringify(jsonObject), (err) => {
        if (err) LOGGER.info(err)
    })
}

function convertTime(startTime) {
    return Number((process.hrtime.bigint() - startTime) / BigInt(1000000))
}

function getRescueBitrate(bitrate) {
    if (bitrate === 314) return -1
    let target = bitrate / 3
    for (let level of LEVELS) {
        if (target < level) return level
    }
    return -1
}
