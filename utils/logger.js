import chalk from 'chalk';

export class Logger {
  static info(message) {
    console.log(chalk.blue('ℹ'), message);
  }

  static success(message) {
    console.log(chalk.green('✓'), message);
  }

  static error(message) {
    console.log(chalk.red('✗'), message);
  }

  static warn(message) {
    console.log(chalk.yellow('⚠'), message);
  }

  static header(message) {
    console.log('\n' + chalk.bold.cyan('═'.repeat(60)));
    console.log(chalk.bold.cyan(message));
    console.log(chalk.bold.cyan('═'.repeat(60)));
  }

  static subheader(message) {
    console.log('\n' + chalk.bold.white(message));
    console.log(chalk.gray('─'.repeat(60)));
  }

  static metric(label, value, unit = '') {
    const paddedLabel = label.padEnd(25);
    console.log(`  ${chalk.gray(paddedLabel)}: ${chalk.white(value)}${unit ? ' ' + chalk.gray(unit) : ''}`);
  }

  static table(headers, rows) {
    const colWidths = headers.map((h, i) =>
      Math.max(h.length, ...rows.map(r => String(r[i] || '').length)) + 2
    );

    const headerRow = headers.map((h, i) =>
      chalk.bold.cyan(h.padEnd(colWidths[i]))
    ).join(' │ ');

    console.log('\n  ' + headerRow);
    console.log('  ' + colWidths.map(w => '─'.repeat(w)).join('─┼─'));

    rows.forEach(row => {
      const rowStr = row.map((cell, i) =>
        String(cell).padEnd(colWidths[i])
      ).join(' │ ');
      console.log('  ' + rowStr);
    });
    console.log();
  }

  static separator() {
    console.log();
  }
}
