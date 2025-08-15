import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CommandData } from '../../types/commandTypes';

const mc_blockSpacing: CommandData = {
	data: new SlashCommandBuilder()
		.setName('mc_block_spacing')
		.setDescription('Find evenly spaced positions along a length, including both ends.')
		.addIntegerOption((option) => option.setName('blocks').setDescription('Total number of blocks in the line (including both ends)').setMinValue(2).setRequired(true)),
	state: 'enabled',
	devOnly: false,
	async execute(client, interaction) {
		const blocks = interaction.options.getInteger('blocks', true);
		const span = blocks - 1;
		const spacings: string[] = [];

		for (let placements = 2; placements <= blocks; placements++) {
			const gaps = placements - 1;
			if (span % gaps === 0) {
				const distance = span / gaps;
				const blocksBetween = distance - 1;
				// Skip options with zero space between placements
				if (blocksBetween > 0) {
					spacings.push(`Total placements: ${placements}\nSpace between each: ${blocksBetween} block${blocksBetween === 1 ? '' : 's'}`);
				}
			}
		}

		const limitedSpacings = spacings.slice(0, 5);
		const centerType = blocks % 2 === 1 ? 'single center block (odd length)' : 'double center (even length)';

		const embed = new EmbedBuilder()
			.setTitle('Block Spacing Calculator')
			.setImage(`${process.env.API_URI}/static/imgs/dash-line.png`)
			.setColor(client.color)
			.setDescription(
				`You chose a line that is **${blocks}** blocks long.\n` +
					`This means your build has a **${centerType}**.\n` +
					(spacings.length === 2 && blocks > 4
						? 'With this length, you can only place blocks at both ends or fill every spot. Try a different length for more options.'
						: spacings.length === 0
						? 'No even spacing options are available for this block length. Please try another number.'
						: 'Here are your evenly spaced placement options:')
			);

		if (limitedSpacings.length) {
			embed.addFields(
				limitedSpacings.map((s, i) => ({
					name: `Option ${i + 1}`,
					value: s,
					inline: false,
				}))
			);
		}

		await interaction.reply({ embeds: [embed] });
	},
};

export default mc_blockSpacing;
