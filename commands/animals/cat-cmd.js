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
		"cat",
		"kitty",
		"kitten"
	],
	userPermissions: [],
	botPermissions: [
		"attachFiles" // 32768
	],
	cooldown: 3e3,
	description: "Get a picture of a cat!",
	usage: "",
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
		try {
			return message.channel.createMessage("",{
				file: await functions.getImageFromURL("https://cataas.com/cat/gif"),
				name: "cat.gif"
			});
		} catch(e) {
			this.logger.error(e);
			return message.channel.createMessage("unknown api error",{
				file: await functions.getImageFromURL(config.images.serverError),
				name: "error.png"
			});
		}
			
	})
};