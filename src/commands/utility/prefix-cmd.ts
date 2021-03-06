import Command from "../../util/CommandHandler/lib/Command";

export default new Command({
	triggers: [
		"prefix"
	],
	userPermissions: [
		"manageGuild"
	],
	botPermissions: [],
	cooldown: 3e3,
	donatorCooldown: 3e3,
	features: [],
	file: __filename
}, (async function (msg, uConfig, gConfig, cmd) {
	if (msg.args.length === 0) return msg.reply(`{lang:commands.utility.prefix.current|${gConfig.settings.prefix}}`);
	if (msg.args.join("").toLowerCase() === gConfig.settings.prefix.toLowerCase()) return msg.reply("{lang:commands.utility.prefix.same}");
	if ([`<@!${this.user.id}>`, `<@${this.user.id}>`].some(t => msg.args.join("").toLowerCase() === t.toLowerCase())) return msg.reply(`{lang:commands.utility.prefix.invalid|${msg.args.join("").toLowerCase()}}`);
	if (msg.args.join("").length > 15) return msg.reply("{lang:commands.utility.prefix.maxLen}");
	const o = gConfig.settings.prefix;
	await gConfig.edit({ settings: { prefix: msg.args.join("").toLowerCase() } }).then(d => d.reload());
	// await msg.gConfig.modlog.add({ blame: this.client.user.id, action: "editSetting", setting: "prefix", oldValue: o, newValue: msg.unparsedArgs.slice(1, msg.unparsedArgs.length).join(" "), timestamp: Date.now() });
	return msg.reply(`{lang:commands.utility.prefix.set|${msg.args.join("").toLowerCase()}}`);
}));
