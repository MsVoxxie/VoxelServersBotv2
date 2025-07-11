import { Instance } from '@neuralnexus/ampapi';

// Instances is missing its WelcomeMessage string property
export interface ExtendedInstance extends Instance {
	WelcomeMessage: string | '';
}
