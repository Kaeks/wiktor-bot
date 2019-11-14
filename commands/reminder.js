const common = require('../common.js');
const {
	Discord, chrono,
	addReminder, leaveReminder, leaveAllReminders
} = common;

module.exports = {
	name : 'reminder',
	args : common.argumentValues.NULL,
	sub : [
		{
			name : 'add',
			args : common.argumentValues.REQUIRED,
			usage : '<time/date> [-m <message]',
			description : 'Add a reminder that will remind you until either <time> has passed or remind you on <date>. Optional message after token [-m].',
			execute(msg, suffix) {				
				let optionString = ' -m';
				let mPosition = suffix.indexOf(optionString);

				common.debug('mPosition: ' + mPosition);

				let dateString = mPosition > -1 ? suffix.substring(0, mPosition) : suffix;
				let taskString = mPosition > -1 ? suffix.substring(mPosition + 1 + optionString.length) : '';

				common.debug('dateString: ' + dateString);
				common.debug('taskString: ' + taskString);

				let embed = new Discord.RichEmbed();

				// optionString has been found within the suffix, but nothing follows
				if (mPosition > -1 && taskString.length === 0) {
					embed.setColor(common.colors.RED)
						.setTitle('Missing task!')
						.setDescription('You provided the `-m` option, but it\'s missing a task.');
					msg.channel.send({ embed: embed })
						.then(message => message.delete(5000));
					return false;
				}
				
				let date = chrono.parseDate(dateString, new Date());
				common.debug('Parsed date: ' + date);

				if (date == null) {
					embed.setColor(common.colors.RED)
						.setTitle('Invalid time/date input!')
						.setDescription('`' + dateString + '` could not be converted into a usable timestamp.');
					msg.channel.send({ embed: embed })
						.then(message => message.delete(5000));
					return false;
				}
				let msgLink = msg.getLink();
				let tempText = 'I will remind you about [this message](<' + msgLink + '>) on ' + date + '.' +
				(taskString.length > 0 ? '\n> ' + taskString : '');
				embed.setColor(common.colors.GREEN)
					.setTitle('Reminder set!')
					.setDescription(tempText);
				if (msg.channel.type !== 'dm') {
					embed.setFooter('React to this message with 🙋 if you would also like to be reminded');
				}
				let messagePromise = msg.channel.send({ embed: embed });
				messagePromise.then(botMsg => addReminder(msg, date, taskString, botMsg));
				if (msg.channel.type !== 'dm') {
					messagePromise.then(message => message.react('🙋'));
				}
			}
		},
		{
			name : 'remove',
			args : common.argumentValues.REQUIRED,
			sub : [
				{
					name : 'all',
					args : common.argumentValues.NONE,
					usage : '',
					description : 'Remove all of your reminders.',
					execute(msg) {
						leaveAllReminders(msg.author);
					}
				},
			],
			usage : '<#>',
			description : 'Remove the reminder with list #<#>.',
			execute(msg, suffix) {
				if (!isNaN(suffix)) {
					if (parseInt(suffix, 10) >= 0 ) {
						let reminderIndex = parseInt(suffix, 10);
						let simpleReminders = common.getRemindersOfUser(msg.author).simplify();
						common.debug(simpleReminders);
						let reminder;
						if (simpleReminders.has(reminderIndex)) {
							reminder = simpleReminders.get(reminderIndex);
							if (leaveReminder(msg.author, reminder.id)) {
								let msgLink = reminder.msgLink;
								let embed = new Discord.RichEmbed()
									.setColor(common.colors.GREEN)
									.setTitle('Left reminder!')
									.setDescription(
										msg.author + ' you will no longer be reminded about [this message](<' + msgLink + '>) ' +
										(reminder.task.length > 0 ? '\nwith the task\n> ' + reminder.task + '\n' : '') +
										'on ' + reminder.date + '.'
									);
								msg.channel.send({ embed: embed });
							} else {
								let embed = new Discord.RichEmbed()
									.setColor(common.colors.RED)
									.setTitle('Oops!')
									.setDescription('Something went wrong when trying to remove that reminder from your list.');
								msg.channel.send({ embed: embed });
								return false;
							}
						} else {
							let embed = new Discord.RichEmbed()
								.setColor(common.colors.RED)
								.setTitle('Not found!')
								.setDescription('You don\'t have a reminder #' + reminderIndex + '.');
							msg.channel.send({ embed: embed });
							return false;
						}
					} else {
						let embed = new Discord.RichEmbed()
							.setColor(common.colors.RED)
							.setTitle('Below 0!')
							.setDescription('<#> must be 0 or greater.');
						msg.channel.send({ embed: embed });
						return false;
					}
				} else {
					let embed = new Discord.RichEmbed()
						.setColor(common.colors.RED)
						.setTitle('Not a number!')
						.setDescription('<#> must be an integer.');
					msg.channel.send({ embed: embed });
					return false;
				}
			}
		},
		{
			name : 'list',
			args : common.argumentValues.NONE,
			usage : '',
			description : 'List all reminders',
			execute(msg) {
				let user = msg.author;
				let simpleReminders = common.getRemindersOfUser(user).simplify();
				let embed = new Discord.RichEmbed()
					.setColor(common.colors.GREEN)
					.setTitle('Reminders!')
					.setAuthor(msg.author.username, msg.author.avatarURL);

				let tempText = '';
				if (simpleReminders.size > 0) {
					simpleReminders.forEach((reminder, index) => {
						let realDate = new Date(reminder.date);
						let indexString = '**#' + index + '**';
						let linkString = '[' + common.parseDate(realDate) + '](<' + reminder.msgLink + '>)';
						let taskString = reminder.task.length > 0 ? '\n> ' + reminder.task : '';
						let nl = index !== simpleReminders.lastKey() ? '\n' : '';
						tempText += indexString + ' ' + linkString + taskString + nl;
					});
					embed.setDescription(tempText);

					if (msg.channel.type !== 'dm') {
						let userString =
							msg.channel.type === 'text' ?
								(msg.member.nickname != null ? msg.member.nickname : user.username) + ' (' + user.username + '#' + user.discriminator + ')' :
								msg.channel.type === 'group' ?
									user.username + '#' + user.discriminator :
									'';
						embed.setFooter(
							'Click on the individual reminders to scroll to the message they refer to.' +
							'\nIf the reminder was issued in a DM the link won\'t work for others except for ' + userString + '.');
					}
				} else {
					embed.setDescription('You don\'t have any reminders.');
				}
				msg.channel.send({embed : embed});
			}
		}
	]
};