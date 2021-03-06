import Command from "../../util/CommandHandler/lib/Command";
import { Time } from "../../util/Functions";
import * as fs from "fs-extra";
import config from "../../config";

export default new Command({
	triggers: [
		"restart"
	],
	userPermissions: [],
	botPermissions: [],
	cooldown: 0,
	donatorCooldown: 0,
	description: "Make me restart.",
	usage: "",
	features: ["devOnly"],
	file: __filename
}, (async function (msg, uConfig, gConfig, cmd) {
	const time = await Time.ms((this.shards.size * 7) * 1e3, true);
	fs.writeFileSync(`${config.dir.base}/restart.json`, JSON.stringify({
		time: Date.now(),
		user: msg.author.id,
		channel: msg.channel.id
	}));
	return msg.reply(`restarting.. This may take ${time} or more.`).then(() => process.exit());
}));
