import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages
    ] 
});

client.once('ready', () => {
    console.log('Bot is online!');
});

client.on('messageCreate', message => {
    if (message.content.toLowerCase().startsWith('!guess')) {
        const args = message.content.split(' ');
        const userGuess = args[1];

        if (userGuess !== 'en' && userGuess !== 'jp') {
            message.reply('Please guess either "en" or "jp"!');
            return;
        }

        const outcomes = ['en', 'jp'];
        const botChoice = outcomes[Math.floor(Math.random() * outcomes.length)];

        if (userGuess === botChoice) {
            message.reply(`Correct! It was "${botChoice}". 🎉`);
        } else {
            message.reply(`Sorry, it was actually "${botChoice}". Better luck next time!`);
        }
    }
});

client.login(process.env.TOKEN);
