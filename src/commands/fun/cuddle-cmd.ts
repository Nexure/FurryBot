import Command from "../../util/CommandHandler/lib/Command";
import EmbedBuilder from "../../util/EmbedBuilder";
import { Request, Internal } from "../../util/Functions";
import Logger from "../../util/LoggerV8";
import Eris from "eris";

export default new Command({
	triggers: [
		"cuddle"
	],
	userPermissions: [],
	botPermissions: [
		"embedLinks"
	],
	cooldown: 3e3,
	donatorCooldown: 1.5e3,
	features: [],
	file: __filename
}, (async function (msg, uConfig, gConfig, cmd) {
	if (msg.args.length < 1) return new Error("ERR_INVALID_USAGE");

	const embed = new EmbedBuilder(gConfig.settings.lang)
		.setAuthor(msg.author.tag, msg.author.avatarURL)
		.setDescription(`{lang:commands.fun.cuddle.possible|${msg.author.id}|${Internal.extraArgParsing(msg)}}`)
		.setTimestamp(new Date().toISOString())
		.setColor(Math.floor(Math.random() * 0xFFFFFF));

	if (gConfig.settings.commandImages) {
		if (!msg.channel.permissionsOf(this.user.id).has("attachFiles")) return msg.reply("{lang:other.error.permissionMissing|attachFiles}");
		const img = await Request.imageAPIRequest(false, "cuddle", true, true);
		if (img.success === false) {
			this.log("error", img.error, `Shard #${msg.channel.guild.shard.id}`);
			return msg.reply(`{lang:other.error.imageAPI}`);
		}
		embed.setImage(img.response.image);
	}
	return msg.channel.createMessage({
		embed
	});
}));
