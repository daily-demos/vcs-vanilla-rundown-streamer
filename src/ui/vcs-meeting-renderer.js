/*
  This non-TS class is pulled from the layout-control example.

  It manages a VCS renderer and provides methods to connect meeting tracks, etc.
*/

const MAX_VIDEO_INPUT_SLOTS = 20;
const LOCAL_VIDEO_INPUT_ID = "livecam0";

export default class VcsMeetingRenderer {
  constructor(comp, rootEl, viewportSize, defaultParams, opts) {
    if (!comp || typeof comp.startDOMOutputAsync !== "function") {
      console.error("VCSMeetingRenderer constructor needs a VCS composition");
      return;
    }
    this.comp = comp;
    this.getAssetUrlCb = opts && opts.getAssetUrlCb ? opts.getAssetUrlCb : null;

    console.log("initializing VCS output for root element: ", rootEl);

    this.rootEl = rootEl;

    // viewportSize is the render size used by VCS.
    // for video layers, this doesn't affect resolution, as they are rendered as actual DOM elements.
    // for graphics, this sets the size of the canvas element.
    this.viewportSize = viewportSize || { w: 1280, h: 720 };

    console.log(
      "viewport size, default params: ",
      this.viewportSize,
      defaultParams
    );
    this.defaultParams = defaultParams;

    this.fps = 30;

    this.recomputeOutputScaleFactor();

    this.paramValues = {};
    this.activeVideoInputSlots = [];

    for (let i = 0; i < MAX_VIDEO_INPUT_SLOTS; i++) {
      this.setActiveVideoInput(i, false);
    }
    this.setActiveVideoInput(0, true, LOCAL_VIDEO_INPUT_ID);
  }

  recomputeOutputScaleFactor() {
    const displayW = this.rootEl.clientWidth;
    const displayH = this.rootEl.clientHeight;
    if (!displayW || !displayH) return;

    const asp = this.viewportSize.w / this.viewportSize.h;

    if (asp >= 1) {
      // fit landscape
      this.scaleFactor = displayW / this.viewportSize.w;
    } else {
      // fit portrait
      this.scaleFactor = displayH / this.viewportSize.h;
    }
  }

  rootDisplaySizeChanged() {
    this.recomputeOutputScaleFactor();

    if (this.vcsApi) {
      this.vcsApi.setScaleFactor(this.scaleFactor);
    }
  }

  async setupDefaultSources(useLocalVideo) {
    console.log("--setup default sources start--");
    const videoInputElements = [];

    if (useLocalVideo) {
      const liveVideoEl = await this.setupLiveVideo();

      console.log("got local video element: ", liveVideoEl);

      this.localVideoSlotItem = videoInputElements[0] = {
        id: LOCAL_VIDEO_INPUT_ID,
        element: liveVideoEl,
        displayName: "",
      };
    }

    const testImages = await this.loadTestImages();

    this.sources = {
      videoSlots: videoInputElements,
      assetImages: testImages,
    };
    console.log("--setup default sources end--");
  }

  placeVideoSourceInDOM(el, trackId) {
    // place element in DOM so it gets updates
    el.setAttribute("style", "display: none;");
    if (trackId) {
      el.setAttribute("data-video-remote-track-id", trackId);
    }
    this.rootEl.appendChild(el);
  }

  async setupLiveVideo() {
    let liveVideoEl;

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      console.log("got local mediaStream: ", mediaStream);
      this.mediaStream = mediaStream;

      liveVideoEl = document.createElement("video");
      liveVideoEl.setAttribute("muted", true);
      liveVideoEl.setAttribute("autoplay", true);
      liveVideoEl.setAttribute("playsinline", true);
      liveVideoEl.setAttribute("controls", false);
      liveVideoEl.srcObject = mediaStream;

      this.placeVideoSourceInDOM(liveVideoEl);
    } catch (e) {
      console.error("** getUserMedia failed: ", e);
      alert("Live video not available, getUserMedia failed:\n\n" + e);
    }
    return liveVideoEl;
  }

  async loadTestImages() {
    return {}; // --
    /*
    const exampleAssets = [
      { name: "test_square.png", file: "test_square_320px.png" },
      { name: "emoji_raised_hand.png", file: "raised-hand_270b.png" },
      {
        name: "daily-logo-primary-darkground.png",
        file: "daily-logo-primary-darkground.png",
      },
    ];

    const promises = [];
    for (const ea of exampleAssets) {
      promises.push(
        new Promise((resolve, reject) => {
          const img = new Image();

          img.onload = () => {
            resolve({ name: ea.name, image: img });
          };
          img.onerror = () => {
            const msg = `Image load failed, asset ${ea.file}`;
            console.error(msg);
            reject(new Error(msg));
          };
          img.src = `res/test-assets/${ea.file}`;
        })
      );
    }

    const results = await Promise.all(promises);
    const imagesByName = {};
    for (const item of results) {
      imagesByName[item.name] = item.image;
      console.log("loaded test image: ", item.name);
    }
    return imagesByName;
    */
  }

  async start({ useLocalVideo = true, viewportSize, params }) {
    if (!this.comp) return;

    if (viewportSize) this.viewportSize = viewportSize;
    if (params) this.defaultParams = params;

    if (!this.sources) {
      await this.setupDefaultSources(useLocalVideo);
    }

    let enablePreload = true;

    if (this.vcsApi) {
      this.vcsApi.stop();

      enablePreload = false; // don't preload again
    }

    console.log(
      "starting VCS output",
      this.viewportSize,
      this.sources,
      this.getAssetUrlCb
    );

    this.vcsApi = await this.comp.startDOMOutputAsync(
      this.rootEl,
      this.viewportSize.w,
      this.viewportSize.h,
      this.sources,
      {
        updateCb: this.compUpdated.bind(this),
        errorCb: this.onError.bind(this),
        getAssetUrlCb: this.getAssetUrlCb,
        fps: this.fps,
        scaleFactor: this.scaleFactor,
        enablePreload,
      }
    );

    this.sendActiveVideoInputSlots();

    if (this.defaultParams) {
      for (const key in this.defaultParams) {
        this.sendParam(key, this.defaultParams[key]);
      }
    }

    this.rootDisplaySizeChanged();
  }

  stop() {
    console.log("----- VCS composition stop ----", this.vcsApi);
    if (!this.vcsApi) return;

    this.vcsApi.stop();
  }

  onError(error) {
    console.error("VCS composition error: ", error);
  }

  compUpdated() {
    //console.log("comp updated");
  }

  toggleSimulatedParticipantAtIndex(idx, active, img) {
    const inputId = `sim${idx}`;
    const inputDisplayName = `Simulated ${idx + 1}`;

    this.setActiveVideoInput(idx, active, inputId, inputDisplayName, false);

    const prevSlots = this.sources.videoSlots;
    const newSlots = [];

    let c = 0;
    if (this.localVideoSlotItem) {
      newSlots[c++] = this.localVideoSlotItem;
    }

    for (let i = c; i < prevSlots.length; i++) {
      newSlots[i] = prevSlots[i];
    }

    if (active) {
      newSlots[idx] = {
        id: inputId,
        displayName: inputDisplayName,
        element: img,
      };
    } else {
      newSlots[idx] = {
        id: "",
      };
    }

    this.sources.videoSlots = newSlots;
    this.sendUpdateImageSources();

    this.sendActiveVideoInputSlots();
  }

  setActiveVideoInput(idx, active, id, name, isScreenshare) {
    this.activeVideoInputSlots[idx] = {
      id: id || "",
      active: !!active,
      type: isScreenshare ? "screenshare" : "camera",
      displayName: name || "Participant " + (idx + 1),
    };
  }

  sendActiveVideoInputSlots() {
    if (!this.vcsApi) return;

    const arr = [];
    for (let i = 0; i < this.activeVideoInputSlots.length; i++) {
      let obj = this.activeVideoInputSlots[i];
      if (obj.active) {
        obj = { ...obj };
        arr.push(obj);
      } else {
        arr.push(false);
      }
    }

    this.vcsApi.setActiveVideoInputSlots(arr);
  }

  sendParam(paramId, value) {
    if (!this.vcsApi) return;

    this.vcsApi.setParamValue(paramId, value);

    // retain a copy of param values so we can reset renderer to the same state
    this.paramValues[paramId] = value;
  }

  sendUpdateImageSources() {
    if (!this.vcsApi) return;

    this.vcsApi.updateImageSources(this.sources);
  }

  setLocalUserName(userName) {
    if (!this.vcsApi) return;

    const slot0 = this.sources.videoSlots[0];
    if (slot0 && slot0.id === LOCAL_VIDEO_INPUT_ID) {
      slot0.displayName = userName;
      this.setActiveVideoInput(0, true, LOCAL_VIDEO_INPUT_ID, userName);
      this.sendActiveVideoInputSlots();
    }
  }

  applyMeetingTracksAndOrdering(
    participants,
    orderedSessionIds,
    localSessionId
  ) {
    if (!this.sources || !participants || !orderedSessionIds) return;

    const prevSlots = this.sources.videoSlots;
    const newSlots = [];

    for (const sessionId of orderedSessionIds) {
      if (sessionId == null) {
        continue;
      }

      const p = participants.find((p) => p.participantSessionId === sessionId);

      if (localSessionId && sessionId === localSessionId) {
        if (this.localVideoSlotItem) {
          const slot = this.localVideoSlotItem;
          slot.displayName = p?.userName || "Local";
          newSlots.push(slot);
        } else {
          console.warn(
            "local session %s specified in inputs but local video not available",
            localSessionId,
            orderedSessionIds
          );
          newSlots.push({});
        }
        continue;
      }

      if (!p) {
        console.warn(
          " -- no participant available for session id: ",
          sessionId
        );
        continue;
      }

      const { track, userName: displayName } = p;

      const prevSlot = prevSlots.find((it) => it.sessionId === sessionId);
      if (prevSlot && prevSlot.track.id === track.id) {
        console.log(
          "found existing track for participant session %s",
          sessionId
        );
        newSlots.push({ ...prevSlot, displayName });
      } else {
        const mediaStream = new MediaStream([track]);
        let videoEl;
        if (prevSlot) {
          console.log("track has changed for %s", sessionId);
          videoEl = prevSlot.element;
        } else {
          console.log(
            "haven't seen participant session %s before",
            sessionId,
            track
          );
          videoEl = document.createElement("video");
          console.log(
            "... created video el for track %s (%s): ",
            track.id,
            displayName,
            videoEl
          );

          this.placeVideoSourceInDOM(videoEl, track.id);
        }
        videoEl.srcObject = mediaStream;
        videoEl.setAttribute("autoplay", true);
        videoEl.setAttribute("playsinline", true);
        videoEl.setAttribute("controls", false);

        newSlots.push({
          id: `videotrack_${track.id}`,
          element: videoEl,
          track: track,
          sessionId: sessionId,
          displayName,
        });
      }
    }

    // TODO: handle deleted tracks whose video source needs to be removed from DOM

    let didChange = newSlots.length !== prevSlots.length;
    if (!didChange) {
      // check the ids
      for (let i = 0; i < newSlots.length; i++) {
        if (newSlots[i].id !== prevSlots[i].id) {
          didChange = true;
          break;
        }
      }
    }

    if (didChange) {
      this.sources.videoSlots = newSlots;
      this.sendUpdateImageSources();

      console.log(
        "updating video slots with ordering, %d: ",
        newSlots.length,
        newSlots
      );

      for (let i = 0; i < MAX_VIDEO_INPUT_SLOTS; i++) {
        const slot = newSlots[i];
        if (slot) {
          this.setActiveVideoInput(i, true, slot.id, slot.displayName);
        } else {
          this.setActiveVideoInput(i, false);
        }
      }
      this.sendActiveVideoInputSlots();

      // this seems sometimes necessary to bump the newly created video layers
      // to the right positions.
      // TODO - investigate if/why this is needed and fix the root cause
      this.rootDisplaySizeChanged();
    }
  }
}
