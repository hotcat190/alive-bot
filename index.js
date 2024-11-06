import { Client, GatewayIntentBits } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages
    ] 
});

// Register the /guess command
const commands = [
    {
        name: 'guess',
        description: 'Guess either "en" or "jp".',
        options: [
            {
                name: 'choice',
                type: 3, // STRING input
                description: 'Your guess (en or jp)',
                required: true,
            },
        ],
    },
];

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

console.log('Attempting to register slash commands...');
console.log('outside async Client ID:', process.env.CLIENT_ID);

(async () => {
    console.log('inside async Client ID:', process.env.CLIENT_ID);

    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
            body: commands,
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.log(error)
        console.error(error);
    }
});

client.once('ready', () => {
    console.log('Bot is online!');
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'guess') {
        const userGuess = options.getString('choice').toLowerCase();

        // Check if the user's guess is valid
        if (userGuess !== 'en' && userGuess !== 'jp') {
            await interaction.reply('Invalid guess! Please choose either "en" or "jp".');
            return;
        }

        // Randomly pick 'en' or 'jp' as the bot's choice
        const botChoice = Math.random() < 0.5 ? 'en' : 'jp';

        // Compare the user's guess with the bot's choice
        if (userGuess === botChoice) {
            await interaction.reply(`You guessed correctly! The result was: **${botChoice}**.`);
        } else {
            await interaction.reply(`You guessed wrong! The result was: **${botChoice}**.`);
        }
    }
});

client.login(process.env.TOKEN);
