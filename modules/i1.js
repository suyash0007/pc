import chat from "../utils/chat.js";
import config from "./i1/config.json" with { type: "json" };

export default class I1 {
	constructor(client, server) {
		this.config = structuredClone(config);
		this.client = client;
		this.server = server;
		this.position = [0, 0, 0];
	}

	toClient(event) {
		if (event.type === "chat") {
			if (chat.removeFormatting(chat.parseTextComponent(event.data.message)) !== "[BOSS] Goldor: Who dares trespass into my domain?") return;
			if (this.interval) return;
			this.clicks = 0;
			const exec = () => {
				++this.clicks;
				if (this.clicks > this.config.clicks || getDistanceSq(this.position, [108.5, 120, 94]) > 1) {
					chat.chat(this.client, "Ending i1!");
					clearInterval(this.interval);
					delete this.interval;
					return;
				}
				chat.chat(this.client, "i1 click! (" + Date.now() + ")");
				this.server.write("block_dig", {
					status: 0,
					location: { x: 110, y: 121, z: 91 },
					face: 4
				});
				this.server.write("block_dig", {
					status: 1,
					location: { x: 110, y: 121, z: 91 },
					face: 0
				});
			};
			this.interval = setInterval(exec, this.config.delay);
			exec();
		}
	}

	toServer(event) {
		if (["position", "position_look"].includes(event.type)) {
			this.position = [event.data.x, event.data.y, event.data.z];
		}
	}
}

function getDistanceSq(from, to) {
	return from.reduce((prev, cur, i) => (cur - to[i]) ** 2 + prev, 0);
}
