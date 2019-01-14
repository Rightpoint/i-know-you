(function () {
    var liveVideo = document.getElementById('live-video');
    var videoOverlay = document.getElementById('video-overlay');
    var videoOverlayContext = videoOverlay.getContext('2d');

    var videoSnapshot = document.getElementById('video-snapshot');
    var videoSnapshotContext = videoSnapshot.getContext('2d');

    var tracker = new tracking.ObjectTracker('face');
    tracker.setInitialScale(4);
    tracker.setStepSize(0.5);
    tracker.setEdgesDensity(0.1);
    tracker.on('track', handleTrackerEvent);
    var trackerEnabled = true;
   
    var trackerTask = tracking.track(liveVideo, tracker, { camera: true });
    trackerTask.run();

    async function handleTrackerEvent(event) {
        if (!trackerEnabled) {
            // The tracker is disabled.
            return;
        }
        else if (event.data.length === 0) {
            // No faces were detected in this frame.
            return;
        }
        else {
            // Found a face
            log('Processing...');

            // Disable the Tracker
            trackerEnabled = false;

            // Draw Border Around the Face
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

            // Draw Snapshot
            videoSnapshotContext.drawImage(liveVideo, 0, 0, (videoOverlay.width / 3), (videoOverlay.height / 3));
            
            // Get the Image of the Person
            var imageData = videoSnapshot.toDataURL().replace('data:image/png;base64,', '');
            
            const response = await $.ajax({
                type: 'POST',
                url: "https://localhost:44380/api/face",
                data: JSON.stringify({ imageData: imageData }),
                contentType: 'application/json'
            });

            if (response.statusCode === 200) {
                // We know the identity
                var people = JSON.parse(response.reasonPhrase);
                people.forEach(person => {
                    log('Hi, ' + person + '!');
                });
            }
            else if (response.statusCode === 404) {
                // We found a face, but don't know the identity
                removeSnapshot();
                await openNewPersonModal(imageData);
                return;
            }
            else if (response.statusCode === 417) {
                // Face wasn't detected by Cognitive Services on the backend
                log('No face found.');
            }
            else if (response.statusCode === 429) {
                // Too many requests
                log('Too many requests.');
            }
            else {
                // Other error from the server
                log('Oops! An error occured.');
            }
            
            removeFaceBorder();

            // Re-enable the tracker every second (so we don't spam the server with calls)
            setTimeout(function () {
                videoOverlayContext.clearRect(0, 0, videoOverlay.width, videoOverlay.height);
                videoSnapshotContext.clearRect(0, 0, videoSnapshot.width, videoSnapshot.height);
                trackerEnabled = true;
            }, 1000);
        }
    }

    var consoleWindow = document.getElementById('console');
    function log(message) {
        // Log from top down (new messages go on top)
        consoleWindow.innerHTML = new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) + ': ' + message + '<br />' + consoleWindow.innerHTML;
    }

    var aspectRatio = (1 + (1 / 3));
    setScreenSize(liveVideo, videoOverlay, videoSnapshot, window.innerHeight, aspectRatio);
    window.onresize = function () {
        trackerTask.stop();
        setScreenSize(liveVideo, videoOverlay, videoSnapshot, window.innerHeight, aspectRatio);
        videoOverlayContext = videoOverlay.getContext('2d');
        trackerTask = tracking.track(liveVideo, tracker);
    }

    var btn = document.getElementById("btn-fullscreen");
    btn.onclick = function () {
        liveVideo.webkitRequestFullScreen();
    }

    function setScreenSize(liveVideo, videoOverlay, videoSnapshot, size, aspectRatio) {
        liveVideo.setAttribute("height", size);
        videoOverlay.setAttribute("width", (aspectRatio * size));
        videoOverlay.setAttribute("height", size);
        videoSnapshot.setAttribute("width", (aspectRatio * (size / 3)));
        videoSnapshot.setAttribute("height", size / 3);
    }

    function removeFaceBorder() {
        videoOverlayContext.clearRect(0, 0, videoOverlay.width, videoOverlay.height);
    }

    function removeSnapshot() {
        videoSnapshotContext.clearRect(0, 0, videoOverlay.width, videoOverlay.height);
    }

    async function openNewPersonModal(imageData) {
        // Stop the Tracker
        setTimeout(function () {
            trackerTask.stop();
        }, 1);

        // Instantiate a New Modal
        var modal = new tingle.modal({
            footer: true,
            stickyFooter: false,
            closeMethods: ['overlay', 'button', 'escape'],
            closeLabel: "Cancel",
            beforeClose: function() {
                trackerEnabled = true;
                trackerTask.run();
                return true;
            }
        });

        // Set the Modal Content
        modal.setContent(
            '<div>' +
                '<h1>We don\'t recognize you!</h1>' +
                '<div>If you would like to be recognized in the future, please enter your email below.</div>' +
                '<br/>' +
                '<div id="emailForm">' +
                    '<input type="text" id="theEmail" pattern="[a-zA-Z]{2,30}((@rightpoint.com)|(@raizlabs.com)){1}" maxlength="50" autocomplete="off" />' +
                '</div>' +
            '</div>'
        );

        // Submit Button
        modal.addFooterBtn('Submit', 'tingle-btn tingle-btn--primary tingle-btn--pull-right', async function() {
            // Save the user's email (if the email is valid)
            var email = document.getElementById('theEmail').value;
            $("#errorMessage").remove();
            if (email.trim().length === 0) {
                $("#emailForm").append("<span id=\"errorMessage\">&nbsp;&nbsp;Please enter your email.</span>");
            }
            else if ($('#theEmail')[0].checkValidity()) {
                const response = await addNewPerson(email, imageData);

                if (response.statusCode === 200) {
                    // Person successfully added
                    modal.close();
                    log('Hi, ' + response.reasonPhrase + '!');
                }
                else if (response.statusCode === 403) {
                    // Email passed validation on client, but not on server...
                    $("#emailForm").append("<span id=\"errorMessage\">&nbsp;&nbsp;Please enter a valid email.</span>");
                }
                else if (response.statusCode === 507) {
                    // This person has hit the maximum number of persisted faces.
                    modal.close();
                }
                else {
                    // Other error from the server
                    modal.close();
                    log('Add was unsuccessful.');
                }
            }
            else {
                $("#emailForm").append("<span id=\"errorMessage\">&nbsp;&nbsp;Please enter a valid email.</span>");
            }
        });

        // Cancel Button
        modal.addFooterBtn('Cancel', 'tingle-btn tingle-btn--default tingle-btn--pull-right', function() {
            modal.close();
        });

        // Open the Modal
        modal.open();

        // Close the modal after 20 seconds
        setTimeout(function () {
            modal.close();
        }, 20000);
    }

    async function addNewPerson(email, imageData) {
        const response = await $.ajax({
            type: 'PUT',
            url: "https://localhost:44380/api/face",
            data: JSON.stringify({ email: email, imageData: imageData }),
            contentType: 'application/json'
        });
        return response;
    }

}());