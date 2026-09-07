import assert from 'node:assert/strict';
import Module from 'node:module';

type AsyncStorageMemory = Map<string, string>;

const memory: AsyncStorageMemory = new Map();

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

function product(
  overrides: Partial<
    import(
      '../src/features/buddyservices/cart/businessCartStore'
    ).AddBusinessCartProductInput
  > = {},
) {
  return {
    commercialOfferId: 'offer-a-1',
    commercialProfileId: 'business-a',
    commercialProfileName: 'Negocio A',
    title: 'Producto A',
    quantity: 1,
    pricingStrategy: 'fixed' as const,
    unitPriceAmount: 10000,
    currencyCode: 'COP' as const,
    requestedModality: 'delivery' as const,
    imageUrl: null,
    ...overrides,
  };
}

async function flushPersistence(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

async function run(): Promise<void> {
  cartStore.setBusinessCartActiveUser('user-1');
  cartStore.clearBusinessCart();

  const firstAdd = cartStore.addBusinessCartProduct(product());

  assert.equal(firstAdd.kind, 'added');
  assert.equal(
    cartStore.getBusinessCart()?.commercialProfileId,
    'business-a',
  );
  assert.equal(cartStore.getBusinessCartItemCount(), 1);

  const secondAdd = cartStore.addBusinessCartProduct(
    product({ quantity: 2 }),
  );

  assert.equal(secondAdd.kind, 'added');
  assert.equal(cartStore.getBusinessCart()?.lines.length, 1);
  assert.equal(
    cartStore.getBusinessCart()?.lines[0]?.quantity,
    3,
  );

  const conflict = cartStore.addBusinessCartProduct(
    product({
      commercialOfferId: 'offer-b-1',
      commercialProfileId: 'business-b',
      commercialProfileName: 'Negocio B',
      title: 'Producto B',
    }),
  );

  assert.equal(conflict.kind, 'conflict');

  if (conflict.kind === 'conflict') {
    assert.deepEqual(conflict.conflict, {
      currentCommercialProfileId: 'business-a',
      currentCommercialProfileName: 'Negocio A',
      incomingCommercialProfileId: 'business-b',
      incomingCommercialProfileName: 'Negocio B',
    });
  }

  assert.equal(
    cartStore.getBusinessCart()?.commercialProfileId,
    'business-a',
  );
  assert.equal(cartStore.getBusinessCartItemCount(), 3);

  const cartB = cartStore.replaceBusinessCartWithProduct(
    product({
      commercialOfferId: 'offer-b-1',
      commercialProfileId: 'business-b',
      commercialProfileName: 'Negocio B',
      title: 'Producto B',
      quantity: 2,
      requestedModality: 'pickup',
    }),
  );

  assert.equal(cartB.commercialProfileId, 'business-b');
  assert.equal(cartB.lines.length, 1);
  assert.equal(cartB.lines[0]?.quantity, 2);

  const lineId = cartB.lines[0]?.id;

  assert.ok(lineId);

  cartStore.updateBusinessCartLineQuantity(lineId, 4);
  cartStore.updateBusinessCartLineComment(
    lineId,
    'Por favor empacar con cuidado.',
  );
  cartStore.updateBusinessCartRequestDetails({
    requestedModality: 'delivery',
    customerNote: 'Llamar antes de llegar.',
    deliveryAddress: 'Calle 10 # 20-30',
    deliveryReference: 'Portería torre B',
  });

  const updatedCart = cartStore.getBusinessCart();

  assert.equal(updatedCart?.lines[0]?.quantity, 4);
  assert.equal(
    updatedCart?.lines[0]?.lineComment,
    'Por favor empacar con cuidado.',
  );
  assert.equal(
    updatedCart?.requestedModality,
    'delivery',
  );
  assert.equal(
    updatedCart?.customerNote,
    'Llamar antes de llegar.',
  );
  assert.equal(
    updatedCart?.deliveryAddress,
    'Calle 10 # 20-30',
  );
  assert.equal(
    updatedCart?.deliveryReference,
    'Portería torre B',
  );

  await flushPersistence();

  const persistedUserOne = memory.get(
    'beeapp.buddyservices.cart.v1.user-1',
  );

  assert.ok(persistedUserOne);
  assert.equal(
    persistedUserOne?.includes('private_instructions'),
    false,
  );
  assert.equal(
    persistedUserOne?.includes('payment_proof'),
    false,
  );
  assert.equal(
    persistedUserOne?.includes('signed_url'),
    false,
  );

  cartStore.setBusinessCartActiveUser('user-2');

  assert.equal(cartStore.getBusinessCart(), null);

  const hydratedUserTwo = await cartStore.hydrateBusinessCart(
    'user-2',
  );

  assert.equal(hydratedUserTwo, null);

  const hydratedUserOne = await cartStore.hydrateBusinessCart(
    'user-1',
  );

  assert.equal(
    hydratedUserOne?.commercialProfileId,
    'business-b',
  );
  assert.equal(hydratedUserOne?.lines[0]?.quantity, 4);

  cartStore.removeBusinessCartLine(
    hydratedUserOne?.lines[0]?.id || '',
  );

  assert.equal(cartStore.getBusinessCart(), null);

  console.log(
    'OK: Todas las pruebas de businessCartStore pasaron.',
  );
}

void run().catch((error: unknown) => {
  console.error(
    'ERROR: Falló una prueba de businessCartStore.',
  );
  console.error(error);
  process.exitCode = 1;
});
