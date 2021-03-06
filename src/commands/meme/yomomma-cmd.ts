import Command from "../../util/CommandHandler/lib/Command";
import * as Eris from "eris";
import { Request } from "../../util/Functions";

export default new Command({
	triggers: [
		"yomomma"
	],
	userPermissions: [],
	botPermissions: [],
	cooldown: 2.5e3,
	donatorCooldown: 2e3,
	features: [],
	file: __filename
}, (async function (msg, uConfig, gConfig, cmd) {
	// await msg.channel.startTyping();
	const txt = await Request.memeRequest("/yomomma");
	const embed: Eris.EmbedOptions = {
		title: "YoMomma Joke",
		description: JSON.parse(txt.body.toString()).text,
		footer: {
			text: "provided by dankmemer.services"
		}
	};
	return msg.channel.createMessage({ embed });
}));
