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
		"affect"
	],
	userPermissions: [],
	botPermissions: [
		"attachFiles"
	],
	cooldown: 5e3,
	description: "My baby won't be affected.",
	usage: "[image]",
	nsfw: false,
	devOnly: false,
	betaOnly: false,
	guildOwnerOnly: false,
	path: __filename,
	hasSubCommands: functions.hasSubCmds(__dirname, __filename),
	subCommands: functions.subCmds(__dirname, __filename)
}, (async function (this: FurryBot, msg: ExtendedMessage): Promise<any> {
	let user, imgurl, req, j;
	if (msg.args.length >= 1) {
		// get member from message
		user = await msg.getMemberFromArgs();
		imgurl = user instanceof Eris.Member ? user.user.staticAvatarURL : msg.unparsedArgs.join("%20");
	} else if (msg.attachments[0]) imgurl = msg.attachments[0].url;
	else imgurl = msg.author.staticAvatarURL;

	if (!imgurl) return msg.reply("please either attach an image or provide a url");
	const test = await functions.validateURL(imgurl);
	if (!test) return msg.reply("either what you provided wasn't a valid url, or the server responded with a non-200 OK response.");
	req = await functions.memeRequest("/affect", [imgurl]);
	if (req.statusCode !== 200) {
		try {
			j = { status: req.statusCode, message: JSON.stringify(req.body) };
		} catch (error) {
			j = { status: req.statusCode, message: req.body };
		}
		msg.reply(`API eror:\nStatus: ${j.status}\nMessage: ${j.message}`);
		return this.logger.log(`imgurl: ${imgurl}`);
	}
	msg.channel.createMessage("", {
		file: req.body,
		name: "affect.png"
	}).catch(err => msg.reply(`Error sending: ${err}`));
}));