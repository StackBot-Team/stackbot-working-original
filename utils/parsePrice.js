module.exports = function parseAbbreviatedPrice(input) {
   const normalized = input.toLowerCase().replace(/,/g, '').trim();

   const match = normalized.match(/^([\d.]+)([kmb])?$/);
   if (!match) return null;

   const number = parseFloat(match[1]);
   const suffix = match[2];

   if (isNaN(number)) return null;

   switch (suffix) {
      case 'k': return Math.round(number * 1_000);
      case 'm': return Math.round(number * 1_000_000);
      case 'b': return Math.round(number * 1_000_000_000);
      default: return Math.round(number);
   }
};
