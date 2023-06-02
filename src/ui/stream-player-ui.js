import * as vcsComp from "@daily-co/vcs-composition-daily-rundown-web";

import VcsMeetingRenderer from "./vcs-meeting-renderer";
import { getAssetUrlCb } from "../vcs-asset-conf";
import * as compConf from "../vcs-comp-conf";
import {
  transformVcsParamFromSessionData,
  transformVcsParams,
} from "../stream-session-data";

export class StreamPlayerUI {
  constructor(container, sessionData, role) {
    this.container = container;

    // to make the player fit inside the provided container,
    // create an inner element which has the aspect ratio.
    // the outer element will be a flexbox whose direction is changed
    // based on its aspect ratio.
    // this simulates the 'object-fit: contain' setting which exists for images.
    this.innerContainer = document.createElement("div");
    this.innerContainer.className = "vcs-player-container";
    this.container.appendChild(this.innerContainer);

    this.viewportSize = { w: 1920, h: 1080 };

    this.flipViewportToPortraitOnResize = role !== "host";

    this.applyAspectRatioToContainer();

    this.hasLocalVideo = role !== "viewer";

    this.localSessionId = this.hasLocalVideo ? "local" : null;

    this.params = {
      ...compConf.initialParams,
      ...transformVcsParams(sessionData.vcsParams),
    };

    this.vcsRenderer = new VcsMeetingRenderer(
      vcsComp,
      this.innerContainer,
      this.viewportSize,
      this.params,
      {
        getAssetUrlCb,
      }
    );

    this.vcsRenderer.start({ useLocalVideo: this.hasLocalVideo });

    window.addEventListener("resize", () => {
      this.applyAspectRatioToContainer();

      this.vcsRenderer.rootDisplaySizeChanged();
    });
  }

  resetViewportSize(newSize) {
    this.viewportSize = newSize;

    if (this.vcsRenderer) {
      console.log(
        "restarting VCS player with viewport size %d * %d",
        this.viewportSize.w,
        this.viewportSize.h
      );

      this.vcsRenderer.stop();

      this.vcsRenderer.start({
        useLocalVideo: this.hasLocalVideo,
        viewportSize: this.viewportSize,
        params: this.params,
      });
    }
  }

  applyAspectRatioToContainer() {
    const outerAsp = this.container.clientWidth / this.container.clientHeight;

    if (this.flipViewportToPortraitOnResize) {
      const usePortrait = outerAsp < 1;
      const currentlyPortrait = this.viewportSize.w < this.viewportSize.h;
      if (usePortrait !== currentlyPortrait) {
        this.resetViewportSize({
          w: this.viewportSize.h,
          h: this.viewportSize.w,
        });
      }
    }

    this.innerContainer.setAttribute(
      "style",
      `aspect-ratio: ${this.viewportSize.w} / ${this.viewportSize.h};`
    );

    const contentAsp = this.viewportSize.w / this.viewportSize.h;

    if (this.container.clientWidth < 1 || this.container.clientHeight < 1) {
      console.warn("Container client size not available");
      return;
    }

    let style_w;
    let style_h;
    let style_flexDir;
    if (contentAsp > outerAsp) {
      // wide content, so letterbox
      style_w = "100%";
      style_h = "auto";
      style_flexDir = "column";
    } else {
      // tall content, so pillarbox
      style_w = "auto";
      style_h = "100%";
      style_flexDir = "row";
    }

    this.container.setAttribute(
      "style",
      `width: ${style_w}; height: ${style_h}; flex-direction: ${style_flexDir}`
    );
  }

  takeVcsParamFromSessionData(paramName, sessionData) {
    const value = transformVcsParamFromSessionData(
      paramName,
      sessionData.vcsParams[paramName]
    );
    if (value != null) {
      this.vcsRenderer.sendParam(paramName, value);

      this.params[paramName] = value;
    }
  }

  takeVcsParamsFromSessionData(sessionData) {
    this.params = {
      ...this.params,
      ...transformVcsParams(sessionData.vcsParams),
    };
    for (const paramName in this.params) {
      this.vcsRenderer.sendParam(paramName, this.params[paramName]);
    }
  }

  showParticipants(participants, sessionIds) {
    this.vcsRenderer.applyMeetingTracksAndOrdering(
      participants,
      sessionIds,
      this.localSessionId
    );
  }
}
