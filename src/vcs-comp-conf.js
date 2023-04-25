/*
  App-specific configuration for the VCS Rundown composition.
*/

// params that we're changing at runtime
export const paramNames = {
  RUNDOWN_ITEMS: "rundown.items",
  RUNDOWN_POSITION: "rundown.position",
  GUESTNAME: "video.guestName",
  SHOW_POLL_RESULT: "poll.showResult",
  POLL_QUESTION: "poll.question",
  POLL_YES_VOTES: "poll.yesVotes",
  POLL_NO_VOTES: "poll.noVotes",
};

// default state for params that we don't change at runtime
export const initialParams = {
  "textStyles.fontFamily": "Teko",
  "textStyles.baseFontSize_pct": 125,
};
