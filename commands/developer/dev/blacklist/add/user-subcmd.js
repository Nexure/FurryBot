const {
	config,
	functions,
	phin,
	Database: {
		MongoClient,
		mongo,
		mdb
	}
} = require("../../../../../modules/CommandRequire");

module.exports = {
	triggers: [
		"user",
		"u"
	],
	userPermissions: [],
	botPermissions: [],
	cooldown: 0,
	description: "Add an entry to the bots user blacklist",
	usage: "<id> [reason]",
	hasSubCommands: functions.hasSubCmds(__dirname,__filename), 
	subCommands: functions.subCmds(__dirname,__filename),
	nsfw: false,
	devOnly: true,
	betaOnly: false,
	guildOwnerOnly: false,
	path: __filename,
	run: (async function(message) {
		const sub = await functions.processSub(module.exports,message,this);
		if(sub !== "NOSUB") return sub;
		let u, id, blacklistReason, usr, embed;
		if(message.args.length < 1) return new Error("ERR_INVALID_USAGE");
		u = await message.getUserFromArgs();
		if(!u) return message.reply(`**${message.args[0]}** isn't a valid user.`);
		id = u.id;
		usr = await mdb.collection("users").findOne({ id });
		if(!usr) {
			console.debug(`Created user entry for ${id}`);
			await mdb.collection("users").insertOne(Object.assign(config.defaults.userConfig,{ id }));
			usr = await mdb.collection("users").findOne({ id });
		}

		if(!usr) return message.reply(`Failed to create user entry for **${id}**`);
		if(usr.blacklisted) return message.reply(`**${id}** is already blacklisted, reason: ${usr.blacklistReason}.`);
		else {
			blacklistReason = message.args.length > 1 ? message.args.slice(1,message.args.length).join(" ") : "No Reason Specified";
			await mdb.collection("users").findOneAndUpdate({ id },{ $set: { blacklisted: true, blacklistReason }});
			embed = {
				title: "User Blacklisted",
				description: `Id: ${id}\nTag: ${u.username}#${u.discriminator}\nReason: ${blacklistReason}\nBlame: ${message.author.username}#${message.author.discriminator}`
			};
			Object.assign(embed,message.embed_defaults());
			await this.bot.executeWebhook(config.webhooks.logs.id,config.webhooks.logs.token,{ embeds: [ embed ], username: `Blacklist Logs${config.beta ? " - Beta" : ""}` });
			return message.reply(`Added **${u.username}#${u.discriminator}** (${id}) to the blacklist, reason: ${blacklistReason}.`);
		}
	})
};