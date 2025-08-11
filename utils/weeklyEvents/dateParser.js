function parseDate(dateStr) {

  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

module.exports = { parseDate };
