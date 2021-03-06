import Command from "../../util/CommandHandler/lib/Command";
import { Utility } from "../../util/Functions";

export default new Command({
	triggers: [
		"iam",
		"roleme"
	],
	userPermissions: [],
	botPermissions: [
		"manageRoles"
	],
	cooldown: 5e3,
	donatorCooldown: 5e3,
	features: [],
	file: __filename
}, (async function (msg, uConfig, gConfig, cmd) {
	if (msg.args.length === 0) throw new Error("ERR_INVALID_USAGE");
	const roles = gConfig.selfAssignableRoles.map(a => {
		const b = msg.channel.guild.roles.get(a);
		if (!b) return { id: null, name: null };
		return { name: b.name.toLowerCase(), id: a };
	});
	if (!roles.map(r => r.name).includes(msg.args.join(" ").toLowerCase())) {
		if (msg.channel.guild.roles.find(r => r.name.toLowerCase() === msg.args.join(" ").toLowerCase())) return msg.reply(`{lang:commands.utility.iam.notAssignable}`);
		return msg.reply(`{lang:commands.utility.iam.notFound}`);
	}
	let role;
	role = roles.filter(r => r.name === msg.args.join(" ").toLowerCase());
	if (!role || role.length === 0) return msg.reply("{lang:commands.utility.iam.notFund}");
	role = role[0];
	if (msg.member.roles.includes(role.id)) return msg.reply(`{lang:commands.utility.iam.alreadyHave|${gConfig.settings.prefix}}`);
	const a = Utility.compareMemberWithRole(msg.channel.guild.members.get(this.user.id), role);
	if (a.higher || a.same) return msg.reply(`{lang:commands.utility.iam.higher}`);
	await msg.member.addRole(role.id, "iam command");

	// await msg.gConfig.modlog.add({ blame: this.client.user.id, action: "removeRole", role: role.id, reason: "iamnot command", userId: msg.author.id, timestamp: Date.now() });
	return msg.reply(`{lang:commands.utility.iam.given|${role.name}}`);
}));
