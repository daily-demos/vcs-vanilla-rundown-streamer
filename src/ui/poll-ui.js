export class PollUI {
  constructor(container, callbacks) {
    this.container = container;

    this.hidePoll();

    let ids = ["pollTitle", "pollVoteYesBtn", "pollVoteNoBtn"];
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

    this.uiElements.pollVoteYesBtn.addEventListener(
      "click",
      this.onPollVoteBtnClick.bind(this)
    );
    this.uiElements.pollVoteNoBtn.addEventListener(
      "click",
      this.onPollVoteBtnClick.bind(this)
    );
  }

  setPollQuestion(str) {
    this.uiElements.pollTitle.innerText = str || '';
  }

  setPollVisible(f) {
    if (f) this.showPoll();
    else this.hidePoll();
  }

  showPoll() {
    this.container.setAttribute("style", "display: block;");
  }

  hidePoll() {
    this.container.setAttribute("style", "display: none;");
  }

  onPollVoteBtnClick(ev) {
    let vote = (ev.target === this.uiElements.pollVoteYesBtn);

    this.hidePoll();

    this.callbacks.onPollVote(vote);
}
