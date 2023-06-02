import { paramNames } from "./vcs-comp-conf";

/*
  "Session data" is the data shared by all the clients.
  It's managed by the host and broadcasted to all other participants.
  
  The data is divided in two:
  1) `vcsParams` is the non-interactive rendering state.
  2) `interactions` controls the interactions available on clients.

  The host will also send a copy of `vcsParams` to Daily's cloud
  when a recording or live stream is in progress.
*/

export function makeDefaultSessionData() {
  return {
    // params sent to the VCS composition
    vcsParams: {
      // we store these items as an array internally, but it needs to be stringified
      // for VCS because the supported param types in VCS are quite limited.
      // a function available below performs this transformation.
      [paramNames.RUNDOWN_ITEMS]: [],
      [paramNames.RUNDOWN_POSITION]: 0,

      [paramNames.GUESTNAME]: "",

      [paramNames.SHOW_POLL_RESULT]: false,
      [paramNames.POLL_QUESTION]: "Do you like coffee?",
      [paramNames.POLL_YES_VOTES]: 0,
      [paramNames.POLL_NO_VOTES]: 0,
    },

    // interactive state that doesn't need to be sent to VCS, only between clients
    interactions: {
      pollOpen: false,
    },
  };
}

// creates the layout object we pass to Daily when starting or updating a recording/stream
export function makeServerLayoutFromSessionVcsParams(vcsParams, isStart) {
  const layout = {
    preset: "custom",
    composition_params: transformVcsParams(vcsParams),
  };
  if (isStart) {
    layout.composition_id = "daily:rundown";
  }
  return layout;
}

// helper to transform the internal format of values in sessionData.vcsParams into
// the format we can send to VCS.
// see comment on `paramNames.RUNDOWN_ITEMS` above for explanation.
export function transformVcsParams(sessionDataParams) {
  let params = {};
  for (let paramName in sessionDataParams) {
    params[paramName] = transformVcsParamFromSessionData(
      paramName,
      sessionDataParams[paramName]
    );
  }
  return params;
}

export function transformVcsParamFromSessionData(paramName, value) {
  switch (paramName) {
    case paramNames.RUNDOWN_ITEMS: {
      if (Array.isArray(value)) {
        // the VCS rundown composition expects a comma-separated list.
        // replace any commas in this string array with a similar symbol
        // (the full-width comma is visually identical, just has more white space).
        return value.map((s) => s.replace(/,/g, "，")).join(",");
      }
    }
    default:
  }
  return value;
}
