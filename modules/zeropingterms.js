import chat from "../utils/chat.js";

export default class ZeroPingTerms {
	constructor(client, server) {
		this.client = client;
		this.server = server;
		this.inTerminal = false;
		this.windowId = 1;
	}

	toClient(event) {
		if (event.type === "open_window") {
			this.windowId = event.data.windowId;
			if (/^Select all the [\w ]+ items!$|^Click in order!$|^Correct all the panes!$|^Change all to same color!$|^What starts with: '\w'\?$/.test(chat.removeFormatting(chat.parseTextComponent(event.data.windowTitle)))) this.inTerminal = true;
			else this.inTerminal = false;
		} else if (event.type === "close_window") {
			this.inTerminal = false;
		}
		if (this.inTerminal && ["open_window", "close_window", "set_slot", "window_items", "craft_progress_bar", "transaction"].includes(event.type)) {
			if (event.data.windowId === this.windowId) {
				event.data.windowId = 127; // 101-127 are unused
				event.modified = true;
			}
		}
	}

	toServer(event) {
		if (this.inTerminal && ["flying", "position", "look", "position_look"].includes(event.type)) {
			this.client.write("set_slot", {
				windowId: -1,
				slot: -1,
				item: { blockId: -1 }
			});
		}
		if (["close_window", "window_click", "transaction", "enchant_item"].includes(event.type)) {
			if (event.data.windowId === 127) {
				event.data.windowId = this.windowId;
				event.modified = true;
			}
		}
	}
}
