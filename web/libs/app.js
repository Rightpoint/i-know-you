(function () {
    var liveVideo = document.getElementById('live-video');
    var videoOverlay = document.getElementById('video-overlay');
    var videoOverlayContext = videoOverlay.getContext('2d');

    var videoSnapshot = document.getElementById('video-snapshot');
    var videoSnapshotContext = videoSnapshot.getContext('2d');

    var tracker = new tracking.ObjectTracker('face');
    tracker.setInitialScale(4);
    tracker.setStepSize(2);
    tracker.setEdgesDensity(0.1);

    tracking.track('#live-video', tracker, { camera: true });

    var trackerEnabled = true;
    tracker.on('track', handleTrackerEvent);

    function handleTrackerEvent(event) {
        if (!trackerEnabled) return;

        if (event.data.length === 0) {
            // no faces were detected in this frame.
        } else {
            console.log('found a face!');

            // disable tracker
            trackerEnabled = false;
            console.log('tracker disabled');

            // output face data
            event.data.forEach(function (data) {
                videoOverlayContext.clearRect(0, 0, videoOverlay.width, videoOverlay.height);
                event.data.forEach(function (rect) {
                    videoOverlayContext.strokeStyle = '#a64ceb';
                    videoOverlayContext.strokeRect(rect.x, rect.y, rect.width, rect.height);
                    videoOverlayContext.font = '11px Helvetica';
                    videoOverlayContext.fillStyle = "#fff";
                    videoOverlayContext.fillText('x: ' + rect.x + 'px', rect.x + rect.width + 5, rect.y + 11);
                    videoOverlayContext.fillText('y: ' + rect.y + 'px', rect.x + rect.width + 5, rect.y + 22);
                });
            });

            // draw snapshot
            videoSnapshotContext.drawImage(liveVideo, 0, 0, videoOverlay.width, videoOverlay.height);

            // re-enable tracker after 3 seconds
            console.log('scheduling tracker in 3 seconds');
            setTimeout(function () {
                trackerEnabled = true;
                console.log('tracker watching...');
            }, 3000);
        }
    }
}())