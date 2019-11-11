const common = require('../common.js');
const {
	Storage,
	saveData,
	addReminder, leaveReminder, leaveAllReminders,
	getMessageLink
} = common;
const Discord = require('discord.js');

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
				let optionString = ' -m'
				let mPosition = suffix.indexOf(optionString);

				common.debug('mPosition: ' + mPosition);

				let dateString = mPosition > -1 ? suffix.substring(0, mPosition) : suffix;
				let taskString = mPosition > -1 ? suffix.substring(mPosition + 1 + optionString.length) : undefined;

				common.debug('dateString: ' + dateString);
				common.debug('taskString: ' + taskString);

				if (mPosition > -1 && taskString.length === 0) {
					msg.channel.send('Missing task after `-m` option.');
					return false;
				}
				
				let date = Date.parse(dateString);
				if (date == null) { // this is right but linter says no
					msg.channel.send('Invalid time/date input!').then(message => message.delete(3000));
					return false;
				}
				let msgLink = getMessageLink(msg);
				let tempText = 'I will remind you about [this message](<' + msgLink + '>) on ' + date + '.' +
				(taskString !== undefined ? '\n> ' + taskString : '');
				let embed = new Discord.RichEmbed()
					.setColor(0x00AE86)
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
						let simpleReminders = common.simplifyCollection(common.getReminders());
						console.log(simpleReminders);
						let reminder;
						if (simpleReminders.has(reminderIndex)) {
							reminder = simpleReminders.get(reminderIndex);
							leaveReminder(msg.author, reminder.id);
						} else {
							msg.channel.send('You don\'t have a reminder #' + reminderIndex + '.');
							return false;
						}
					} else {
						msg.channel.send('<#> must be 0 or greater.');
						return false;
					}
				} else {
					msg.channel.send('<#> must be an integer.');
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
				let simpleReminders = common.simplifyCollection(common.getRemindersOfUser(msg.author));
				let tempText = '';
				simpleReminders.forEach((reminder, index) => {
					tempText += '**#' + (index) + '** ' + common.parseDate(reminder.date);
					if (reminder.task != null) {
						tempText += ' - ' + reminder.task;
					}
					if (index !== simpleReminders.lastKey()) {
						tempText += '\n';
					}
				});
				let embed = new Discord.RichEmbed()
					.setDescription('Here are your reminders, ' + msg.author + '!\n' + tempText);
				msg.channel.send({ embed: embed });
			}
		}
	]
};