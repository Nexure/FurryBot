import FurryBot from "@FurryBot";
import ExtendedMessage from "@src/modules/extended/ExtendedMessage";
import Command from "@modules/cmd/Command";
import * as Eris from "eris";
import functions from "@util/functions";
import * as util from "util";
import phin from "phin";
import config from "@config";

export default new Command({
	triggers: [
		"gay",
		"homo"
	],
	userPermissions: [],
	botPermissions: [
		"attachFiles"
	],
	cooldown: 5e3,
	description: "Gay up an image",
	usage: "[image]",
	nsfw: false,
	devOnly: false,
	betaOnly: false,
	guildOwnerOnly: false,
	path: __filename,
	hasSubCommands: functions.hasSubCmds(__dirname, __filename),
	subCommands: functions.subCmds(__dirname, __filename)
}, (async function (this: FurryBot, msg: ExtendedMessage): Promise<any> {
	let user, imgurl, m, req, j;
	if (msg.args.length >= 1) {
		// get member from message
		user = await msg.getUserFromArgs();
		imgurl = user instanceof Eris.User ? user.staticAvatarURL : msg.unparsedArgs.join("%20");
	} else if (msg.attachments[0]) imgurl = msg.attachments[0].url;
	else imgurl = msg.author.staticAvatarURL;

	if (!imgurl) return msg.reply("please either attach an image or provide a url");
	req = await functions.memeRequest("/gay", [imgurl]);
	if (req.statusCode !== 200) {
		try {
			j = { status: req.statusCode, message: JSON.stringify(req.body) };
		} catch (error) {
			j = { status: req.statusCode, message: req.body };
		}
		msg.reply(`API eror:\nStatus: ${j.status}\nMessage: ${j.message}`);
		return this.logger.log(`imgurl: ${imgurl}`);
	}
	return msg.channel.createMessage("", {
		file: req.body,
		name: "gay.png"
	}).catch(err => msg.reply(`Error sending: ${err}`));
}));