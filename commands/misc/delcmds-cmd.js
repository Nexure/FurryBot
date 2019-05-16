module.exports = {
	triggers: [
		"delcmds"
	],
	userPermissions: [
		"manageMessages" // 8192
	],
	botPermissions: [
		"manageMessages" // 8192
	],
	cooldown: .75e3,
	description: "Toggle command deletion",
	usage: "",
	hasSubCommands: require(`${process.cwd()}/util/functions.js`).hasSubCmds(__dirname,__filename), 
	subCommands: require(`${process.cwd()}/util/functions.js`).subCmds(__dirname,__filename),
	nsfw: false,
	devOnly: false,
	betaOnly: false,
	guildOwnerOnly: false,
	run: (async function(message) {
		const sub = await this.processSub(module.exports,message,this);
		if(sub !== "NOSUB") return sub;
		switch(message.gConfig.deleteCommands) {
		case true:
			await this.mdb.collection("guilds").findOneAndUpdate({
				id: message.channel.guild.id
			},{
				$set: {
					deleteCommands: false
				}
			});
			return message.channel.createMessage(`<@!${message.author.id}>, Disabled deleting command invocations.`);
			break; // eslint-disable-line no-unreachable
		
		case false:
			await this.mdb.collection("guilds").findOneAndUpdate({
				id: message.channel.guild.id
			},{
				$set: {
					deleteCommands: true
				}
			});
			return message.channel.createMessage(`<@!${message.author.id}>, Enabled deleting command invocations.`);
			break; // eslint-disable-line no-unreachable
		}
	})
};