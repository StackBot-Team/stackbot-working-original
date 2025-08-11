function formatCurrency(value, short = true) {
   if (!short) return `${value.toLocaleString()} gp`;

   const format = (val, suffix) => {
      const rounded = (val).toFixed(1);
      return `${rounded.endsWith('.0') ? parseInt(rounded) : rounded}${suffix} gp`;
   };

   if (value >= 1_000_000_000) return format(value / 1_000_000_000, 'B');
   if (value >= 1_000_000) return format(value / 1_000_000, 'M');
   if (value >= 1_000) return format(value / 1_000, 'K');
   return `${value} gp`;
}

module.exports = { formatCurrency };
