import { StreamPlayerUI } from "./ui/stream-player-ui";
import { ControlsUI } from "./ui/controls-ui";
import { PollUI } from "./ui/poll-ui";

import { makeDefaultSessionData } from "./stream-session-data";
import { DailyCall } from "./daily-call";
import { paramNames } from "./vcs-comp-conf";

let g_streamPlayerUI;
let g_controlsUI;
let g_pollUI;
let g_sessionData;
let g_streamingConfig;
let g_dailyCall;

let g_dailyRoomUrl = process.env.DAILY_ROOM_URL;

let g_knownRoles = ["host", "guest", "viewer"];

let g_roomTokensByRole = {
  host: process.env.TOKEN_HOST,
  guest: process.env.TOKEN_GUEST,
  viewer: process.env.TOKEN_VIEWER,
};

let g_role;

let g_remoteParticipantsByRole = {};

//
// -- main --
//
window.addEventListener("load", async () => {
  if (!g_dailyRoomUrl || g_dailyRoomUrl.length < 1) {
    const msg =
      "Daily room not configured. Please check that you have created a .env file for this sample app.";
    console.error(msg);
    alert(msg);
    return; // --
  }

  if (!getRoleParam()) return; // --

  console.log("Loading app with role '%s', room: %s", g_role, g_dailyRoomUrl);

  if (!g_roomTokensByRole[g_role]) {
    const msg = `Room token not found for role ${g_role}. Please check your .env configuration for this sample app.`;
    console.error(msg);
    alert(msg);
    return; // --
  }

  await showVideoPlayActionOverlayAsync();

  g_sessionData = makeDefaultSessionData();

  g_streamingConfig = {
    rtmpUrl: "",
  };

  let showHostControls = false;
  let showControls = false;

  switch (g_role) {
    case "host":
      g_sessionData.vcsParams[paramNames.RUNDOWN_ITEMS] = [
        "Introduction",
        "This Week's News",
        "Interview with Jane Doe",
        "Conclusion",
      ];

      showHostControls = true;
      showControls = true;
      g_controlsUI = new ControlsUI(
        {
          onUpdateSessionDataValue,
          onUpdateStreamingConfig,
          onToggleRecording,
          onToggleLiveStreaming,
        },
        g_sessionData,
        g_role
      );
      break;

    case "guest":
      showControls = true;
      break;

    case "viewer":
      document
        .querySelector("#stream-preview")
        .setAttribute("style", "background-color: black;");

      g_pollUI = new PollUI(document.getElementById("live-poll"), {
        onPollVote,
      });

      break;
  }

  document
    .getElementById("guestControls")
    .setAttribute("style", "display: " + (showHostControls ? "none" : "block"));
  document
    .getElementById("hostControls")
    .setAttribute("style", "display: " + (showHostControls ? "block" : "none"));
  document
    .getElementById("controls")
    .setAttribute("style", "display: " + (showControls ? "block" : "none"));

  const playerContainer = document.querySelector("#stream-preview");

  playerContainer.className = showControls ? "controlsOn" : "controlsOff";

  g_streamPlayerUI = new StreamPlayerUI(playerContainer, g_sessionData, g_role);

  if (g_role !== "host") {
    // hide the stream view for a moment, to allow some time to sync the state via the Daily room
    const streamPlayerCover = document.querySelector("#stream-cover");
    streamPlayerCover.className = g_role;
    streamPlayerCover.setAttribute("style", "display: block;");
    setTimeout(() => {
      streamPlayerCover.removeAttribute("style");
    }, 1000);
  }

  g_dailyCall = new DailyCall(
    g_dailyRoomUrl,
    g_role,
    g_roomTokensByRole[g_role],
    g_role === "host",
    {
      onRemoteVcsParams,
      onRemoteInteractionControl,
      onRemoteInteractionResponse,
      onRemoteParticipantVideoTrackAvailable,
      onRemoteParticipantVideoTrackLost,
      onRemoteParticipantJoined,
    }
  );

  console.log("-- joining daily room %s --", g_dailyRoomUrl);

  await g_dailyCall.join(g_role !== "viewer");

  if (g_role === "host") {
    // broadcast session data on joining
    g_dailyCall.broadcastVcsParams(g_sessionData.vcsParams);
  }

  setTimeout(() => {
    const overlayEl = document.getElementById("stream-info-overlay");
    overlayEl.className = "streamInfoFadeOut";
  }, 4000);
});

//
// -- UI callbacks --
//

function onUpdateSessionDataValue(namespace, key, value) {
  // only the host can update the session
  if (g_role !== "host") return;

  g_sessionData[namespace][key] = value;

  switch (namespace) {
    case "interactions":
      // interactive control, doesn't update VCS state
      g_dailyCall.broadcastInteractionControl({ [key]: value });
      break;

    case "vcsParams":
      // update VCS data
      g_dailyCall.broadcastVcsParams(g_sessionData.vcsParams);

      g_streamPlayerUI.takeVcsParamFromSessionData(key, g_sessionData);
      break;
  }
  return g_sessionData;
}

function onUpdateStreamingConfig(key, value) {
  g_streamingConfig[key] = value;
  console.log("updated streaming config: ", g_streamingConfig);
}

function onToggleRecording() {
  if (!g_dailyCall.recording) {
    g_dailyCall.startRecording(g_sessionData);
  } else {
    g_dailyCall.stopRecording();
  }
  return g_dailyCall.recording;
}

function onToggleLiveStreaming() {
  if (!g_streamingConfig.rtmpUrl || g_streamingConfig.rtmpUrl.length < 1) {
    alert("For live streaming, please specify the target streaming URL.");
    return;
  }

  if (!g_dailyCall.liveStreaming) {
    g_dailyCall.startLiveStreaming(g_sessionData, g_streamingConfig);
  } else {
    g_dailyCall.stopLiveStreaming();
  }
  return g_dailyCall.liveStreaming;
}

function onPollVote(vote) {
  console.log("voting: ", vote);

  g_dailyCall.sendInteractionResponse({
    vote,
  });
}

//
// -- Daily callbacks --
//

function onRemoteParticipantJoined(participantSessionId, vcsSessionData) {
  if (g_role === "host") return;

  // for guests and viewers, the host's userData carried the latest state on room join
  if (vcsSessionData) {
    onRemoteVcsParams(vcsSessionData);
  }
}

function onRemoteVcsParams(data) {
  if (g_role === "host") return;

  g_sessionData.vcsParams = { ...data };

  g_streamPlayerUI.takeVcsParamsFromSessionData(g_sessionData);
}

function onRemoteInteractionControl(data) {
  if (g_role === "host") return;

  console.log("remote control data: ", data);

  if (data.pollOpen !== undefined && g_pollUI) {
    g_pollUI.setPollQuestion(g_sessionData.vcsParams[paramNames.POLL_QUESTION]);
    g_pollUI.setPollVisible(data.pollOpen);
  }
}

function onRemoteInteractionResponse(data) {
  if (g_role !== "host") return;

  if (data.vote == null) {
    console.error("invalid data in interactive response: ", data);
    return;
  }

  const paramName = data.vote
    ? paramNames.POLL_YES_VOTES
    : paramNames.POLL_NO_VOTES;

  const value = g_sessionData.vcsParams[paramName] + 1;

  onUpdateSessionDataValue("vcsParams", paramName, value);
}

function onRemoteParticipantVideoTrackAvailable({
  track,
  participantSessionId,
  userName,
}) {
  if (!g_knownRoles.includes(userName)) {
    console.warn(
      "** Remote participant with invalid role: %s, %s",
      userName,
      participantSessionId
    );
    return;
  }
  g_remoteParticipantsByRole[userName] = {
    track,
    participantSessionId,
    userName,
  };
  console.log(
    "got remote participant: %s, role %s",
    participantSessionId,
    userName
  );

  updateViewForRemoteParticipants();
}

function onRemoteParticipantVideoTrackLost({ track, participantSessionId }) {
  const trackId = track.id;

  let didUpdate = false;
  for (const key in g_remoteParticipantsByRole) {
    const p = g_remoteParticipantsByRole[key];
    if (p.track?.id === trackId) {
      console.log("removing remote participant for role %s", key);
      delete g_remoteParticipantsByRole[key];
      didUpdate = true;
      break;
    }
  }

  if (didUpdate) {
    updateViewForRemoteParticipants();
  }
}

function updateViewForRemoteParticipants() {
  // to indicate the local session, we can just pass a known constant
  const localSessionId = g_streamPlayerUI.localSessionId;

  const host =
    g_role === "host"
      ? localSessionId
      : g_remoteParticipantsByRole["host"]?.participantSessionId;
  const guest =
    g_role === "guest"
      ? localSessionId
      : g_remoteParticipantsByRole["guest"]?.participantSessionId;

  const ids = [host, guest];

  g_streamPlayerUI.showParticipants(
    Object.values(g_remoteParticipantsByRole),
    ids
  );
}

//
// -- launch-time utils --
//

function getRoleParam() {
  const params = new URL(document.location).searchParams;
  let role = params.get("role");
  if (!role || role.length < 1) {
    role = "viewer";
  }
  if (!g_knownRoles.includes(role)) {
    alert("Specified role is invalid.");
    return false;
  }
  g_role = role;
  return true;
}

async function showVideoPlayActionOverlayAsync() {
  const content = document.querySelector("#video-play-action-overlay .content");
  content.innerText = `Click to join as ${g_role}`;

  const el = document.getElementById("video-play-action-overlay");
  if (!el) {
    console.error("** can't show action overlay, element missing");
    return;
  }
  el.style = "display: block;";

  console.log("showing overlay...");

  const promise = new Promise((resolve, reject) => {
    el.addEventListener("click", onClick);

    function onClick() {
      el.removeEventListener("click", onClick);
      el.style = "display: none";
      console.log("removing overlay");
      resolve();
    }
  });

  return promise;
}
