// Catalog structure mirrored from the reference store (categories, names, EUR prices, promos).
window.CATEGORIES = [
  { id: "injectable", name: "Injectable", count: 17 },
  { id: "oral", name: "Oral", count: 17 },
  { id: "hgh", name: "HGH", count: 6 },
  { id: "peptides", name: "Peptides", count: 18 },
  { id: "weight-loss", name: "Weight loss", count: 5 },
];

window.PRODUCTS = [
  { id: "testosterone-enanthate", name: "Testosterone Enanthate", sub: "Medium-slow acting ester", cat: "injectable", price: 36, promo: 10, reviews: 21, best: true },
  { id: "testosterone-cypionate", name: "Testosterone Cypionate", sub: "Medium-slow acting ester", cat: "injectable", price: 35, reviews: 9, best: true },
  { id: "oxandrolone", name: "Oxandrolone", sub: "Anavar", cat: "oral", price: 49, promo: 10, reviews: 3, best: true },
  { id: "sustanon-250", name: "Sustanon 250", sub: "Fast onset + long duration", cat: "injectable", price: 36, reviews: 5, best: true },
  { id: "clenbuterol", name: "Clenbuterol", sub: "Clen", cat: "oral", price: 21, reviews: 4, best: true },
  { id: "boldenone", name: "Boldenone", sub: "Equipoise EQ", cat: "injectable", price: 42, reviews: 3, best: true },
  { id: "testosterone-propionate", name: "Testosterone Propionate", sub: "Fast-acting ester", cat: "injectable", price: 29, reviews: 3, best: true },
  { id: "methandienone", name: "Methandienone", sub: "Dianabol", cat: "oral", price: 24, reviews: 2, best: true },
  { id: "stanozolol", name: "Stanozolol", sub: "Winstrol", cat: "oral", price: 30, reviews: 1, best: true },
  { id: "bpc-157", name: "BPC-157", sub: "Tissue repair peptide", cat: "peptides", price: 55, reviews: 2, fresh: true },
  { id: "nad", name: "NAD+", sub: "Cellular energy & longevity", cat: "peptides", price: 65, reviews: 0, fresh: true },
  { id: "ss-31", name: "SS-31 Elamipretide", sub: "Longevity peptide", cat: "peptides", price: 56, reviews: 0, fresh: true },
  { id: "mots-c", name: "MOTS-C", sub: "Performance & endurance", cat: "peptides", price: 48, reviews: 0, fresh: true },
  { id: "ipamorelin", name: "Ipamorelin", sub: "Recovery peptide", cat: "peptides", price: 51, reviews: 0, fresh: true },
  { id: "enclomiphene", name: "Enclomiphene", sub: "Citrate", cat: "oral", price: 32, reviews: 4, fresh: true },
];

window.FAQ = [
  ["Do you ship to my country?", "We ship across the EU from EU stock. Delivery times are shown at checkout."],
  ["Is an account required to order?", "No. You can check out as a guest; an account lets you track orders and earn store coins."],
  ["Is packaging discreet?", "Yes. Every order ships in plain, unbranded packaging."],
  ["Are there bulk discounts?", "Buy 5 units and get 5% off, or 10 units for 10% off, applied automatically in the cart."],
  ["What is the return policy?", "Contact support within 14 days of delivery if anything arrives damaged or incorrect."],
];
