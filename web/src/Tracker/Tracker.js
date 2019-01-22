import React, { Component } from 'react';
import axios from 'axios';
import './Tracker.css';

class Tracker extends Component {
  tracker = null;
  task = null;
  trackerEnabled = true;
  aspectRatio = (1 + (1 / 3));

  setScreenSize(liveVideo, screenshotCanvas, size, aspectRatio) {
    liveVideo.setAttribute("width", (aspectRatio * size));
    liveVideo.setAttribute("height", size);
    screenshotCanvas.setAttribute("width", (aspectRatio * size));
    screenshotCanvas.setAttribute("height", size);
  }

  async handleTrackerEvent(event) {
    if (!this.trackerEnabled) {
      // The tracker is disabled.
    }
    else if (event.data.length === 0) {
      // No faces were detected in this frame.
      this.props.setIdle();
    }
    else {
      // Found a Face

      // Disable the Tracker
      this.trackerEnabled = false;

      // Take Screenshot
      this.refs.screenshotCanvas.getContext('2d').drawImage(this.refs.liveVideo, 0, 0, (this.refs.liveVideo.width), (this.refs.liveVideo.height));

      // Get the Image of the Person
      var imageData = this.refs.screenshotCanvas.toDataURL().replace('data:image/png;base64,', '');

      // Get the response from the backend
      const response = (await axios.post('https://localhost:44380/api/face', { imageData: imageData })).data;
      
      var found = false;
      if (response.statusCode === 200) {
        // We know the identity
        var people = JSON.parse(response.reasonPhrase);
        if (people.length === 1) {
          found = true;
          this.props.setActive(people[0]);
        }
      }
      else if (response.statusCode === 404) {
        // We found a face, but don't know the identity
        found = true;
        this.task.stop();
        this.props.goToRegistrationPage(imageData);
      }
      else if (response.statusCode === 417) {
        // Face wasn't detected by Cognitive Services on the backend
      }
      else if (response.statusCode === 429) {
        // Too many requests
      }
      else {
        // Other error from the server
      }

      if (!found) {
        this.props.setIdle();
      }

      // Re-enable the tracker every second (so we don't spam the server with calls)
      setTimeout(() => { this.trackerEnabled = true }, 1000);
    }
  }

  resizeLiveVideo = () => {
    this.setScreenSize(this.refs.liveVideo, this.refs.screenshotCanvas, window.innerHeight, this.aspectRatio);
  }

  componentDidMount() {
    this.resizeLiveVideo();
    window.addEventListener("resize", this.resizeLiveVideo());

    // Initialize the Tracker
    this.tracker = new window.tracking.ObjectTracker('face');
    this.tracker.setInitialScale(4);
    this.tracker.setStepSize(0.5);
    this.tracker.setEdgesDensity(0.1);
    this.tracker.on('track', (event) => this.handleTrackerEvent(event));
    this.task = window.tracking.track(this.refs.liveVideo, this.tracker, { camera: true });
    this.task.run();
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.resizeLiveVideo());
  }

  render() {
    return (
      <div>
        <video id="liveVideo" ref="liveVideo" preload="true" autoPlay loop muted></video>
        <canvas id="screenshotCanvas" ref="screenshotCanvas"></canvas>
      </div>
    );
  }

}

export default Tracker;
