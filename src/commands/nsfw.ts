import client from "../../index";
import FurryBot from "../main";
import ExtendedMessage from "../modules/extended/ExtendedMessage";
import functions from "../util/functions";
import config from "../config";
import { Command, CommandError } from "../util/CommandHandler";
import * as Eris from "eris";
import phin from "phin";
import { mongo } from "../modules/Database";
import ReactionQueue from "../util/queue/ReactionQeueue";

type CommandContext = FurryBot & { _cmd: Command };

client.cmdHandler
	.addCategory({
		name: "nsfw",
		displayName: ":smirk: NSFW",
		devOnly: false,
		description: "That stuff your parents warned you about >~>"
	})
	.addCommand({
		triggers: [
			"bulge",
			"bulgie"
		],
		userPermissions: [],
		botPermissions: [
			"attachFiles"
		],
		cooldown: 3e3,
		donatorCooldown: 1.5e3,
		description: "*notices bulge* OwO",
		usage: "",
		features: ["nsfw"],
		category: "nsfw",
		run: (async function (this: CommandContext, msg: ExtendedMessage) {
			let img, short, extra;
			img = await functions.imageAPIRequest(false, "bulge", true, false);
			if (img.success !== true) {
				this.logger.error(img, msg.guild.shard.id);
				return msg.channel.createMessage(`<@!${msg.author.id}>, API Error:\nCode: ${img.error.code}\nDescription: \`${img.error.description}\``);
			}
			short = await functions.shortenURL(img.response.image);
			extra = short.new ? `**this is the first time this has been viewed! Image #${short.linkNumber}**\n\n` : "";
			return msg.channel.createMessage(`${extra}Short URL: <${short.link}>\n\nRequested By: ${msg.author.username}#${msg.author.discriminator}`, {
				file: await functions.getImageFromURL(img.response.image),
				name: img.response.name
			});
		})
	})
	.addCommand({
		triggers: [
			"e621",
			"e6"
		],
		userPermissions: [],
		botPermissions: [
			"embedLinks",
			"attachFiles"
		],
		cooldown: 3e3,
		donatorCooldown: 3e3,
		description: "Get some content from E621!",
		usage: "[tags]",
		features: ["nsfw", "devOnly"],
		category: "nsfw",
		run: (async function (this: CommandContext, msg: ExtendedMessage) {
			if (this.activeReactChannels.includes(msg.channel.id)) return msg.reply("There is already an active reaction menu in this channel. Please wait for that one to timeout before starting another.");

			console.log(this);

			const colors = {
				green: 3066993,
				gold: 15844367,
				red: 15158332
			};

			const tags = msg.args.map(a => a.replace(/,\|/g, "")).filter(t => !t.toLowerCase().startsWith("order:"));
			if (tags.length > 5) return msg.reply("you can only specify up to five (5) tags.");

			const bl = tags.filter(t => config.tagBlacklist.includes(t.toLowerCase()));
			if (bl !== null && bl.length > 0) return msg.channel.createMessage(`Your search contained blacklisted tags, **${bl.join("**, **")}**`);

			const e = await this.e6.listPosts([...tags, "order:score"], 50, 1, null, config.tagBlacklist);

			let currentPost = 1;

			const embed: Eris.EmbedOptions = {
				title: `#${e[currentPost - 1].id}: ${e[currentPost - 1].artist.join(", ").length > 256 ? "Too many artists to list." : e[currentPost - 1].artist.join(", ")}`,
				url: `https://e621.net/post/show/${e[currentPost - 1].id}`,
				footer: {
					icon_url: "https://e621.net/favicon-32x32.png",
					text: `Rating: ${e[currentPost - 1].rating === "s" ? "Safe" : e[currentPost - 1].rating === "q" ? "Questionable" : "Explicit"} | Score: ${e[currentPost - 1].score} - ${currentPost}/${e.length}`
				},
				color: e[currentPost - 1].rating === "s" ? colors.green : e[currentPost - 1].rating === "q" ? colors.gold : colors.red,
				timestamp: new Date().toISOString()
			};

			let ratelimit = false;

			const rl = setInterval(() => ratelimit = false, 3e3);

			if (["jpg", "png", "gif"].includes(e[currentPost - 1].file_ext)) embed.image = {
				width: e[currentPost - 1].width,
				height: e[currentPost - 1].height,
				url: e[currentPost - 1].file_url
			};
			else if (e[currentPost - 1].file_ext === "swf") embed.description = `This post is a flash animation, please directly view [the post](https://e621.net/post/show/${e[currentPost - 1].id}) on e621`;
			else embed.description = `This post appears to be a video, please directly view [the post](https://e621.net/post/show/${e[currentPost - 1].id}) on e621`;
			/*else embed.image = {
				width: e[currentPost - 1].width,
				height: e[currentPost - 1].height,
				url: e[currentPost - 1].file_url
			};*/

			const m = await msg.channel.createMessage({ embed });
			const q = new ReactionQueue(m);

			const r = [
				"⏮",
				"◀",
				"⏹",
				"▶",
				"⏭"
			];

			r.map(e => q.add({ type: "add", user: "@me", reaction: e }));

			let t = setTimeout(setPost.bind(this), 6e4, "EXIT");
			async function setPost(this: FurryBot, p: string | number) {
				if (ratelimit) return msg.reply("You are being ratelimited! Please wait a bit more before navigating posts!").then(m => setTimeout(() => m.delete().catch(err => null), 5e3)).catch(err => null);
				ratelimit = true;
				clearTimeout(t);
				t = setTimeout(setPost.bind(this), 6e4, "EXIT");

				if (p === "EXIT") {
					clearTimeout(t);
					q.add({
						type: "remove",
						reaction: null,
						user: null
					});
					this.removeListener("messageReactionAdd", f);
					if (q.entries.length > 0) {
						let count = 0;
						const cI = setInterval(async () => {
							if (q.entries.length === 0 || ++count >= 20) {
								q.destroy();
								await m.removeReactions().catch(err => null);
								clearInterval(cI);
								clearInterval(rl);
								this.activeReactChannels.splice(this.activeReactChannels.indexOf(msg.channel.id), 1);
							}
						}, 1e2);
					}
				} else currentPost++;

				if (currentPost === 0) currentPost = e.length;
				if (currentPost === e.length + 1) currentPost = 1;

				const embed: Eris.EmbedOptions = {
					title: `#${e[currentPost - 1].id}: ${e[currentPost - 1].artist.join(", ").length > 256 ? "Too many artists to list." : e[currentPost - 1].artist.join(", ")}`,
					url: `https://e621.net/post/show/${e[currentPost - 1].id}`,
					footer: {
						icon_url: "https://e621.net/favicon-32x32.png",
						text: `Rating: ${e[currentPost - 1].rating === "s" ? "Safe" : e[currentPost - 1].rating === "q" ? "Questionable" : "Explicit"} | Score: ${e[currentPost - 1].score} - ${currentPost}/${e.length}`
					},
					color: e[currentPost - 1].rating === "s" ? colors.green : e[currentPost - 1].rating === "q" ? colors.gold : colors.red,
					timestamp: new Date().toISOString()
				};

				if (["jpg", "png", "gif"].includes(e[currentPost - 1].file_ext)) embed.image = {
					width: e[currentPost - 1].width,
					height: e[currentPost - 1].height,
					url: e[currentPost - 1].file_url
				};
				else if (e[currentPost - 1].file_ext === "swf") embed.description = `This post is a flash animation, please directly view [the post](https://e621.net/post/show/${e[currentPost - 1].id}) on e621`;
				else embed.description = `This post appears to be a video, please directly view [the post](https://e621.net/post/show/${e[currentPost - 1].id}) on e621`;

				await m.edit({ embed });

			}

			const f = (async (ms: Eris.PossiblyUncachedMessage, emoji: Eris.Emoji, user: string) => {
				if (ms.id !== m.id || user !== msg.author.id || !r.includes(emoji.name)) {
					if (user !== this.user.id && r.includes(emoji.name)) return q.add({
						type: "remove",
						reaction: emoji.id !== null ? `${emoji.name}:${emoji.id}` : emoji.name,
						user
					});
					else return;
				}

				switch (emoji.name) {
					case "⏮":
						await setPost.call(this, 1);
						break;

					case "◀":
						await setPost.call(this, currentPost - 1);
						break;

					case "⏹":
						await setPost.call(this, "EXIT");
						break;

					case "▶":
						await setPost.call(this, currentPost + 1);
						break;

					case "⏭":
						await setPost.call(this, e.length);
						break;

					default:
						return;
				}

				return q.add({
					type: "remove",
					reaction: emoji.name,
					user
				});
			});

			this.on("messageReactionAdd", f);
			this.activeReactChannels.push(msg.channel.id);
		})
	})
	.addCommand({
		triggers: [
			"fursuitbutts",
			"fursuitbutt"
		],
		userPermissions: [],
		botPermissions: [
			"attachFiles"
		],
		cooldown: 3e3,
		donatorCooldown: 1.5e3,
		description: "See some fursuit booties!",
		usage: "",
		features: ["nsfw"],
		category: "nsfw",
		run: (async function (this: CommandContext, msg: ExtendedMessage) {
			let img, short, extra;
			img = await phin({
				url: "https://api.fursuitbutts.com/butts",
				parse: "json"
			});

			if (img.statusCode !== 200) {
				this.logger.error(img, msg.guild.shard.id);
				return msg.channel.createMessage(`<@!${msg.author.id}>, Unknown api error.`);
			}
			short = await functions.shortenURL(img.body.response.image);
			extra = short.new ? `**this is the first time this has been viewed! Image #${short.linkNumber}**\n\n` : "";
			return msg.channel.createMessage(`${extra}Short URL: <${short.link}>\n\nRequested By: ${msg.author.username}#${msg.author.discriminator}`, {
				file: await functions.getImageFromURL(img.body.response.image),
				name: img.body.response.name
			});
		})
	})
	.addCommand({
		triggers: [
			"linkroulette",
			"lr"
		],
		userPermissions: [],
		botPermissions: [
			"attachFiles"
		],
		cooldown: 3e3,
		donatorCooldown: 1.5e3,
		description: "Fetch a random short url - high chance to be nsfw!",
		usage: "",
		features: ["nsfw"],
		category: "nsfw",
		run: (async function (this: CommandContext, msg: ExtendedMessage) {
			let embed;

			let s: any[] | any = await mongo.db("furrybot").collection("shorturl").find().toArray();

			if (s.length === 0) return msg.reply("No results were found.");

			s = s[Math.floor(Math.random() * s.length)];
			if (!s) return msg.reply("Command produced an invalid selection.");

			embed = {
				title: "Link Roulette",
				description: `[${s.link}](${s.link}) - **Link #${s.linkNumber}**`
			};

			Object.assign(embed, msg.embed_defaults());

			return msg.channel.createMessage({ embed });
		})
	})
	.addCommand({
		triggers: [
			"yiff"
		],
		userPermissions: [],
		botPermissions: [
			"attachFiles"
		],
		cooldown: 3e3,
		donatorCooldown: 1.5e3,
		description: "Get some yiff!",
		usage: "[gay/straight/lesbian/dickgirl]",
		features: ["nsfw"],
		category: "nsfw",
		run: (async function (this: CommandContext, msg: ExtendedMessage) {
			let extra = "", type, embed, short;
			if (msg.args.length === 0) {
				for (const ytype of config.yiff.types) {
					if (msg.channel.name.indexOf(ytype) !== -1) type = ytype;
				}

				if (!type) {
					type = config.yiff.types[0];
					if (!this.yiffNoticeViewed.has(msg.channel.guild.id)) {
						this.yiffNoticeViewed.add(msg.channel.guild.id);
						extra += `Showing default yiff type **${type}**\nTo change this, add one of these values somewhere in the channel __name__: **${config.yiff.types.join("**, **")}**.\n\n`;
					}
				}

			} else {
				type = msg.args.join(" ");
				if (!config.yiff.types.includes(type)) {
					embed = {
						title: "Invalid yiff type",
						description: `The type you provided **${type}** is invalid, valid types are: **${config.yiff.types.join("**, **")}**.`
					};
					Object.assign(embed, msg.embed_defaults());
					return msg.channel.createMessage({ embed });
				}
			}

			const img = await functions.imageAPIRequest(false, `yiff/${type}`, true, false);
			if (img.success !== true) {
				if (typeof img.error === "object") return msg.channel.createMessage(`<@!${msg.author.id}>, API Error:\nCode: ${img.error.code}\nDescription: \`${img.error.description}\``);
				else return msg.channel.createMessage(`<@!${msg.author.id}>, API Error:\n${img.error}`);
			}
			short = await functions.shortenURL(img.response.image);
			extra += short.new ? `**this is the first time this has been viewed! Image #${short.linkNumber}**\n\n` : "";
			return msg.channel.createMessage(`${extra}Short URL: <${short.link}>\n\nType: ${type}\n\nRequested By: ${msg.author.username}#${msg.author.discriminator}`, {
				file: await functions.getImageFromURL(img.response.image),
				name: img.response.name
			});
		})
	});

export default null;