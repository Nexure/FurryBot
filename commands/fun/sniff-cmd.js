module.exports = {
	triggers: [
		"sniff"
	],
	userPermissions: [],
	botPermissions: [],
	cooldown: 2e3,
	description: "Sniff.. someone?",
	usage: "<@user/text>",
	hasSubCommands: require(`${process.cwd()}/util/functions.js`).hasSubCmds(__dirname,__filename), 
	subCommands: require(`${process.cwd()}/util/functions.js`).subCmds(__dirname,__filename),
	nsfw: false,
	devOnly: false,
	betaOnly: false,
	guildOwnerOnly: false,
	run: (async function(message) {
		const sub = await this.processSub(module.exports,message,this);
		if(sub !== "NOSUB") return sub;
		if(message.args.length === 0) return new Error("ERR_INVALID_USAGE");
		let input, text;
		input = message.args.join(" ");
		text = this.varParse(message.c,{author:message.author,input:input});
		message.channel.createMessage(text);
	})
};