(function () {
    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');

    var tracker = new tracking.ObjectTracker('face');
    tracker.setInitialScale(4);
    tracker.setStepSize(2);
    tracker.setEdgesDensity(0.1);

    tracking.track('#video', tracker, { camera: true });

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
                context.clearRect(0, 0, canvas.width, canvas.height);
                event.data.forEach(function (rect) {
                    context.strokeStyle = '#a64ceb';
                    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
                    context.font = '11px Helvetica';
                    context.fillStyle = "#fff";
                    context.fillText('x: ' + rect.x + 'px', rect.x + rect.width + 5, rect.y + 11);
                    context.fillText('y: ' + rect.y + 'px', rect.x + rect.width + 5, rect.y + 22);
                });
            });

            // re-enable tracker after 3 seconds
            console.log('scheduling tracker in 3 seconds');
            setTimeout(function () {
                trackerEnabled = true;
            }, 3000);
        }
    }
}())