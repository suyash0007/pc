export function chat(client, message) {
	client.write("chat", {
		message: JSON.stringify({ text: "§7[§6Phoenix§7] §f" + message }),
		position: 0
	});
}

export function parseTextComponent(component) {
	if (typeof component !== "object") {
		try {
			return parseTextComponent(JSON.parse(component));
		} catch {}
		return "";
	}
	if (component.text === undefined) return "";
	return component.text + (Array.isArray(component.extra) ? component.extra.map(component => parseTextComponent(component)).join("") : "");
}

export function removeFormatting(message) {
	return message?.replaceAll(/§[0-9a-fk-or]/g, "");
}

export default { chat, parseTextComponent, removeFormatting };
