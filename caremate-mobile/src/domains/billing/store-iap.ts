import { Platform } from 'react-native';
import {
  fetchProducts,
  finishTransaction,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
  type ProductSubscription,
} from 'expo-iap';

import { allStoreProductIds, storeProductId } from '@/domains/billing/iap-products';
import type { BillingInterval, PlanType } from '@/domains/billing/types';

export type StoreProduct = {
  id: string;
  displayPrice: string;
};

let connectionReady = false;

async function ensureConnection(): Promise<void> {
  if (connectionReady) return;
  await initConnection();
  connectionReady = true;
}

export async function listStoreProducts(): Promise<StoreProduct[]> {
  await ensureConnection();
  const products = await fetchProducts({ skus: allStoreProductIds(), type: 'subs' });
  return (products ?? [])
    .filter((product): product is ProductSubscription => product.type === 'subs')
    .map((product) => ({
      id: product.id,
      displayPrice: product.displayPrice,
    }));
}

function androidOfferToken(product: ProductSubscription | undefined, sku: string): string | null {
  if (!product || product.platform !== 'android') return null;
  const offers = product.subscriptionOffers ?? [];
  const match = offers.find((offer) => offer.offerTokenAndroid) ?? offers[0];
  return match?.offerTokenAndroid ?? null;
}

export async function purchaseStoreProduct(input: {
  planType: PlanType;
  billingInterval: BillingInterval;
}): Promise<Purchase> {
  await ensureConnection();
  const sku = storeProductId(input.planType, input.billingInterval);
  const products = await fetchProducts({ skus: [sku], type: 'subs' });
  const product = (products ?? []).find((item) => item.id === sku) as
    ProductSubscription | undefined;
  const offerToken = androidOfferToken(product, sku);

  return new Promise<Purchase>((resolve, reject) => {
    const updated = purchaseUpdatedListener((purchase) => {
      if (purchase.productId !== sku && purchase.id !== sku) {
        return;
      }
      updated.remove();
      errored.remove();
      resolve(purchase);
    });
    const errored = purchaseErrorListener((error) => {
      updated.remove();
      errored.remove();
      reject(new Error(error.message || 'Store purchase was cancelled'));
    });

    void requestPurchase({
      request: {
        apple: { sku },
        google: {
          skus: [sku],
          subscriptionOffers: offerToken ? [{ sku, offerToken }] : [],
        },
      },
      type: 'subs',
    }).catch((error: unknown) => {
      updated.remove();
      errored.remove();
      reject(error instanceof Error ? error : new Error('Could not start store purchase'));
    });
  });
}

export async function finishStorePurchase(purchase: Purchase): Promise<void> {
  await finishTransaction({ purchase, isConsumable: false });
}

export function purchasePlatform(_purchase: Purchase): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export function purchaseTransactionId(purchase: Purchase): string {
  if ('transactionId' in purchase && purchase.transactionId) {
    return String(purchase.transactionId);
  }
  return purchase.id;
}
