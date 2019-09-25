import Command from "./Command";
import chalk from "chalk";

class CooldownHandler {
	private _cooldowns: {
		[k: string]: {
			startTime: number;
			time: number;
			user: string;
			timeout: NodeJS.Timeout;
		}[];
	};
	private _inHandler: boolean;
	constructor(commands: Command[]) {
		this._cooldowns = {};
		this._cooldowns = commands.map(c => c.triggers).map(t => t[0]).reduce((a, b) => a.concat(b), []).map(c => ({ [c]: [] })).reduce((a, b) => {
			a[Object.keys(b)[0]] = Object.values(b)[0];
			return a;
		}, {});
		if (!this._cooldowns || typeof this._cooldowns !== "object") this._cooldowns = {};

		this._inHandler = true;
	}

	addCommand(cmd: Command | string): this {
		if (!this._inHandler) throw new TypeError("Cooldown handler add called with invalid context."); let c;
		if (cmd instanceof Command) c = cmd.triggers[0].toLowerCase();
		else c = cmd.toLowerCase();
		console.debug(`Added label "${c}"`, null, chalk.magentaBright("CommandHandler"));
		if (Object.keys(this._cooldowns).map(k => k.toLowerCase()).includes(c)) throw new TypeError("Duplicate command.");

		this._cooldowns[c] = [];

		return this;
	}

	setCooldown(cmd: Command | string, time: number, user: string): this {
		if (!this._inHandler) throw new TypeError("Cooldown handler set called with invalid context.");
		let c;
		if (cmd instanceof Command) {
			if (!time) time = cmd.cooldown;
			c = cmd.triggers[0].toLowerCase();
		}
		else {
			if (!time) time = 0;
			c = cmd.toLowerCase();
		}

		if (!Object.keys(this._cooldowns).includes(c)) {
			console.warn(`Cooldown label "${c}" auto created. Cooldown attempted to be set for non-existent label.`, null, chalk.magentaBright("CommandHandler"));
			this.addCommand(c);
		}

		console.debug(`Set cooldown for "${user}" on "${c}" for "${time}"`, null, chalk.magentaBright("CommandHandler"));
		this._cooldowns[c].push({
			startTime: Date.now(),
			time,
			user,
			timeout: setTimeout(this.removeCooldown.bind(this), time, c, user)
		});
		return this;
	}

	removeCooldown(cmd: Command | string, user: string): this {
		if (!this._inHandler) throw new TypeError("Cooldown handler remove called with invalid context.");
		let c;
		if (cmd instanceof Command) c = cmd.triggers[0].toLowerCase();
		else c = cmd.toLowerCase();
		console.debug(`Remove cooldown of "${c}" for user "${user}"`, null, chalk.magentaBright("CommandHandler"));

		const d = this._cooldowns[c].filter(d => d.user === user);

		do {
			const j = d.shift();
			this._cooldowns[c].splice(this._cooldowns[c].indexOf(j));
		} while (d.length > 0);
		return this;
	}

	checkCooldown(cmd: Command | string, user: string): { c: boolean; time: number; } {
		if (!this._inHandler) throw new TypeError("Cooldown handler check called with invalid context.");
		let c;
		if (cmd instanceof Command) c = cmd.triggers[0].toLowerCase();
		else c = cmd.toLowerCase();
		console.debug(`Checking cooldown of "${c}" for user "${user}"`, null, chalk.magentaBright("CommandHandler"));

		const down = this._cooldowns[c].filter(d => d.user === user);
		if (!down || down.length < 1) return {
			c: false,
			time: 0
		};

		let time = (Date.now() - down[0].startTime) - down[0].time;
		console.log(time);
		if (time > 0) time = 0;
		return {
			c: true,
			time: Math.abs(time)
		};
	}
}

export default CooldownHandler;