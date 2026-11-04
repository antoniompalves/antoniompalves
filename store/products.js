// Shared catalog: loaded by the storefront (window.*) and by server.js (module.exports).
// Mirrored from the reference store's category pages: names, subtitles, EUR prices, promos, review counts.
(function (root) {
  const CATEGORIES = [{"id": "injectable", "name": "Injetáveis"}, {"id": "oral", "name": "Orais"}, {"id": "hgh", "name": "HGH"}, {"id": "peptides", "name": "Péptidos"}, {"id": "sexual-health", "name": "Saúde sexual"}, {"id": "weight-loss", "name": "Perda de peso"}];
  const PRODUCTS = [
    {"id": "boldenone", "name": "Boldenone", "sub": "Equipoise EQ", "cat": "injectable", "price": 42, "reviews": 3, "best": true},
    {"id": "drostanolone-enanthate", "name": "Drostanolone Enanthate", "sub": "Masteron", "cat": "injectable", "price": 65, "reviews": 7, "promo": 10},
    {"id": "drostanolone-propionate", "name": "Drostanolone Propionate", "sub": "Masteron", "cat": "injectable", "price": 50, "reviews": 1},
    {"id": "primobolan", "name": "Primobolan", "sub": "Enantato de metenolona", "cat": "injectable", "price": 85, "reviews": 2},
    {"id": "nandrolone-decanoate", "name": "Nandrolone Decanoate", "sub": "Deca Durabolin", "cat": "injectable", "price": 42, "reviews": 2},
    {"id": "nandrolone-phenyl-npp", "name": "Nandrolone Phenyl NPP", "sub": "Durabolin / NPP", "cat": "injectable", "price": 34, "reviews": 0},
    {"id": "parabolan", "name": "Parabolan", "sub": "Trembolona Hexa", "cat": "injectable", "price": 56, "reviews": 0},
    {"id": "sustanon-250", "name": "Sustanon 250", "sub": "Ação rápida + longa duração", "cat": "injectable", "price": 36, "reviews": 5, "best": true},
    {"id": "testosterone-cypionate", "name": "Testosterone Cypionate", "sub": "Éster de ação média-lenta", "cat": "injectable", "price": 35, "reviews": 9, "best": true},
    {"id": "testosterone-enanthate", "name": "Testosterone Enanthate", "sub": "Éster de ação média-lenta", "cat": "injectable", "price": 36, "reviews": 21, "promo": 10, "best": true},
    {"id": "testosterone-propionate", "name": "Testosterone Propionate", "sub": "Éster de ação rápida", "cat": "injectable", "price": 29, "reviews": 3, "best": true},
    {"id": "testosterone-undecanoate", "name": "Testosterone Undecanoat", "sub": "Éster de ação muito lenta", "cat": "injectable", "price": 33, "reviews": 1},
    {"id": "trenbolone-acetate", "name": "Trenbolone Acetate", "sub": "Finajet Finaplix", "cat": "injectable", "price": 49, "reviews": 1},
    {"id": "trenbolone-enanthate", "name": "Trenbolone Enanthate", "sub": "Trenabol", "cat": "injectable", "price": 55, "reviews": 7},
    {"id": "trenbolone-mix", "name": "Trenbolone Mix", "sub": "Tri-Tren", "cat": "injectable", "price": 57, "reviews": 0},
    {"id": "cut-stack", "name": "Cut Stack", "sub": "Cut Mix", "cat": "injectable", "price": 51, "reviews": 0},
    {"id": "stanozolol-injection", "name": "Stanozolol Injection", "sub": "Winstrol", "cat": "injectable", "price": 35, "reviews": 0},
    {"id": "clomiphene", "name": "Clomiphene", "sub": "Clomid", "cat": "oral", "price": 29, "reviews": 3},
    {"id": "proviron", "name": "Proviron", "sub": "Mesterolone", "cat": "oral", "price": 44, "reviews": 4},
    {"id": "methandienone", "name": "Methandienone", "sub": "Dianabol", "cat": "oral", "price": 24, "reviews": 2, "best": true},
    {"id": "oxandrolone", "name": "Oxandrolone", "sub": "Anavar", "cat": "oral", "price": 49, "reviews": 3, "promo": 10, "best": true},
    {"id": "oxymetholone", "name": "Oxymetholone", "sub": "Anadrol", "cat": "oral", "price": 55, "reviews": 2},
    {"id": "stanozolol", "name": "Stanozolol", "sub": "Winstrol", "cat": "oral", "price": 30, "reviews": 1, "best": true},
    {"id": "tamoxifen", "name": "Tamoxifen", "sub": "Nolvadex", "cat": "oral", "price": 26, "reviews": 4},
    {"id": "turinabol", "name": "Turinabol", "sub": "Tbol", "cat": "oral", "price": 43, "reviews": 0},
    {"id": "clenbuterol", "name": "Clenbuterol", "sub": "Clen", "cat": "oral", "price": 21, "reviews": 4, "best": true},
    {"id": "anastrozole", "name": "Anastrozole", "sub": "Arimidex", "cat": "oral", "price": 32, "reviews": 6},
    {"id": "exemestane", "name": "Exemestane", "sub": "Aromasin", "cat": "oral", "price": 36, "reviews": 3},
    {"id": "letrozole", "name": "Letrozole", "sub": "Femara", "cat": "oral", "price": 32, "reviews": 0},
    {"id": "halotestin", "name": "Halotestin", "sub": "Halo", "cat": "oral", "price": 75, "reviews": 0},
    {"id": "t3", "name": "T3", "sub": "Cytomel", "cat": "oral", "price": 19, "reviews": 1},
    {"id": "t4", "name": "T4", "sub": "Levothyroxine", "cat": "oral", "price": 21, "reviews": 0},
    {"id": "cabergoline", "name": "Cabergoline", "sub": "Dostinex", "cat": "oral", "price": 43, "reviews": 0},
    {"id": "enclomiphene", "name": "Enclomiphene", "sub": "Citrato", "cat": "oral", "price": 32, "reviews": 4, "fresh": true},
    {"id": "hgh-powder-100-hilma", "name": "HGH pó 100 UI", "sub": "Hormona de crescimento Hilma", "cat": "hgh", "price": 225, "reviews": 0},
    {"id": "hgh-liquid-100-hilma", "name": "HGH líquida 100 UI", "sub": "Hormona de crescimento Hilma", "cat": "hgh", "price": 195, "reviews": 1},
    {"id": "hgh-pen-36", "name": "HGH Somatropina caneta 36 UI", "sub": "Hormona de crescimento Hilma", "cat": "hgh", "price": 80, "reviews": 0},
    {"id": "hgh-pen-90", "name": "HGH Somatropina caneta 90 UI", "sub": "Hormona de crescimento Hilma", "cat": "hgh", "price": 190, "reviews": 2},
    {"id": "hgh-liquid-500-wl", "name": "HGH líquida 500 UI", "sub": "Hormona de crescimento WL", "cat": "hgh", "price": 499, "reviews": 0},
    {"id": "hgh-powder-100-wl", "name": "HGH pó 100 UI", "sub": "Hormona de crescimento WL", "cat": "hgh", "price": 140, "reviews": 1},
    {"id": "hgh-liquid-100-marten", "name": "HGH líquida 100 UI", "sub": "Hormona de crescimento Marten", "cat": "hgh", "price": 160, "reviews": 0},
    {"id": "hgh-powder-50-marten", "name": "HGH pó 50 UI", "sub": "Hormona de crescimento Marten", "cat": "hgh", "price": 80, "reviews": 2},
    {"id": "peg-mgf", "name": "PEG MGF", "sub": "Recuperação muscular", "cat": "peptides", "price": 34, "reviews": 1},
    {"id": "cjc-1295-dac", "name": "CJC-1295 with DAC", "sub": "Estimulação da hormona de crescimento", "cat": "peptides", "price": 32, "reviews": 0},
    {"id": "ghrp-2", "name": "GHRP-2", "sub": "Estimulação da hormona de crescimento", "cat": "peptides", "price": 36, "reviews": 0},
    {"id": "ghrp-6", "name": "GHRP-6", "sub": "Estimulação da hormona de crescimento", "cat": "peptides", "price": 36, "reviews": 0},
    {"id": "hgh-fragment-176-191", "name": "HGH Fragmento 176-191", "sub": "Degrada a gordura corporal", "cat": "peptides", "price": 35, "reviews": 0},
    {"id": "bacteriostatic-water", "name": "Água Bacteriostática", "sub": "Água estéril", "cat": "peptides", "price": 10, "reviews": 6},
    {"id": "melanotan-2", "name": "Melanotan 2", "sub": "Péptido de bronzeamento", "cat": "peptides", "price": 29, "reviews": 1},
    {"id": "tb-500", "name": "TB-500", "sub": "Péptido de reparação de tecidos", "cat": "peptides", "price": 49, "reviews": 1},
    {"id": "hcg-5000", "name": "HCG 5000 UI", "sub": "Gonadotrofina", "cat": "peptides", "price": 41, "reviews": 7},
    {"id": "bpc-157", "name": "BPC-157", "sub": "Péptido de reparação de tecidos", "cat": "peptides", "price": 55, "reviews": 2, "fresh": true},
    {"id": "nad", "name": "NAD+", "sub": "Energia celular e longevidade", "cat": "peptides", "price": 65, "reviews": 0, "fresh": true},
    {"id": "ss-31", "name": "SS-31 Elamipretide", "sub": "Péptido de longevidade", "cat": "peptides", "price": 56, "reviews": 0, "fresh": true},
    {"id": "mots-c", "name": "MOTS-C", "sub": "Performance e resistência", "cat": "peptides", "price": 48, "reviews": 0, "fresh": true},
    {"id": "ipamorelin", "name": "Ipamorelin", "sub": "Péptido de recuperação", "cat": "peptides", "price": 51, "reviews": 0, "fresh": true},
    {"id": "epitalon", "name": "Epitalon", "sub": "Péptido antienvelhecimento", "cat": "peptides", "price": 37, "reviews": 0},
    {"id": "ghk-cu", "name": "GHK-Cu", "sub": "Péptido regenerativo", "cat": "peptides", "price": 49, "reviews": 0},
    {"id": "pt-141", "name": "PT-141 Bremelanotide", "sub": "Péptido de estimulação sexual", "cat": "peptides", "price": 39, "reviews": 0},
    {"id": "n-acetyl-semax", "name": "N Acetyl Semax", "sub": "Melhora a função cerebral", "cat": "peptides", "price": 60, "reviews": 1},
    {"id": "tadalafil", "name": "Tadalafil", "sub": "Cialis", "cat": "sexual-health", "price": 19, "reviews": 8},
    {"id": "viagra", "name": "Viagra", "sub": "Sildenafil", "cat": "sexual-health", "price": 13, "reviews": 5, "promo": 10},
    {"id": "semaglutide", "name": "Semaglutido", "sub": "Ozempic", "cat": "weight-loss", "price": 43, "reviews": 1},
    {"id": "semaglutide-pen", "name": "Semaglutido caneta", "sub": "Ozempic", "cat": "weight-loss", "price": 130, "reviews": 0},
    {"id": "tirzepatide", "name": "Tirzepatida", "sub": "Mounjaro", "cat": "weight-loss", "price": 65, "reviews": 1},
    {"id": "retatrutide", "name": "Retatrutida", "sub": "Controlo de peso", "cat": "weight-loss", "price": 75, "reviews": 5},
    {"id": "tirzepatide-pen", "name": "Tirzepatida caneta", "sub": "Mounjaro", "cat": "weight-loss", "price": 80, "reviews": 6},
  ];
  const FAQ = [
  [
    "Enviam para o meu país?",
    "Enviamos para toda a UE a partir de stock na UE. Os prazos de entrega são confirmados quando o contactarmos sobre a sua pré-encomenda."
  ],
  [
    "Tenho de pagar agora?",
    "Não. A finalização regista apenas uma pré-encomenda. A nossa equipa contacta-o para confirmar disponibilidade, total e entrega."
  ],
  [
    "A embalagem é discreta?",
    "Sim. Todas as encomendas são enviadas em embalagem simples, sem marca."
  ],
  [
    "Há descontos por quantidade?",
    "Compre 5 unidades de um produto e tenha 5% de desconto, ou 10 unidades para 10% de desconto, aplicado automaticamente no carrinho."
  ],
  [
    "Qual é a política de devoluções?",
    "Contacte o apoio ao cliente até 14 dias após a entrega se algo chegar danificado ou incorreto."
  ]
];
  const unitPrice = p => Math.round((p.promo ? p.price * (1 - p.promo / 100) : p.price) * 100) / 100;
  const bulkRate = qty => (qty >= 10 ? 0.10 : qty >= 5 ? 0.05 : 0);
  const api = { CATEGORIES, PRODUCTS, FAQ, unitPrice, bulkRate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== "undefined" ? window : globalThis);
