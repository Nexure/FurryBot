module.exports = {
	triggers: [
		"join"
	],
	userPermissions: [],
	botPermissions: [],
	cooldown: 1e3,
	description: "Make the bot join your current voice channel",
	usage: "",
	nsfw: false,
	devOnly: true,
	betaOnly: false,
	guildOwnerOnly: false,
	run: (async function(message) {
		let c;
		if(!message.member.voice.channel) return message.channel.createMessage("You must be in a voice channel to use this.");
		c = this.voiceConnections.filter(g => g.channel.guild.id===message.channel.guild.id);
        
		if(c.size !== 0 && c.first().members.filter(m => m.id!==this.bot.user.id).size !== 0) {
			if(!message.gConfig.djRole)  {
				if(!message.member.permissions.has("manageServer")) return message.channel.createMessage(":x: Missing permissions or DJ role.");
			} else {
				try {
					if(!message.member.roles.has(message.gConfig.djRole) && !message.member.permissions.has("manageServer")) return message.channel.createMessage(":x: Missing permissions or DJ role.");
				}catch(error){
					message.channel.createMessage("DJ role is configured incorrectly.");
					if(!message.member.permissions.has("manageServer")) {
						message.channel.createMessage(":x: Missing permissions.");
					}
				}
			}
		}
    
		//if(c.size === 0) return message.channel.createMessage("I'm not currently playing anything here.");
		if(c.size !== 0 && c.first().speaking.has("SPEAKING")) {
			//c.first().disconnect();
			//return message.channel.createMessage("Ended playback and left the channel.");
			return message.channel.createMessage("Please end the current playback.");
		} else {
			message.member.voice.channel.join();
			return message.channel.createMessage("Joined the voice channel.");
		}
	})
};