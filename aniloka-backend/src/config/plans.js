/* Central place to edit plan prices/durations — matches the site's
   Weekly / Monthly / Quarterly / Yearly / Lifetime plans. */
module.exports = {
  PLANS: {
    weekly:    { label: "Weekly",    price: 29,   days: 7 },
    monthly:   { label: "Monthly",   price: 89,   days: 30 },
    quarterly: { label: "Quarterly", price: 229,  days: 90 },
    yearly:    { label: "Yearly",    price: 799,  days: 365 },
    lifetime:  { label: "Lifetime",  price: 1999, days: null }, // null days = never expires
  },
};
