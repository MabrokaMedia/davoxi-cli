import inquirer from 'inquirer';

export async function confirm(message: string): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: false,
    },
  ]);
  return confirmed;
}

export async function promptInput(
  message: string,
  options?: { mask?: boolean; validate?: (input: string) => boolean | string }
): Promise<string> {
  const { value } = await inquirer.prompt([
    {
      type: options?.mask ? 'password' : 'input',
      name: 'value',
      message,
      mask: options?.mask ? '*' : undefined,
      validate: options?.validate || ((v: string) => v.trim().length > 0 || 'This field is required'),
    },
  ]);
  return value;
}

export async function promptSelect(
  message: string,
  choices: Array<{ name: string; value: string }>
): Promise<string> {
  const { value } = await inquirer.prompt([
    {
      type: 'list',
      name: 'value',
      message,
      choices,
    },
  ]);
  return value;
}
