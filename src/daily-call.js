import DailyIframe from "@daily-co/daily-js";

import { makeServerLayoutFromSessionVcsParams } from "./stream-session-data";

export class DailyCall {
  constructor(url, userName, token, isHost, callbacks) {
    const joinProps = {
      url,
      userName,
    };

    if (token) {
      console.log("-- using meeting token --");
      joinProps.token = token;
    }

    const dailyConfig = {};
    if (isHost) {
      dailyConfig.camSimulcastEncodings = [
        {
          maxBitrate: 1 * 1000 * 1000,
          maxFramerate: 24,
        },
      ];
    }
    this.joinProps = joinProps;

    this.callFrame = DailyIframe.createCallObject({
      ...this.joinProps,
      dailyConfig,
    });
    this.callReady = false;

    this.callFrame.on("app-message", this.handleAppMessage.bind(this));
    this.callFrame.on(
      "participant-joined",
      this.handleParticipantJoined.bind(this)
    );
    this.callFrame.on("track-started", this.handleTrackStarted.bind(this));
    this.callFrame.on("track-stopped", this.handleTrackStopped.bind(this));

    this.callFrame.on(
      "recording-started",
      this.handleRecordingStarted.bind(this)
    );
    this.callFrame.on(
      "recording-stopped",
      this.handleRecordingStopped.bind(this)
    );
    this.callFrame.on("recording-error", this.handleRecordingError.bind(this));

    this.callbacks = callbacks;

    this.interactionResponseRecipient = null; // filled out when a control message is received
  }

  async join(isSender) {
    await this.callFrame.join({
      ...this.joinProps,
      audioSource: isSender,
      videoSource: isSender,
    });
    this.callReady = true;
  }

  startRecording(sessionData) {
    if (!this.callReady) return;
    if (this.recording) return;

    this.callFrame.startRecording({
      layout: makeServerLayoutFromSessionVcsParams(sessionData.vcsParams, true),
    });
    console.log("recording started");
    this.recording = true;
  }

  stopRecording() {
    if (!this.callReady) return;
    if (!this.recording) return;

    this.callFrame.stopRecording();
    this.recording = false;
  }

  startLiveStreaming(sessionData, streamingConf) {
    if (!this.callReady) return;
    if (this.liveStreaming) return;

    const { rtmpUrl } = streamingConf;
    if (!rtmpUrl) {
      console.error("rtmpUrl not specified");
      return;
    }

    this.callFrame.startLiveStreaming({
      rtmpUrl,
      layout: makeServerLayoutFromSessionVcsParams(sessionData.vcsParams, true),
    });
    console.log("live streaming started");
    this.liveStreaming = true;
  }

  stopLiveStreaming() {
    if (!this.callReady) return;
    if (!this.liveStreaming) return;

    this.callFrame.stopLiveStreaming();
    this.liveStreaming = false;
  }

  broadcastVcsParams(vcsParams) {
    if (!this.callReady) {
      console.error("call not ready");
      return;
    }
    const data = {
      vcsParams,
    };

    try {
      this.callFrame.sendAppMessage(data, "*");

      if (this.recording || this.liveStreaming) {
        const layout = makeServerLayoutFromSessionVcsParams(vcsParams);
        if (this.recording) {
          this.callFrame.updateRecording({ layout });
          console.log("updating recording: ", { layout });
        }
        if (this.liveStreaming) {
          this.callFrame.updateLiveStreaming({ layout });
        }
      }

      // keep a copy of the data in the host's userData object.
      // this gets broadcast to viewer-only sessions when they join.
      this.callFrame.setUserData(data);
    } catch (e) {
      console.error("** Exception in broadcastVcsParams: ", e);
    }
  }

  broadcastInteractionControl(interactionControl) {
    if (!this.callReady) {
      console.error("call not ready");
      return;
    }

    this.callFrame.sendAppMessage(
      {
        interactionControl,
      },
      "*"
    );
  }

  sendInteractionResponse(data) {
    if (
      !this.callFrame ||
      !this.callReady ||
      !this.interactionResponseRecipient
    ) {
      console.error(
        "** sendInteractionResponse: callframe or recipient not available",
        this.interactionResponseRecipient
      );
      return;
    }

    this.callFrame.sendAppMessage(
      {
        interactionResponse: data,
      },
      this.interactionResponseRecipient
    );
  }

  handleAppMessage(msg) {
    console.log("app message: ", msg, msg.data);
    let data;
    if ((data = msg?.data?.vcsParams)) {
      this.callbacks.onRemoteVcsParams(data);
    }
    if ((data = msg?.data?.interactionControl)) {
      this.interactionResponseRecipient = msg.fromId;

      this.callbacks.onRemoteInteractionControl(data);
    }
    if ((data = msg?.data?.interactionResponse)) {
      this.callbacks.onRemoteInteractionResponse(data);
    }
  }

  handleParticipantJoined(event) {
    console.log("participant joined: ", event);

    // for viewer-only sessions, we get the latest session data from the host via userData
    const vcsParams = event.participant.userData?.vcsParams;

    this.callbacks.onRemoteParticipantJoined(
      event.participant.session_id,
      vcsParams
    );
  }

  handleTrackStarted(event) {
    if (
      event &&
      !event.participant.local &&
      event.track &&
      "video" === event.track.kind
    ) {
      this.callbacks.onRemoteParticipantVideoTrackAvailable({
        track: event.track,
        participantSessionId: event.participant.session_id,
        userName: event.participant.user_name,
      });
    }
  }

  handleTrackStopped(event) {
    if (event && event.track && "video" === event.track.kind) {
      console.log("track stopped event: ", event);
      this.callbacks.onRemoteParticipantVideoTrackLost({
        track: event.track,
        participantSessionId: event.participant
          ? event.participant.session_id
          : null,
      });
    }
  }

  handleRecordingStarted() {
    console.log("recording started");
  }

  handleRecordingStopped() {
    console.log("recording stopped");
  }

  handleRecordingError(event) {
    console.error("recording error: ", event);
  }
}
