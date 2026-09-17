import assert from 'node:assert/strict';

const memory = new Map<string, string>();

const storagePath = require.resolve(
'@react-native-async-storage/async-storage',
);

const asyncStorageMock = {
async getItem(key: string): Promise<string | null> {
return memory.get(key) || null;
},
async setItem(key: string, value: string): Promise<void> {
memory.set(key, value);
},
async removeItem(key: string): Promise<void> {
memory.delete(key);
},
};

require.cache[storagePath] = {
exports: {
__esModule: true,
default: asyncStorageMock,
...asyncStorageMock,
},
} as NodeModule;

const cartStore = require(
'../src/features/buddyservices/cart/businessCartStore',
) as typeof import(
'../src/features/buddyservices/cart/businessCartStore'
);

function run(): void {
cartStore.setBusinessCartActiveUser('revalidation-user');
cartStore.clearBusinessCart();

const added = cartStore.addBusinessCartProduct({
commercialOfferId: 'offer-1',
commercialProfileId: 'business-1',
commercialProfileName: 'Negocio A',
title: 'Producto original',
quantity: 2,
pricingStrategy: 'fixed',
unitPriceAmount: 10000,
currencyCode: 'COP',
requestedModality: 'delivery',
imageUrl: 'https://example.com/original.jpg',
deliveryFeeMode: 'fixed',
deliveryFeeAmount: 5000,
});

assert.equal(added.kind, 'added');

const firstCart = cartStore.getBusinessCart();
assert.ok(firstCart);

const lineId = firstCart.lines[0].id;

cartStore.updateBusinessCartLineComment(
lineId,
'Comentario que debe conservarse',
);

const idempotencyKey = cartStore.getOrCreateBusinessCartSubmissionIdempotencyKey(
() => 'revalidation-key',
);

assert.equal(idempotencyKey, 'revalidation-key');

const result = cartStore.revalidateBusinessCartLines(
[
{
lineId,
title: 'Producto actualizado',
pricingStrategy: 'starting_at',
unitPriceAmount: 12000,
requestedModality: 'pickup',
imageUrl: 'https://example.com/actualizado.jpg',
},
],
[],
);

assert.equal(result.updatedLineCount, 1);
assert.equal(result.removedLineCount, 0);

const updatedCart = cartStore.getBusinessCart();
assert.ok(updatedCart);
assert.equal(updatedCart.submissionIdempotencyKey, null);
assert.equal(updatedCart.lines[0].title, 'Producto actualizado');
assert.equal(updatedCart.lines[0].pricingStrategy, 'starting_at');
assert.equal(updatedCart.lines[0].unitPriceAmount, 12000);
assert.equal(updatedCart.lines[0].requestedModality, 'pickup');
assert.equal(
updatedCart.lines[0].lineComment,
'Comentario que debe conservarse',
);
assert.equal(updatedCart.lines[0].quantity, 2);
assert.equal(
updatedCart.deliveryAddress,
null,
);

const removed = cartStore.revalidateBusinessCartLines(
[],
[lineId],
);

assert.equal(removed.updatedLineCount, 0);
assert.equal(removed.removedLineCount, 1);
assert.equal(removed.cart, null);
assert.equal(cartStore.getBusinessCart(), null);

console.log(
'OK: revalidación actualiza snapshots, conserva datos y elimina líneas inválidas.',
);
}

run();
