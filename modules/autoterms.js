import Colors from "./autoterms/colors.js";
import Numbers from "./autoterms/numbers.js";
import Redgreen from "./autoterms/redgreen.js";
import Rubix from "./autoterms/rubix.js";
import Startswith from "./autoterms/startswith.js";
import config from "./autoterms/config.json" with { type: "json" };

export default class AutoTerms {
	constructor(client, server) {
		this.config = structuredClone(config);
		this.colors = new Colors(client, server, this.config);
		this.numbers = new Numbers(client, server, this.config);
		this.redgreen = new Redgreen(client, server, this.config);
		this.rubix = new Rubix(client, server, this.config);
		this.startswith = new Startswith(client, server, this.config);
	}

	toClient(event) {
		this.colors.toClient(event);
		this.numbers.toClient(event);
		this.redgreen.toClient(event);
		this.rubix.toClient(event);
		this.startswith.toClient(event);
	}
	
	toServer(event) {
		this.colors.toServer(event);
		this.numbers.toServer(event);
		this.redgreen.toServer(event);
		this.rubix.toServer(event);
		this.startswith.toServer(event);
	}
}
