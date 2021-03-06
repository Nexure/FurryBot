import Command from "../../util/CommandHandler/lib/Command";

export default new Command({
	triggers: [
		"blacklist",
		"bl"
	],
	userPermissions: [],
	botPermissions: [],
	cooldown: 0,
	donatorCooldown: 0,
	description: "Manage the bots blacklist.",
	usage: "<add/check/list/remove> [user(s)/server(s)] [id] [reason]",
	features: ["helperOnly"],
	subCommandDir: `${__dirname}/blacklist-subcmd`,
	file: __filename
}, (async function (msg, uConfig, gConfig, cmd) {
	if (msg.args.length === 0) return cmd.sendSubCommandEmbed(msg);
	else return cmd.handleSubCommand(msg, uConfig, gConfig, this);
}));
