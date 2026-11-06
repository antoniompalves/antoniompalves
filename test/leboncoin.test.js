// Runs the PHP leboncoin / JSON-LD parsers (app/inc/leboncoin.php) on fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lbcAd, lbcPage } from './fixtures/make-lbc.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vroom-php-'));
let n = 0;
function php(mode, content, url = '') {
  const f = path.join(tmp, `in${n++}.txt`);
  fs.writeFileSync(f, content);
  return JSON.parse(execFileSync('php', ['test/php-helper.php', mode, f, url], { encoding: 'utf8' }));
}

test('parses a leboncoin search page', () => {
  const deals = php('lbc', lbcPage([lbcAd(), lbcAd({ id: 2, owner: 'private', fuel: 'Essence', subject: 'Peugeot 308 1.2 PureTech 130', body: 'Moteur 1199 cm3' })]));
  assert.equal(deals.length, 2);
  const [a, b] = deals;
  assert.equal(a.make, 'Renault');
  assert.equal(a.model, 'Kadjar');
  assert.equal(a.firstRegistration, '2020-03');
  assert.equal(a.km, 165000);
  assert.equal(a.fuel, 'diesel');
  assert.equal(a.co2, 119);
  assert.equal(a.co2Standard, 'NEDC');
  assert.equal(a.cc, 1500);
  assert.equal(a.ccEstimated, true);
  assert.equal(a.price, 19300);
  assert.equal(a.sellerType, 'pro');
  assert.equal(a.city, 'Strasbourg');
  assert.equal(a.images.length, 2);
  assert.equal(b.sellerType, 'private');
  assert.equal(b.fuel, 'gasoline');
  assert.equal(b.cc, 1199);
  assert.equal(b.ccEstimated, false);
});

test('accepts raw __NEXT_DATA__ JSON (bookmarklet payload) and single ad pages', () => {
  const deals = php('lbc', JSON.stringify({ props: { pageProps: { ad: lbcAd({ id: 99 }) } } }));
  assert.equal(deals.length, 1);
  assert.equal(deals[0].sourceId, '99');
});

test('text spec extraction and fuels', () => {
  assert.deepEqual(php('specs', '2.0 TDI 150 ch, émissions CO2 132 g/km WLTP'), { co2: 132, cc: 2000, ccEstimated: true, co2Standard: 'WLTP' });
  assert.equal(php('fuel', 'Hybride Rechargeable'), 'phev');
  assert.equal(php('fuel', 'Électrique'), 'electric');
});

test('search URL builder', () => {
  const u = new URL(php('search', JSON.stringify({ text: 'kadjar', minYear: 2011, maxYear: 2021, maxKm: 150000, maxPrice: 20000, fuels: ['gasoline', 'diesel'] })));
  assert.equal(u.hostname, 'www.leboncoin.fr');
  assert.equal(u.searchParams.get('category'), '2');
  assert.equal(u.searchParams.get('regdate'), '2011-2021');
  assert.equal(u.searchParams.get('mileage'), 'min-150000');
  assert.equal(u.searchParams.get('price'), 'min-20000');
  assert.equal(u.searchParams.get('fuel'), '1,2');
  assert.equal(u.searchParams.get('owner_type'), 'pro');
});

test('generic JSON-LD parser (AutoScout24 / mobile.de style)', () => {
  const ld = { '@context': 'https://schema.org', '@type': ['Car', 'Product'], name: 'Volkswagen Golf 1.5 TSI', brand: { name: 'Volkswagen' }, model: 'Golf', mileageFromOdometer: { value: 85000, unitCode: 'KMT' }, fuelType: 'Benzin', dateVehicleFirstRegistered: '2019-05-01', vehicleEngine: { engineDisplacement: { value: 1498, unitCode: 'CMQ' } }, emissionsCO2: 118, offers: { price: 16900, priceCurrency: 'EUR', seller: { '@type': 'AutoDealer', name: 'Autohaus X' } } };
  const [d] = php('jsonld', `<html><script type="application/ld+json">${JSON.stringify(ld)}</script></html>`, 'https://www.autoscout24.de/angebote/x');
  assert.equal(d.country, 'DE');
  assert.equal(d.price, 16900);
  assert.equal(d.km, 85000);
  assert.equal(d.cc, 1498);
  assert.equal(d.co2, 118);
  assert.equal(d.fuel, 'gasoline');
  assert.equal(d.firstRegistration, '2019-05');
  assert.equal(d.sellerType, 'pro');
});
