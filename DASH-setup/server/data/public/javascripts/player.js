const intervalLength = 100; // in ms
const initialBufferLevel = 12;
let player = dashjs.MediaPlayer().create();
let qualityLog = [];
let segmentLog = [];
let playbackLog = [];
let qualityChangeLog = [];
let bufferStatusLog = [];
let abandonedLog = [];
let playbackWaitingLog = [];
let eventsLog = [];
let playbackErrorLog = [];
let metricInterval;
let isPlaying = 0;
let initialStart = true;
let qualityChangeRendered;
let playbackTimeUpdated;
let periodStart;
let fragmentLoadingAbandoned;
let bufferStateChanged;
let qualityChangeRequested;
let playbackWaiting;

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    let regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    let results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function handleCustomAbr() {
    console.log('!!!customAbr!!!');
    player.updateSettings({
        'streaming': {
            abr: {
                useDefaultABRRules: false
            }
        }
    });
    player.addABRCustomRule('qualitySwitchRules', 'customBufferRule', CustomBufferRule);
}

window.onload = function () {
    let videoUrl = "/videos/" + getUrlParameter('vid');
    // player.updateSettings({'debug': {logLevel: dashjs.Debug.LOG_LEVEL_DEBUG}});
    player.updateSettings({'debug': {dispatchEvent: true}});
    player.updateSettings({
        'streaming': {
            buffer: {
                fastSwitchEnabled: false,
                stableBufferTime: 20,
                bufferTimeAtTopQuality: 20,
                bufferTimeAtTopQualityLongForm: 20,
            },
            abr: {
                ABRStrategy: getUrlParameter('abr'),
                bandwidthSafetyFactor: 1.0,
                additionalAbrRules: {
                    droppedFramesRule: false,
                }
            }
        }
    });
    if (getUrlParameter('abr') === 'abrCustom') {
        handleCustomAbr();
    }
    player.initialize(document.querySelector("#videoPlayer"), videoUrl, false);
    metricInterval = setInterval(function () {
        let dashMetrics = player.getDashMetrics();
        let metric = {
            timeStamp: Date.now(),
            bufferLevel: dashMetrics.getCurrentBufferLevel('video'),
            qualityLevel: player.getQualityFor("video"),
            playedTime: player.time
        };
        if (metric.bufferLevel >= initialBufferLevel && initialStart) {
            console.log("start playback");
            player.play();
            isPlaying = 1;
            initialStart = false;
        }
        qualityLog.push(metric);
    }, intervalLength)
};

player.on("fragmentLoadingCompleted", function (data) {
    if (data.request.type === "InitializationSegment") return;
    let metric = {
        segmentIndex: data.request.index + 1, //increment so we start at 1
        segmentSize: data.request.bytesTotal,
        segmentSizeLoaded: data.request.bytesLoaded,
        segmentQualityLevel: data.request.quality,
        request_time: data.request.requestStartDate,
        dl_start: data.request.firstByteDate,
        dl_end: data.request.requestEndDate
    };
    segmentLog.push(metric);
    // if (player.time() < 700) {
    //     player.seek(720);
    // }
});

// player.on("fragmentLoadingAbandoned", function (data) {
//     fragmentLoadingAbandoned = Date.now();
//     let metric = {
//         timeStamp: fragmentLoadingAbandoned,
//         segmentIndex: data.request.index + 1, //increment so we start at 1
//         segmentSize: data.request.bytesTotal,
//         segmentSizeLoaded: data.request.bytesLoaded
//     };
//     abandonedLog.push(metric);
// });

player.on("qualityChangeRendered", function (data) {
    qualityChangeRendered = Date.now();
    let metric = {
        timeStamp: qualityChangeRendered,
        oldQuality: data.oldQuality,
        newQuality: data.newQuality
    };
    qualityChangeLog.push(metric);
});

player.on("qualityChangeRequested", function (data) {
    qualityChangeRequested = Date.now();
    let metric = {
        timeStamp: qualityChangeRequested,
        reason: data.reason
    };
    qualityChangeLog.push(metric);
});

// player.on("bufferStateChanged", function (data) {
//     bufferStateChanged = Date.now();
//     let metric = {
//         timeStamp: bufferStateChanged,
//         data: data.state
//     };
//     bufferStatusLog.push(metric);
// });

player.on("playbackTimeUpdated", function (data) {
    playbackTimeUpdated = Date.now();
    let metric = {
        timeStamp: playbackTimeUpdated,
        timeRemaining: data.timeToEnd,
        timePlayed: data.time
    };
    playbackLog.push(metric);
});

player.on("playbackEnded", function () {
    console.log("end playback")
    clearInterval(metricInterval);
});

// player.on("playbackStalled", function (data) {
//     playbackWaitingLog.push(data);
// })

// player.on("playbackWaiting", function (data) {
//     playbackWaiting = Date.now();
//     let metric = {
//         timeStamp: playbackWaiting,
//         timePlayed: data.playingTime
//     };
//     playbackWaitingLog.push(metric);
// })

player.on("log", function (data) {
    let log = Date.now();
    let metric = {
        timeStamp: log,
        message: data.message
    };
    eventsLog.push(metric);
})

// player.on("playbackError", function (data) {
//     let playbackError = Date.now();
//     let metric = {
//         timeStamp: playbackError,
//         message: data
//     };
//     playbackErrorLog.push(metric);
// })
