import equal from "fast-deep-equal";
import chat from "../../utils/chat.js";

export default class Colors {
	constructor(client, server, config) {
		this.client = client;
		this.server = server;
		this.config = config;
		this.inP3 = false;
		this.windowId = 0;
		this.preWindowId = 0;
		this.extra = "";
		this.itemStacks = [];
		this.preItemStacks = [];
		this.transactionId = 0;
		this.lastClick = Date.now();

		this.setSlotTrigger = false;
		this.closeTrigger1 = false;
		this.closeTrigger2 = false;
	}

	toClient(event) {
		if (event.type === "open_window") {
			this.resetWindow();
			this.windowId = event.data.windowId;
			// if (!Settings.enabled || !Settings.redgreenEnabled || (!inP3 && !Settings.notP3)) return;
			if (this.windowId < 1 || this.windowId > 100) return;
			if (event.data.inventoryType !== "minecraft:chest") return;
			if (event.data.slotCount !== 54) return;
			const colorsMatch = chat.removeFormatting(chat.parseTextComponent(event.data.windowTitle)).match(/^Select all the ([\w ]+) items!$/);
			if (!colorsMatch) return;
			this.extra = colorsMatch[1].toLowerCase();
			this.setSlotTrigger = true;
			this.closeTrigger1 = true;
			this.closeTrigger2 = true;
		} else if (event.type === "close_window") {
			if (!this.closeTrigger1) return;
			this.closeWindow();
		} else if (event.type === "set_slot") {
			if (!this.setSlotTrigger) return;
			if (event.data.windowId !== this.windowId) return;
			const slot = event.data.slot;
			if (slot < 0 || slot >= 54) return;
			this.itemStacks[slot] = event.data.item;
			if (this.itemStacks.filter(itemStack => itemStack.blockId > 0).length < 54) return;
			this.setSlotTrigger = false;
			const initialWindowId = this.windowId;
			const isNewTerminal = this.windowId !== this.preWindowId || this.itemStacks.some((itemStack, index) => !equal(itemStack, this.preItemStacks[index]));
			this.resetPreWindow();
			if (isNewTerminal) {
				setTimeout(() => this.prepareClick(initialWindowId), this.config.firstDelay);
			} else {
				const calculatedDelay = this.config.delay - (Date.now() - this.lastClick);
				if (calculatedDelay > 0) setTimeout(() => this.prepareClick(initialWindowId), calculatedDelay);
				else this.prepareClick(initialWindowId);
			}
		}
	}

	toServer(event) {
		if (event.type === "close_window") {
			if (!this.closeTrigger2) return;
			this.closeWindow();
		} else if (event.type === "window_click") {
			if (!this.closeTrigger2) return;
			event.canceled = true;
		}
	}

	prepareClick(initialWindowId) {
		if (this.windowId !== initialWindowId) return;
		this.lastClick = Date.now();
		this.click(initialWindowId);
	}

	click(initialWindowId) {
		if (this.windowId !== initialWindowId) return;
		const slot = this.getSolution()[0];
		if (typeof slot !== "number") return;
		this.resetPreWindow();
		this.preWindowId = this.windowId % 100 + 1;
		this.getPrediction(slot).forEach(itemStack => this.preItemStacks.push(itemStack));
		if (++this.transactionId > 32767) this.transactionId = -32768;
		this.server.write("window_click", {
			windowId: this.windowId,
			slot,
			mouseButton: 0,
			action: this.transactionId,
			mode: 0,
			item: this.itemStacks[slot]
		});
		
		if (this.config.timeout > 0) setTimeout(() => this.prepareClick(initialWindowId), this.config.timeout);
	}

	resetWindow() {
		this.setSlotTrigger = false;
		this.closeTrigger1 = false;
		this.closeTrigger2 = false;
		this.windowId = 0;
		while (this.itemStacks.length) this.itemStacks.pop();
		this.transactionId = 0;
	}

	resetPreWindow() {
		this.preWindowId = 0;
		while (this.preItemStacks.length) this.preItemStacks.pop();
	}

	closeWindow() {
		this.resetWindow();
		this.resetPreWindow();
	}

	getSolution() {
		const allowedSlots = [10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 24, 25, 28, 29, 30, 31, 32, 33, 34, 37, 38, 39, 40, 41, 42, 43];
		const replacements = { "light gray": "silver", "wool": "white", "bone": "white", "ink": "black", "lapis": "blue", "cocoa": "brown", "dandelion": "yellow", "rose": "red", "cactus": "green" };
		const fixName = name => {
			Object.entries(replacements).forEach(([k, v]) => {
				name = name.replace(new RegExp("^" + k), v);
			});
			return name;
		};
		return Object.entries(this.itemStacks).map(entry => (entry[0] = parseInt(entry[0]), entry)).filter(entry => entry[1] && allowedSlots.includes(entry[0]) && entry[1].nbtData?.value?.ench === undefined && fixName(chat.removeFormatting(entry[1].nbtData?.value?.display?.value?.Name?.value)?.toLowerCase() ?? "")?.startsWith(this.extra)).map(entry => entry[0]);
	}

	getPrediction(slot) {
		const prediction = this.itemStacks.map(itemStack => structuredClone(itemStack));
		if (prediction[slot]?.nbtData?.value !== undefined) prediction[slot].nbtData.value.ench = { type: "list", value: { type: "end", value: [] } };
		return prediction;
	}
}
