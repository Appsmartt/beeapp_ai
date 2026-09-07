import assert from 'node:assert/strict';
import Module from 'node:module';

const memory = new Map<string, string>();

const asyncStorageMock = {
  async getItem(key: string): Promise<string | null> {
    return memory.get(key) ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    memory.set(key, value);
  },

  async removeItem(key: string): Promise<void> {
    memory.delete(key);
  },
};

const originalRequire = Module.prototype.require;

Module.prototype.require = function patchedRequire(
  request: string,
) {
  if (
    request === '@react-native-async-storage/async-storage'
  ) {
    return {
      __esModule: true,
      default: asyncStorageMock,
    };
  }

  return originalRequire.apply(this, arguments as never);
};

const cartStore = require(
  '../src/features/buddyservices/cart/businessCartStore',
) as typeof import(
  '../src/features/buddyservices/cart/businessCartStore'
);

function flushPersistence(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

async function run(): Promise<void> {
  cartStore.setBusinessCartActiveUser('idempotency-user');
  cartStore.clearBusinessCart();

  const added = cartStore.addBusinessCartProduct({
    commercialOfferId: 'idempotency-offer',
    commercialProfileId: 'idempotency-business',
    commercialProfileName: 'Negocio Idempotencia',
    title: 'Producto Idempotencia',
    quantity: 1,
    pricingStrategy: 'fixed',
    unitPriceAmount: 25000,
    currencyCode: 'COP',
    requestedModality: 'delivery',
    imageUrl: null,
    deliveryFeeMode: 'fixed',
    deliveryFeeAmount: 5000,
  });

  assert.equal(added.kind, 'added');

  const lineId = cartStore.getBusinessCart()?.lines[0]?.id;

  assert.ok(lineId);

  const firstKey = (
    cartStore.getOrCreateBusinessCartSubmissionIdempotencyKey(
      () => 'persisted-request-key-1',
    )
  );

  const repeatedKey = (
    cartStore.getOrCreateBusinessCartSubmissionIdempotencyKey(
      () => 'should-not-be-used',
    )
  );

  assert.equal(firstKey, 'persisted-request-key-1');
  assert.equal(repeatedKey, 'persisted-request-key-1');

  cartStore.updateBusinessCartLineComment(
    lineId,
    'Cambio de detalle que invalida el intento anterior.',
  );

  const replacementKey = (
    cartStore.getOrCreateBusinessCartSubmissionIdempotencyKey(
      () => 'persisted-request-key-2',
    )
  );

  assert.equal(replacementKey, 'persisted-request-key-2');

  await flushPersistence();

  cartStore.setBusinessCartActiveUser('another-user');

  assert.equal(cartStore.getBusinessCart(), null);

  const hydrated = await cartStore.hydrateBusinessCart(
    'idempotency-user',
  );

  assert.equal(
    hydrated?.submissionIdempotencyKey,
    'persisted-request-key-2',
  );

  const restoredKey = (
    cartStore.getOrCreateBusinessCartSubmissionIdempotencyKey(
      () => 'should-not-be-used-after-hydration',
    )
  );

  assert.equal(restoredKey, 'persisted-request-key-2');

  cartStore.clearBusinessCart();

  console.log(
    'OK: Idempotencia reutilizada, invalidada y rehidratada correctamente.',
  );
}

void run().catch((error: unknown) => {
  console.error('ERROR: Falló la prueba de idempotencia del carrito.');
  console.error(error);
  process.exitCode = 1;
});
