import dotenv from 'dotenv';

import { Client, GatewayIntentBits, Poll, PollAnswer } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { SlashCommandBuilder } from '@discordjs/builders';

import { enLink, jpLink, ANSWER_ID } from './constants.js';
import { DAYS_TO_MS, HOURS_TO_MS, MINUTES_TO_MS, SECONDS_TO_MS } from './constants.js';
import createPoll from './create-poll.js';

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
        .addStringOption(option => option
            .setName('choice')
            .setDescription('Your guess (en or jp)')
            .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('en-or-jp')
        .setDescription(
            'Create a poll for users to vote.\n'
        )
        .addIntegerOption(option => option
            .setName('hour')
            .setDescription('Duration of the poll in hours (default to 0 hours)')
            .setMaxValue(24)
            .setMinValue(0)
        )
        .addIntegerOption(option => option
            .setName('min')
            .setDescription('Duration of the poll in minutes (default to 0 minutes)')
            .setMaxValue(60)
            .setMinValue(0)
        )
        .addIntegerOption(option => option
            .setName('sec')
            .setDescription('Duration of the poll in seconds (default to 0 seconds)')
            .setMaxValue(60)
            .setMinValue(0)
        ),

    new SlashCommandBuilder()
        .setName('schedule-poll')
        .setDescription('Schedule a poll to be posted at a specific date and repeated at set intervals.')
        .addStringOption(option => option
            .setName('date')
            .setDescription('Date for the first poll (YYYY-MM-DD HH:MM) in GMT+0')
            .setRequired(true))
        .addIntegerOption(option => option
            .setName('poll-duration')
            .setDescription('Poll duration in hours')
            .setRequired(true)
        )
        .addIntegerOption(option => option
            .setName('interval')
            .setDescription('Interval between polls in days')
            .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('stop-ongoing-schedule')
        .setDescription('Stop the ongoing scheduled polls.'),
    
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

let pollIntervalId = null;

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
            await interaction.reply(`You guessed correctly! The result was: **${botChoice}**.`);
            
        } else {
            await interaction.reply(`You guessed wrong! The result was: **${botChoice}**.`);
        }

        await interaction.channel.send({
            content: (botChoice === 'en') ? enLink : jpLink,
        })
    }
    
    // Handle the /en-or-jp (Guessing game) command
    if (commandName === 'en-or-jp') {
        const durationHour = interaction.options.getInteger('hour');  // Get poll duration in hours
        const durationMin = interaction.options.getInteger('min');  // Get poll duration in minutes
        const durationSec = interaction.options.getInteger('sec');  // Get poll duration in seconds

        const pollDuration = (durationHour*3600 + durationMin*60 + durationSec)*1000; // Convert it to miliseconds       

        // Send the poll message using the Create Message API
        try {                  
            const channel = interaction.channel;  // Get the channel where the command was used

            // Reply to the interaction immediately
            await interaction.reply({ content: 'Creating the poll...' });

            // Create poll using Create Message API
            await createPoll(channel, pollDuration, rest);
        } catch (error) {
            console.error('Error sending poll message:', error);
            await interaction.reply('There was an error creating the poll!');
        }
    }

    // Handle the /schedule-poll command
    if (commandName === 'schedule-poll') {
        if (pollIntervalId) {
            await interaction.reply('A poll is already scheduled. Please wait until it completes or use /stop-ongoing-schedule to cancel it.');
            return;
        }

        const startDate = options.getString('date');
        const pollDuration = options.getInteger('poll-duration')
        // const intervalHours = options.getInteger('interval');
        
        const intervalMs = options.getInteger('interval') * DAYS_TO_MS;
    
        // Parse date and interval
        const startDateTime = new Date(startDate);
        // const intervalMs = intervalHours * 60 * 60 * 1000;
    
        // Schedule the first poll
        const schedulePoll = async () => {
            await createPoll(interaction.channel, pollDuration, rest);
    
            // Set the poll to repeat at the given interval
            pollIntervalId = setInterval(async () => {
                await createPoll(interaction.channel, pollDuration, rest);
            }, intervalMs);
        };
    
        // Calculate time until first poll
        const timeUntilFirstPoll = startDateTime.getTime() - Date.now();
        console.log(timeUntilFirstPoll);
        if (timeUntilFirstPoll > 0) {
            setTimeout(schedulePoll, timeUntilFirstPoll);
            await interaction.reply('Poll has been scheduled.');
        } else {
            await interaction.reply('The specified date is in the past.');
        }
    }

    // Handle /stop-ongoing-schedule
    if (commandName === 'stop-ongoing-schedule') {
        if (pollIntervalId) {
            clearInterval(pollIntervalId);
            pollIntervalId = null;
            await interaction.reply('Ongoing scheduled poll has been stopped.');
        } else {
            await interaction.reply('No scheduled poll is currently running.');
        }
    }
});

client.login(process.env.TOKEN);
