import SubCommand from "../../../util/CommandHandler/lib/SubCommand";

export default new SubCommand({
	triggers: [
		"restart"
	],
	userPermissions: [],
	botPermissions: [],
	cooldown: 0,
	donatorCooldown: 0,
	description: "Restart a shard.",
	usage: "<id>",
	features: ["helperOnly"],
	file: __filename
}, (async function (msg, uConfig, gConfig, cmd) {
	if (msg.args.length < 1) return new Error("ERR_INVALID_USAGE");

	const s = Number(msg.args[0]);
	if (!this.shards.has(s)) return msg.reply(`invalid shard id "${s}".`);

	this.shards.get(s).disconnect();
	return msg
		.reply(`restarting shard **#${s}**.`)
		.then(() =>
			this.shards.get(s).connect()
		);
}));
