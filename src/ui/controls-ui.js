import { paramNames } from "../vcs-comp-conf";

export class ControlsUI {
  constructor(callbacks, initialSessionData) {
    let ids = [
      "rundownItems",
      "currentItemName",
      "prevBtn",
      "nextBtn",
      "pollQuestion",
      "togglePollOpenBtn",
      "togglePollResultBtn",
      "guestName",
      "guestLinkString",
      "copyGuestLinkBtn",
      "streamingRtmpUrl",
      "startStreamingBtn",
      "startRecordingBtn",
      "viewerLinkString",
      "copyViewerLinkBtn",
    ];
    this.uiElements = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) {
        console.error("Couldn't find element for id: ", id);
        continue;
      }
      this.uiElements[id] = el;
    }

    this.callbacks = callbacks;

    this.applySessionData(initialSessionData);

    const baseUrl = window.location.origin + window.location.pathname;
    this.guestUrl = `${baseUrl}?role=guest`;
    this.viewerUrl = `${baseUrl}?role=viewer`;
    this.uiElements.guestLinkString.innerText = this.guestUrl;
    this.uiElements.viewerLinkString.innerText = this.viewerUrl;

    this.uiElements.rundownItems.addEventListener(
      "input",
      this.onRundownItemsInput.bind(this)
    );
    this.uiElements.guestName.addEventListener(
      "change",
      this.onGuestNameChange.bind(this)
    );
    this.uiElements.streamingRtmpUrl.addEventListener(
      "change",
      this.onStreamingRtmpUrlChange.bind(this)
    );
    this.uiElements.prevBtn.addEventListener(
      "click",
      this.onPrevBtnClick.bind(this)
    );
    this.uiElements.nextBtn.addEventListener(
      "click",
      this.onNextBtnClick.bind(this)
    );
    this.uiElements.pollQuestion.addEventListener(
      "change",
      this.onPollQuestionChange.bind(this)
    );
    this.uiElements.togglePollOpenBtn.addEventListener(
      "click",
      this.onTogglePollOpen.bind(this)
    );
    this.uiElements.togglePollResultBtn.addEventListener(
      "click",
      this.onTogglePollResult.bind(this)
    );
    this.uiElements.copyGuestLinkBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(this.guestUrl).then(() => {
        console.log("copied");
      });
    });
    this.uiElements.copyViewerLinkBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(this.viewerUrl).then(() => {
        console.log("copied");
      });
    });
    this.uiElements.startRecordingBtn.addEventListener(
      "click",
      this.onToggleRecording.bind(this)
    );
    this.uiElements.startStreamingBtn.addEventListener(
      "click",
      this.onToggleLiveStreaming.bind(this)
    );
  }

  applySessionData(sd) {
    if (!sd) return;

    this.sessionData = { ...sd };

    const {
      [paramNames.RUNDOWN_ITEMS]: rundownItems,
      [paramNames.POLL_QUESTION]: pollQuestion,
    } = this.sessionData.vcsParams;

    this.uiElements.rundownItems.value = rundownItems.join("\n");

    this.uiElements.pollQuestion.value = pollQuestion;

    this.updateCurrentItem();
  }

  updateCurrentItem() {
    const {
      [paramNames.RUNDOWN_ITEMS]: rundownItems,
      [paramNames.RUNDOWN_POSITION]: rundownPosition,
    } = this.sessionData.vcsParams;

    const currentItemStr = rundownItems[rundownPosition] || "";

    this.uiElements.currentItemName.innerText = currentItemStr;
  }

  onRundownItemsInput(ev) {
    const value = ev.target.value;
    const lines = value.split("\n").filter((s) => s.trim().length > 0);

    this.callbacks.onUpdateSessionDataValue(
      "vcsParams",
      paramNames.RUNDOWN_ITEMS,
      lines
    );

    this.updateCurrentItem();
  }

  onPrevBtnClick(ev) {
    const { vcsParams } = this.sessionData;
    let value = vcsParams[paramNames.RUNDOWN_POSITION];
    if (value <= 0) return;

    value--;

    this.applySessionData(
      this.callbacks.onUpdateSessionDataValue(
        "vcsParams",
        paramNames.RUNDOWN_POSITION,
        value
      )
    );
  }

  onNextBtnClick(ev) {
    const { vcsParams } = this.sessionData;
    const numItems = vcsParams[paramNames.RUNDOWN_ITEMS].length;
    let value = vcsParams[paramNames.RUNDOWN_POSITION];

    if (value >= numItems - 1) return;

    value++;

    this.applySessionData(
      this.callbacks.onUpdateSessionDataValue(
        "vcsParams",
        paramNames.RUNDOWN_POSITION,
        value
      )
    );
  }

  onGuestNameChange(ev) {
    const value = ev.target.value;

    this.applySessionData(
      this.callbacks.onUpdateSessionDataValue(
        "vcsParams",
        paramNames.GUESTNAME,
        value
      )
    );
  }

  onStreamingRtmpUrlChange(ev) {
    const value = ev.target.value;

    this.callbacks.onUpdateStreamingConfig("rtmpUrl", value);
  }

  onTogglePollOpen(ev) {
    const f = !this.sessionData.interactions.pollOpen;

    this.uiElements.togglePollOpenBtn.innerText = f
      ? "Close poll for viewers"
      : "Open poll to viewers";

    this.applySessionData(
      this.callbacks.onUpdateSessionDataValue("interactions", "pollOpen", f)
    );
  }

  onTogglePollResult(ev) {
    const f = !this.sessionData.vcsParams[paramNames.SHOW_POLL_RESULT];

    this.uiElements.togglePollResultBtn.innerText = f
      ? "Hide poll result"
      : "Show poll result";

    this.applySessionData(
      this.callbacks.onUpdateSessionDataValue(
        "vcsParams",
        paramNames.SHOW_POLL_RESULT,
        f
      )
    );
  }

  onPollQuestionChange(ev) {
    const value = ev.target.value;

    this.applySessionData(
      this.callbacks.onUpdateSessionDataValue(
        "vcsParams",
        paramNames.POLL_QUESTION,
        value
      )
    );
  }

  onToggleRecording(ev) {
    const recording = this.callbacks.onToggleRecording();

    this.uiElements.startRecordingBtn.innerText = recording
      ? "Stop recording"
      : "Start recording";
  }

  onToggleLiveStreaming(ev) {
    const streaming = this.callbacks.onToggleLiveStreaming();

    this.uiElements.startStreamingBtn.innerText = streaming
      ? "Stop streaming"
      : "Start streaming";
  }
}
