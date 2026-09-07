import type {
CommercialDeliveryFeeMode,
} from '@beeapp/shared-types';

import type {
BusinessCart,
BusinessCartLine,
} from './businessCartStore';

export type BusinessCartTotalState =
| 'confirmed'
| 'estimated'
| 'pending_confirmation';

export type BusinessCartLineSummary = {
lineId: string;
quantity: number;
unitPriceAmount: number | null;
lineTotalAmount: number | null;
pricingStrategy: BusinessCartLine['pricingStrategy'];
};

export type BusinessCartSummary = {
currencyCode: 'COP';
lineCount: number;
itemCount: number;
subtotalAmount: number | null;
deliveryFeeMode: CommercialDeliveryFeeMode;
deliveryFeeAmount: number | null;
totalAmount: number | null;
totalState: BusinessCartTotalState;
lines: BusinessCartLineSummary[];
};

function hasReferencePrice(
line: BusinessCartLine,
): boolean {
if (line.pricingStrategy === 'free') {
return true;
}

return (
(line.pricingStrategy === 'fixed'
|| line.pricingStrategy === 'starting_at')
&& line.unitPriceAmount !== null
);
}

function getLineTotal(
line: BusinessCartLine,
): number | null {
if (line.pricingStrategy === 'free') {
return 0;
}

if (
(line.pricingStrategy !== 'fixed'
&& line.pricingStrategy !== 'starting_at')
|| line.unitPriceAmount === null
) {
return null;
}

return line.unitPriceAmount * line.quantity;
}

export function getBusinessCartSummary(
cart: BusinessCart,
options: {
deliveryFeeMode?: CommercialDeliveryFeeMode;
deliveryFeeAmount?: number | null;
} = {},
): BusinessCartSummary {
const deliveryFeeMode = (
options.deliveryFeeMode
|| 'not_offered'
);

const deliveryFeeAmount = (
deliveryFeeMode === 'free'
? 0
: deliveryFeeMode === 'fixed'
&& typeof options.deliveryFeeAmount === 'number'
&& Number.isFinite(options.deliveryFeeAmount)
&& options.deliveryFeeAmount >= 0
? Math.floor(options.deliveryFeeAmount)
: null
);

const lines = cart.lines.map((line) => ({
lineId: line.id,
quantity: line.quantity,
unitPriceAmount: line.unitPriceAmount,
lineTotalAmount: getLineTotal(line),
pricingStrategy: line.pricingStrategy,
}));

const allLinePricesKnown = cart.lines.every(hasReferencePrice);

const subtotalAmount = allLinePricesKnown
? lines.reduce(
(total, line) => total + (line.lineTotalAmount || 0),
0,
)
: null;

const hasPendingPrice = cart.lines.some((line) => (
line.pricingStrategy === 'to_be_confirmed'
));

const hasStartingAtPrice = cart.lines.some((line) => (
line.pricingStrategy === 'starting_at'
));

const hasPendingDelivery = (
deliveryFeeMode === 'to_be_confirmed'
);

const totalAmount = (
subtotalAmount !== null
&& deliveryFeeAmount !== null
? subtotalAmount + deliveryFeeAmount
: deliveryFeeMode === 'not_offered'
&& subtotalAmount !== null
? subtotalAmount
: null
);

const totalState: BusinessCartTotalState = (
hasPendingPrice
|| hasPendingDelivery
|| totalAmount === null
)
? 'pending_confirmation'
: hasStartingAtPrice
? 'estimated'
: 'confirmed';

return {
currencyCode: 'COP',
lineCount: cart.lines.length,
itemCount: cart.lines.reduce(
(total, line) => total + line.quantity,
0,
),
subtotalAmount,
deliveryFeeMode,
deliveryFeeAmount,
totalAmount,
totalState,
lines,
};
}

export function getBusinessCartTotalStateLabel(
state: BusinessCartTotalState,
): string {
if (state === 'confirmed') {
return 'Total confirmado';
}

if (state === 'estimated') {
return 'Total estimado';
}

return 'Total pendiente de confirmación';
}

export function getBusinessCartDeliveryLabel(
summary: BusinessCartSummary,
): string {
if (summary.deliveryFeeMode === 'free') {
return 'Domicilio gratis';
}

if (summary.deliveryFeeMode === 'fixed') {
return summary.deliveryFeeAmount === null
? 'Domicilio por confirmar'
: 'Domicilio fijo';
}

if (summary.deliveryFeeMode === 'to_be_confirmed') {
return 'Domicilio por confirmar';
}

return 'Sin domicilio';
}
