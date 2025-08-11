
const match = desc.match(
  /^(.+?) has (deposited|withdrawn) ((?:[\d,]+|one)) coin[s]?\b/i
);
if (!match) return;

const amountStr = match[3].toLowerCase();
let amount;
if (amountStr === 'one') {
  amount = 1;
} else {
  // strip commas and parse
  amount = parseInt(amountStr.replace(/,/g, ''), 10);
}
