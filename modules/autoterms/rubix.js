import equal from "fast-deep-equal";
import chat from "../../utils/chat.js";

export default class Rubix {
	constructor(client, server, config) {
		this.client = client;
		this.server = server;
		this.config = config;
		this.inP3 = false;
		this.windowId = 0;
		this.preWindowId = 0;
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
			if (event.data.slotCount !== 45) return;
			const rubixMatch = chat.removeFormatting(chat.parseTextComponent(event.data.windowTitle)).match(/^Change all to same color!$/);
			if (!rubixMatch) return;
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
			if (slot < 0 || slot >= 45) return;
			this.itemStacks[slot] = event.data.item;
			if (this.itemStacks.filter(itemStack => itemStack.blockId > 0).length < 45) return;
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
		const solution = this.getSolution();
		const slot = solution[0]?.[0];
		const button = solution[0]?.[1];
		if (typeof slot !== "number" || typeof button !== "number") return;
		this.resetPreWindow();
		this.preWindowId = this.windowId % 100 + 1;
		this.getPrediction(slot, button).forEach(itemStack => this.preItemStacks.push(itemStack));
		if (++this.transactionId > 32767) this.transactionId = -32768;
		this.server.write("window_click", {
			windowId: this.windowId,
			slot,
			mouseButton: button,
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
		const solution = [];
		const allowedSlots = [12, 13, 14, 21, 22, 23, 30, 31, 32];
		const order = [14, 1, 4, 13, 11];
		const calcIndex = index => (index + order.length) % order.length;
		const clicks = [0, 0, 0, 0, 0];
		for (let i = 0; i < 5; ++i) {
			this.itemStacks.filter((itemStack, index) => itemStack && allowedSlots.includes(index) && itemStack.itemDamage !== order[calcIndex(i)]).forEach(itemStack => {
				switch (itemStack.itemDamage) {
					case order[calcIndex(i - 1)]:
					case order[calcIndex(i + 1)]: {
						clicks[i] += 1;
						break;
					}
					case order[calcIndex(i - 2)]:
					case order[calcIndex(i + 2)]: {
						clicks[i] += 2;
						break;
					}
				}
			});
		}
		const origin = clicks.indexOf(Math.min(...clicks));
		Object.entries(this.itemStacks).map(entry => (entry[0] = parseInt(entry[0]), entry)).filter(entry => entry[1] && allowedSlots.includes(entry[0]) && entry[1].itemDamage !== order[calcIndex(origin)]).forEach(entry => {
			switch (entry[1].itemDamage) {
				case order[calcIndex(origin - 2)]: {
					solution.push([entry[0], 0], [entry[0], 0]);
					break;
				}
				case order[calcIndex(origin - 1)]: {
					solution.push([entry[0], 0]);
					break;
				}
				case order[calcIndex(origin + 1)]: {
					solution.push([entry[0], 1]);
					break;
				}
				case order[calcIndex(origin + 2)]: {
					solution.push([entry[0], 1], [entry[0], 1]);
					break;
				}
			}
		});
		return solution;
	}

	getPrediction(slot, button) {
		const prediction = this.itemStacks.map(itemStack => structuredClone(itemStack));
		const order = [14, 1, 4, 13, 11];
		const nameOrder = ["§aRed", "§aOrange", "§aYellow", "§aGreen", "§aBlue"];
		const calcIndex = index => (index + order.length) % order.length;
		let offset = 0;
		if (button === 0) offset = 1;
		else offset = -1;
		const index = order.indexOf(prediction[slot]?.itemDamage);
		if (index === -1) return prediction;
		const newIndex = calcIndex(index + offset);
		if (prediction[slot]?.itemDamage !== undefined) prediction[slot].itemDamage = order[newIndex];
		if (prediction[slot]?.nbtData?.value?.display?.value?.Name?.value !== undefined) prediction[slot].nbtData.value.display.value.Name.value = nameOrder[newIndex];
		return prediction;
	}
}
