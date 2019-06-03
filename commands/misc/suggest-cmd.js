const {
	config,
	functions,
	phin,
	Database: {
		MongoClient,
		mongo,
		mdb
	}
} = require("../../modules/CommandRequire");

module.exports = {
	triggers: [
		"suggest"
	],
	userPermissions: [],
	botPermissions: [],
	cooldown: 18e5,
	description: "Suggest something for the bot!",
	usage: "<suggestion>",
	hasSubCommands: functions.hasSubCmds(__dirname,__filename), 
	subCommands: functions.subCmds(__dirname,__filename),
	nsfw: false,
	devOnly: false,
	betaOnly: false,
	guildOwnerOnly: false,
	path: __filename,
	run: (async function(message) {
		const sub = await functions.processSub(module.exports,message,this);
		if(sub !== "NOSUB") return sub;
		let card, data, embed;
		if(message.unparsedArgs.length === 0 || !message.unparsedArgs[0]) return new Error("ERR_INVALID_USAGE");
		try {
			card = await this.tclient.addCard(message.unparsedArgs.join(" "),`Suggestion by ${message.author.username}#${message.author.discriminator} (${message.author.id}) from guild ${message.channel.guild.name} (${message.channel.guild.id})`,config.apis.trello.list);
		}catch(error) {
			return message.channel.createMessage(`<@!${message.author.id}>, Failed to create card: **${error.message}**`);
		}
		await this.tclient.addLabelToCard(card.id,config.apis.trello.labels.approval).catch(err => this.logger.log(err));
		await message.channel.createMessage(`<@!${message.author.id}>, Suggestion posted!\nView it here: ${card.shortUrl}`);
		
		embed = {
			title: `Suggestion by ${message.author.username}#${message.author.discriminator} (${message.author.id}) from guild ${message.channel.guild.name} (${message.channel.guild.id})`,
			description: this.truncate(message.unparsedArgs.join(" "),950),
			thumbnail: {
				url: message.author.avatarURL
			},
			fields: [
				{
					name: "Trello Card",
					value: card.shortUrl,
					inline: false
				}
			]
		};
		Object.assign(embed,message.embed_defaults());
		return this.bot.executeWebhook(config.webhooks.suggestions.id,config.webhooks.suggestions.token,{
			embeds: [embed],
			username: `Bot Suggestion${config.beta ? " - Beta" : config.alpha ? " - Alpha" : ""}`,
			avatarURL: "https://i.furry.bot/furry.png"
		});
	})
};