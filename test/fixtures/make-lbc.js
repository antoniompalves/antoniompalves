// Builds a leboncoin-shaped page (structure of __NEXT_DATA__ as served by leboncoin.fr).
export function lbcAd(o = {}) {
  return {
    list_id: o.id ?? 3114606705,
    first_publication_date: '2026-10-28 10:12:00',
    subject: o.subject ?? 'Renault Kadjar 1.5 dCi 115 Business',
    body: o.body ?? 'Très bon état. CO2 : 119 g/km (NEDC). Filtre à particules. Entretien Renault.',
    url: `https://www.leboncoin.fr/ad/voitures/${o.id ?? 3114606705}`,
    price: [o.price ?? 19300],
    images: { urls_large: ['https://img.leboncoin.fr/api/v1/lbcpb1/images/aa/bb/1.jpg?rule=ad-large', 'https://img.leboncoin.fr/api/v1/lbcpb1/images/aa/bb/2.jpg?rule=ad-large'] },
    attributes: [
      { key: 'u_car_brand', value: 'RENAULT', value_label: 'Renault' },
      { key: 'u_car_model', value: 'Renault_Kadjar', value_label: 'Kadjar' },
      { key: 'regdate', value: '2020', value_label: '2020' },
      { key: 'issuance_date', value: '03/2020', value_label: '03/2020' },
      { key: 'mileage', value: String(o.km ?? 165000), value_label: `${o.km ?? 165000} km` },
      { key: 'fuel', value: '2', value_label: o.fuel ?? 'Diesel' },
      { key: 'gearbox', value: '1', value_label: 'Manuelle' },
      { key: 'horse_power_din', value: '115', value_label: '115 Ch' },
      { key: 'horsepower', value: '6', value_label: '6 Cv' },
    ],
    location: { city: o.city ?? 'Strasbourg', zipcode: '67000', region_name: 'Alsace', lat: 48.5734, lng: 7.7521 },
    owner: { type: o.owner ?? 'pro', name: o.ownerName ?? 'Garage Test', store_id: '123' },
  };
}
export function lbcPage(ads) {
  const next = { props: { pageProps: { searchData: { total: ads.length, ads } } }, page: '/recherche' };
  return `<!DOCTYPE html><html><head><title>leboncoin</title></head><body><div id="__next"></div><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(next)}</script></body></html>`;
}
