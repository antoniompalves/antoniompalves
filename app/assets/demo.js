// Demo car built from the "Vroom.Pt" workbook (Renault Kadjar, steps 1–9 + Balanço de Despesas).
// Values marked "(simulado)" were missing in the workbook and are realistic estimates.
import { PROCESS, processFor } from './lib/process.js';
import { CASH } from './lib/ledger.js';

export const DEMO_NOTE = `Carro de demonstração criado a partir da folha Vroom.Pt.
Da folha: Renault Kadjar 2020, 165 000 km, gasóleo, 1968 cm³, 119 g/km (NEDC), Estrasburgo, 19 300 €; voo Ryanair OPO→STR 80 € (Toni + Tono, 06/03/2026); seguro temporário 106,30 € (28 dias); COC 160 €; percurso 1400 km com combustível 320 € e portagens 180 €; IPO 100 €; ISV 2 830,86 €; matrículas 15 €; agência (Azeméis) 200 €; IUC 241,50 €; cenários de venda 26 000 / 28 000 / 30 000 €; vendido por 27 500 €; quem pagou cada despesa segundo o Balanço de Despesas.
Simulado (não existia na folha): preços dos comparáveis do StandVirtual, carVertical, deslocações, dormidas, matrícula temporária, mecânico, pintura, extras (Blacar, lanterna), nome do stand e datas a partir da chegada.`;

export function buildDemo(partners) {
  const who = (n) => (partners.includes(n) ? n : CASH);
  const sim = ' (simulado)';
  const E = (date, type, amount, payer, note, method = 'TRF') => ({ id: `demo-${type}-${date}-${amount}`, date, type, amount, payer: who(payer), method, note });
  const deal = {
    demo: true, source: 'demo', sourceId: 'demo-kadjar',
    title: 'Renault Kadjar — demonstração', make: 'Renault', model: 'Kadjar', version: null,
    year: 2020, firstRegistration: '2020-01', km: 165000, fuel: 'diesel', gearbox: 'Manual', cc: 1968, ccManual: true, co2: 119, co2Manual: true, co2Standard: 'NEDC', dieselParticles: false,
    country: 'FR', city: 'Estrasburgo', zipcode: '67000', region: 'Grand Est', lat: 48.5734, lng: 7.7521,
    sellerType: 'pro', sellerName: 'Stand profissional' + sim, price: 19300, quality: 2,
    url: 'https://www.leboncoin.fr/ad/voitures/3114606705', images: [], description: '',
    hasCoc: true, paymentMethod: 'TRF',
    status: 'sold', salePrice: 27500, saleChannel: 'StandVirtual', otherIncome: 0,
    market: {
      low: 26000, high: 30000, target: 28000,
      comps: [
        { url: 'https://www.standvirtual.com/carros/renault/kadjar', year: 2018, km: 100000, condition: 'Bom — mais barato' + sim, price: 26000 },
        { url: 'https://www.standvirtual.com/carros/renault/kadjar', year: 2019, km: 76500, condition: 'Bom — mais caro' + sim, price: 30000 },
      ],
    },
    overrides: {
      returnMode: 'drive', routeKm: 1400,
      flight: 80, localTransport: 40, tempInsurance: 106.3, tempPlates: 70, coc: 160, historyCheck: 25,
      fuel: 320, tolls: 180, roadExtras: 0, nights: 110,
      inspection: 100, homologation: 0, imt: 0, plates: 15, registration: 0, agency: 200,
      mechanic: 180, bodywork: 150, parts: 0, extras: 60, ads: 0, warranty: 0,
    },
    dates: { bought: '2026-03-06', arrivedPT: '2026-03-08', davDate: '2026-03-12', plateDate: '2026-03-20', listed: '2026-03-25', sold: '2026-04-18' },
    expenses: [
      E('2026-02-20', 'historyCheck', 25, 'Tono', 'carVertical' + sim, 'Cartão'),
      E('2026-02-25', 'flight', 80, 'António', 'Ryanair OPO → STR · Toni + Tono', 'Cartão'),
      E('2026-03-02', 'car', 1000, 'Calado', 'Entrada / sinal ao stand'),
      E('2026-03-06', 'car', 18300, 'António', 'Pagamento restante do carro'),
      E('2026-03-06', 'localTransport', 40, 'Calado', 'Deslocações em Estrasburgo' + sim, 'Cash'),
      E('2026-03-06', 'tempInsurance', 106.3, 'Tono', 'Seguro temporário 28 dias'),
      E('2026-03-06', 'tempPlates', 70, 'Tono', 'Matrícula temporária' + sim, 'Cash'),
      E('2026-03-06', 'coc', 160, 'Tono', 'COC'),
      E('2026-03-07', 'lodging', 110, 'António', '2 dormidas na viagem' + sim, 'Cartão'),
      E('2026-03-08', 'fuel', 320, 'António', 'Estrasburgo → Auterive → Espanha → Porto', 'Cartão'),
      E('2026-03-08', 'tolls', 180, 'Tono', 'Portagens da vinda', 'Cartão'),
      E('2026-03-10', 'inspection', 100, 'Tono', 'IPO categoria B'),
      E('2026-03-12', 'isv', 2830.86, 'Tono', 'ISV (DUC da DAV)'),
      E('2026-03-20', 'plates', 15, 'Tono', 'Chapas de matrícula', 'Cash'),
      E('2026-03-21', 'agency', 200, 'Tono', 'Serviço de agência (Azeméis) — registo'),
      E('2026-03-21', 'iuc', 241.5, 'Tono', 'IUC'),
      E('2026-03-22', 'mechanic', 180, 'António', 'Mecânico: óleo e filtros' + sim),
      E('2026-03-23', 'bodywork', 150, 'António', 'Pintor e estofador' + sim, 'Cash'),
      E('2026-03-24', 'extras', 35, 'António', 'Extras — Blacar' + sim, 'Cartão'),
      E('2026-03-24', 'extras', 25, 'Tono', 'Lanterna' + sim, 'Cash'),
    ],
    notes: DEMO_NOTE,
  };
  // whole process done (it's a sold car)
  deal.checklist = {};
  for (const phase of processFor(deal)) for (const st of phase.steps) deal.checklist[st.key] = true;
  void PROCESS;
  return deal;
}
