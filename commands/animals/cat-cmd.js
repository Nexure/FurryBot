module.exports = {
	triggers: ["cat","kitty","kitten"],
	userPermissions: [],
	botPermissions: [
		"ATTACH_FILES"
	],
	cooldown: 3e3,
	description: "Get a picture of a cat!",
	usage: "",
	nsfw: false,
	devOnly: false,
	betaOnly: false,
	guildOwnerOnly: false,
	run: ()=>{}
};

module.exports = (async (self,local) => {
	local.channel.stopTyping();
	var req = await self.request("https://aws.random.cat/meow",{
		method: "GET",
		headers: {
			"User-Agent": self.config.web.userAgent
		}
	})
	
	try {
		var json=JSON.parse(xhr.responseText);
		var attachment = new self.Discord.MessageAttachment(json.file);
	}catch(e){
		self.logger.error(e);
		var attachment = new self.Discord.MessageAttachment(self.config.images.serverError);
	}
	local.channel.send(attachment);
	return local.channel.stopTyping();
		
});