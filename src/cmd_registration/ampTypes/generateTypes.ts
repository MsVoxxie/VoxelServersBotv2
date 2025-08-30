import * as readline from 'readline';
import { getSchedulerData } from '../../utils/ampAPI/taskFuncs';

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
	return new Promise((resolve) => rl.question(query, resolve));
}

async function generateTypes() {
	try {
		const instanceID = await askQuestion('Enter the instance ID: ');
		const instanceType = await askQuestion('Enter the instance type (Minecraft or GenericModule): ');

		if (!['Minecraft', 'GenericModule'].includes(instanceType)) {
			console.error('Invalid instance type. Must be "Minecraft" or "GenericModule".');
			rl.close();
			return;
		}

		const tasks = await getSchedulerData(instanceID, instanceType);

		// Generate type for AvailableMethods (using Name)
		const methods = tasks.AvailableMethods.map((m: any) => m.Name);
		const methodsTypeDef = `export type ${instanceType}AvailableMethods = ${methods.map((m: any) => `'${m}'`).join(' | ')};`;

		// Generate type for AvailableTriggers (using Description)
		const triggers = tasks.AvailableTriggers.map((t: any) => t.Description);
		const triggersTypeDef = `export type ${instanceType}AvailableTriggers = ${triggers.map((t: any) => `'${t}'`).join(' | ')};`;

		console.log('\nGenerated Types:');
		console.log(methodsTypeDef);
		console.log(triggersTypeDef);

		rl.close();
	} catch (error) {
		console.error('Error generating types:', error);
		rl.close();
	}
}

generateTypes();
