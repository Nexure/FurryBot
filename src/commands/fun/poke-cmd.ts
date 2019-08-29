import FurryBot from "@FurryBot";
import ExtendedMessage from "../../modules/extended/ExtendedMessage";
import Command from "../../modules/cmd/Command";
import * as Eris from "eris";
import functions from "../../util/functions";
import * as util from "util";
import phin from "phin";
import config from "../../config";

export default new Command({
	triggers: [
		"poke"
	],
	userPermissions: [],
	botPermissions: [],
	cooldown: 2e3,
	donatorCooldown: 1e3,
	description: "Poke someone!",
	usage: "<@member/string>",
	nsfw: false,
	devOnly: false,
	betaOnly: false,
	guildOwnerOnly: false,
	path: __filename,
	hasSubCommands: functions.hasSubCmds(__dirname, __filename),
	subCommands: functions.subCmds(__dirname, __filename)
}, (async function (this: FurryBot, msg: ExtendedMessage): Promise<any> {
	if (msg.args.length === 0) return new Error("ERR_INVALID_USAGE");
	let input, text;
	input = msg.args.join(" ");
	text = functions.formatStr(msg.c, msg.author.mention, input);
	msg.channel.createMessage(text);
}));