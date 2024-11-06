import dotenv from 'dotenv';

import { Client, GatewayIntentBits, Poll, PollAnswer } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { SlashCommandBuilder } from '@discordjs/builders';

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
    new SlashCommandBuilder()
        .setName('guess')
        .setDescription('Guess the result of the game!')
        .addStringOption(
            option => option
                .setName('choice')
                .setDescription('Your guess (en or jp)')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('en-or-jp')
        .setDescription(
            'Create a poll for users to vote.\n'
        )
        .addIntegerOption(
            option => option
                .setName('hour')
                .setDescription('Duration of the poll in hours (default to 0 hours)')
                .setMaxValue(24)
                .setMinValue(0)
        )
        .addIntegerOption(
            option => option
            .setName('min')
            .setDescription('Duration of the poll in minutes (default to 0 minutes)')
            .setMaxValue(60)
            .setMinValue(0)
        )
        .addIntegerOption(
            option => option
            .setName('sec')
            .setDescription('Duration of the poll in seconds (default to 0 seconds)')
            .setMaxValue(60)
            .setMinValue(0)
        )
];

const rest = new REST().setToken(process.env.TOKEN);

console.log('Attempting to register slash commands...');
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
            body: commands,
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.once('ready', () => {
    console.log('Bot is online!');
});

const enLink = "https://www.youtube.com/watch?v=TNaZqNzmhmI";
const jpLink = "https://www.youtube.com/watch?v=qBLpyQ85q1o";

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    // Handle the /guess command
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
            await interaction.reply(
                `You guessed correctly! The result was: **${botChoice}**.\n`
                + (botChoice === "en") ? enLink : jpLink,
            );
            
        } else {
            await interaction.reply(
                `You guessed wrong! The result was: **${botChoice}**.\n`
                +(botChoice === "en") ? enLink : jpLink,
            );
        }
    }
    
    // Handle the /en-or-jp (Guessing game) command
    if (commandName === 'en-or-jp') {
        const durationHour = interaction.options.getInteger('hour');  // Get poll duration in hours
        const durationMin = interaction.options.getInteger('min');  // Get poll duration in minutes
        const durationSec = interaction.options.getInteger('sec');  // Get poll duration in seconds

        const pollDuration = (durationHour*3600 + durationMin*60 + durationSec)*1000; // Convert it to miliseconds

        const ANSWER_ID = {
            EN: 1,
            JP: 2,
        }

        // Send the poll message using the Create Message API
        try {                  
            const channel = interaction.channel;  // Get the channel where the command was used

            // Reply to the interaction immediately
            await interaction.reply({ content: 'Creating the poll...' });

            const message = await channel.send({
                poll: {
                    question: { text: "en or jp" },
                    answers: [
                        {
                            text: "en",
                        },
                        { 
                            text: "jp",
                        },
                    ],
                    allow_multiselect: false,
                },
            });

            setTimeout(async () => {
                const result = rest.post(`/channels/${channel.id}/polls/${message.id}/expire`);      
    
                try {
                    // TODO: FIGURE OUT HOW THIS SHIT WORK
                    const enAns = await rest.get(`/channels/${channel.id}/polls/${message.id}/answers/${ANSWER_ID.EN}`);
                    const jpAns = await rest.get(`/channels/${channel.id}/polls/${message.id}/answers/${ANSWER_ID.JP}`);
                } catch (error) {
                    console.error('Error retrieving users list:', error);
                    console.log('en: ' + enAns);
                    console.log('jp: ' + jpAns);
                }            
    
                // Randomly pick 'en' or 'jp' as the bot's choice
                const botChoice = Math.random() < 0.5 ? 'en' : 'jp';
    
                await channel.send({
                    content: `The result was: **${botChoice}**.\n` + ((botChoice === "en") ? enLink : jpLink),
                });
    
            }, pollDuration);
        } catch (error) {
            console.error('Error sending poll message:', error);
            await interaction.reply('There was an error creating the poll!');
        }
    }
});

client.login(process.env.TOKEN);
