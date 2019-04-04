module.exports = {
	triggers: [
		"hackban",
		"hb"
	],
	userPermissions: [
		"banMembers" // 4
	],
	botPermissions: [
		"banMembers" // 4
	],
	cooldown: 2.5e3,
	description: "Ban a person that isn't in your server",
	usage: "<@user/id> [reason]",
	nsfw: false,
	devOnly: false,
	betaOnly: false,
	guildOwnerOnly: false,
	run: (async function(message) {
		let user, reason, data, embed, m;
		// get user from message
		user = await message.getUserFromArgs();
   
		if(!user) user = await this.bot.getRESTUser(message.args[0]).catch(error => false);
		if(!user) return message.errorEmbed("INVALID_USER");
   
		if((await message.channel.guild.getBans().then(res => res.map(u => u.user.id))).includes(user.id)) {
			embed = {
				title: "User already banned",
				description: `It looks like ${user.username}#${user.discriminator} is already banned here..`
			};
			Object.assign(embed, message.embed_defaults());
			return message.channel.createMessage({ embed });
		}
   
		if(user.id === message.member.id && !message.user.isDeveloper) return message.channel.createMessage("Pretty sure you don't want to do this to yourthis.");
		reason = message.args.length >= 2 ? message.args.splice(1).join(" ") : "No Reason Specified";
		message.channel.guild.banMember(user.id,7,`Hackban: ${message.author.username}#${message.author.discriminator} -> ${reason}`).then(() => {
			message.channel.createMessage(`***User ${user.username}#${user.discriminator} was banned, ${reason}***`).catch(noerr => null);
		}).catch(async(err) => {
			message.channel.createMessage(`I couldn't hackban **${user.username}#${user.discriminator}**, ${err}`);
			if(m !== undefined) {
				await m.delete();
			}
		});
   
		if(!message.gConfig.deleteCommands && message.channel.permissionsOf(this.bot.user.id).has("manageMessages")) message.delete().catch(error => null);
	})
};