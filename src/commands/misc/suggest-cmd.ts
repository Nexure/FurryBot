import Command from "../../util/CommandHandler/lib/Command";
import config from "../../config";
import truncate from "truncate";
import EmbedBuilder from "../../util/EmbedBuilder";
import Logger from "../../util/LoggerV8";

export default new Command({
	triggers: [
		"suggest"
	],
	userPermissions: [],
	botPermissions: [
		"embedLinks"
	],
	cooldown: 18e5,
	donatorCooldown: 18e5,
	features: [],
	file: __filename
}, (async function (msg, uConfig, gConfig, cmd) {
	if (msg.args.length < 1 || msg.args.join(" ").length === 0) return msg.reply("please provide something to suggest.");
	const m = await this.executeWebhook(config.webhooks.suggestion.id, config.webhooks.suggestion.token, {
		embeds: [
			new EmbedBuilder(gConfig.settings.lang)
				.setTitle(`Suggestion by ${msg.author.tag} from guild ${msg.channel.guild.name}`)
				.setDescription(`${truncate(msg.unparsedArgs.join(" "), 950)}`)
				.setThumbnail(msg.author.avatarURL)
				.setFooter(`User ID: ${msg.author.id} | Guild ID: ${msg.channel.guild.id}`)
				.setTimestamp(new Date().toISOString())
				.setColor(Math.floor(Math.random() * 0xFFFFFF))
				.toJSON()
		],
		username: `Bot Suggestion${config.beta ? " - Beta" : ""}`,
		avatarURL: "https://i.furry.bot/furry.png",
		wait: true
	});
	await m.addReaction(config.emojis.upvote).catch(err => this.log("error", err, `Shard #${msg.channel.guild.shard.id}`));
	await m.addReaction(config.emojis.downvote).catch(err => this.log("error", err, `Shard #${msg.channel.guild.shard.id}`));
	return msg.channel.createMessage({
		embed: new EmbedBuilder(gConfig.settings.lang)
			.setTitle("{lang:commands.misc.suggest.title}")
			.setAuthor(msg.author.tag, msg.author.avatarURL)
			.setDescription(`{lang:commands.misc.suggest.desc}`)
			.setTimestamp(new Date().toISOString())
			.setColor(Math.floor(Math.random() * 0xFFFFFF))
	});
}));
