var CustomBufferRule
let safetyFactorBitrate = 0.7
let safetyFactorBandwidth = 0.9
let lastBuffer
let lastIndex = 0
let segments = []

player.on("fragmentLoadingCompleted", function (data) {
    if (data.request.type === "InitializationSegment") return;
    let metric = {
        index: data.request.index + 1, //increment so we start at 1
        size: data.request.bytesTotal,
        dl_duration: data.request.requestEndDate.getTime() - data.request.firstByteDate.getTime()
    };
    segments.push(metric);
});

function getThroughputLastSegment() {
    if (segments.length > 0) {
        let lastSegment = segments[segments.length - 1]
        return lastSegment.size / lastSegment.dl_duration * 8 * safetyFactorBandwidth
    }
    return null
}

function log(msg1, msg2, factor, calc, limit = 1) {
    if (factor < (limit * 0.90)) {
        return `${msg1}(${factor.toFixed(2)}->${calc(factor).toFixed(2)})|`
    }
    if (factor > (limit * 1.1)) {
        return `${msg2}(${factor.toFixed(2)}->${calc(factor).toFixed(2)})|`
    }
    return ''
}

function weaken(x) {
    let constant = 1
    return 1 - constant + 2 * constant * (1 - Math.exp((Math.log(0.5) * x)))
}

function buffer(x) {
    if (x < 11) {
        return 1 / (1 + Math.exp(-0.9 * (x - 7)))
    } else {
        return 0.02 * Math.pow(x - 11, 2) + 0.9734
    }
}

function CustomBufferRuleClass() {
    let factory = dashjs.FactoryMaker
    let SwitchRequest = factory.getClassFactoryByName('SwitchRequest')
    let DashMetrics = factory.getSingletonFactoryByName('DashMetrics')
    let context = this.context
    let instance

    function setup() {
    }

    function getMaxIndex(rulesContext) {
        let dashMetrics = DashMetrics(context).getInstance()
        let streamInfo = rulesContext.getStreamInfo()
        const mediaInfo = rulesContext.getMediaInfo()
        const abrController = rulesContext.getAbrController()
        const throughputHistory = abrController.getThroughputHistory()

        let switchRequest = SwitchRequest(context).create()
        if (!rulesContext || !rulesContext.hasOwnProperty('getMediaInfo') || !rulesContext.hasOwnProperty('getMediaType') || !rulesContext.hasOwnProperty('useBufferOccupancyABR') ||
            !rulesContext.hasOwnProperty('getAbrController') || !rulesContext.hasOwnProperty('getScheduleController')) {
            return switchRequest;
        }

        let requests = dashMetrics.getHttpRequests('video')
        let index = parseInt(requests[requests.length - 1].url.split('dash')[1].replace('.m4s', ''))

        const bufferLength = dashMetrics.getCurrentBufferLevel('video')
        const throughputSafe = throughputHistory.getSafeAverageThroughput('video', false)
        const throughputLastSegment = getThroughputLastSegment();
        let switchReason = `${index - 1}|last(${Math.round(throughputLastSegment)})|avg(${Math.round(throughputSafe)})|`

        // network throughput
        let factorThroughput = throughputLastSegment / throughputSafe
        switchReason += log('drop', 'spike', factorThroughput, weaken)
        let throughput = throughputSafe * weaken(factorThroughput)

        // buffer size
        switchReason += log('lowBuffer', 'highBuffer', bufferLength, 11, buffer, 11)
        throughput = throughput * buffer(bufferLength, 11)

        let ql = abrController.getQualityForBitrate(mediaInfo, throughput, streamInfo.id)
        switchReason += `${Math.round(throughput)}->${ql}`

        if (lastIndex !== index) {
            console.log(switchReason)
        }

        switchRequest.quality = ql
        switchRequest.reason = switchReason
        lastBuffer = buffer
        lastIndex = index
        return switchRequest
    }

    instance = {
        getMaxIndex: getMaxIndex
    }

    setup()

    return instance
}

CustomBufferRuleClass.__dashjs_factory_name = 'CustomBufferRule'
CustomBufferRule = dashjs.FactoryMaker.getClassFactory(CustomBufferRuleClass)

