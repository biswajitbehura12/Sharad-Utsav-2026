// ============================================================
// API Route: GET /api/inventory
// Returns current stock levels and the full catalog.
// ============================================================

import { NextResponse } from 'next/server';
import { getInventory } from '@/lib/inventory';
import {
  TicketType,
  ExtraType,
  TICKET_PRICES,
  EXTRA_PRICES,
  GARBA_WORKSHOP_DAYS,
  type InventoryResponse,
} from '@/lib/types';

export async function GET() {
  const items = getInventory();

  const response: InventoryResponse = {
    items,
    catalog: {
      tickets: [
        {
          type: TicketType.DAY_PASS_ADULT,
          label: 'Day Pass – Adult',
          priceCents: TICKET_PRICES[TicketType.DAY_PASS_ADULT],
          perDay: true,
          description: 'Ages 12 and above. Choose any day(s).',
          ageGroup: 'adult',
        },
        {
          type: TicketType.DAY_PASS_CHILD,
          label: 'Day Pass – Child',
          priceCents: TICKET_PRICES[TicketType.DAY_PASS_CHILD],
          perDay: true,
          description: 'Ages 5 to 11. Choose any day(s).',
          ageGroup: 'child',
        },
        {
          type: TicketType.ALL_DAY_ADULT,
          label: 'All-Day Pass – Adult',
          priceCents: TICKET_PRICES[TicketType.ALL_DAY_ADULT],
          perDay: false,
          description: 'Ages 12 and above. All 5 days included.',
          ageGroup: 'adult',
        },
        {
          type: TicketType.ALL_DAY_CHILD,
          label: 'All-Day Pass – Child',
          priceCents: TICKET_PRICES[TicketType.ALL_DAY_CHILD],
          perDay: false,
          description: 'Ages 5 to 11. All 5 days included.',
          ageGroup: 'child',
        },
        {
          type: TicketType.FAMILY_PASS,
          label: 'Family Pass',
          priceCents: TICKET_PRICES[TicketType.FAMILY_PASS],
          perDay: false,
          description: '2 adults + 2 children, one day.',
          ageGroup: 'family',
        },
      ],
      extras: [
        {
          type: ExtraType.DANDIYA_STICKS,
          label: 'Dandiya Sticks (pair)',
          priceCents: EXTRA_PRICES[ExtraType.DANDIYA_STICKS],
          perDay: false,
          description: 'Souvenir dandiya sticks.',
        },
        {
          type: ExtraType.DINNER_PLATE,
          label: 'Dinner Plate',
          priceCents: EXTRA_PRICES[ExtraType.DINNER_PLATE],
          perDay: true,
          description: 'Per person, per day.',
        },
        {
          type: ExtraType.GARBA_WORKSHOP,
          label: 'Garba Workshop',
          priceCents: EXTRA_PRICES[ExtraType.GARBA_WORKSHOP],
          perDay: true,
          description: 'Available Nov 11 and Nov 13 only.',
          availableDays: [...GARBA_WORKSHOP_DAYS],
        },
      ],
    },
  };

  return NextResponse.json(response);
}
