-- CreateTable
CREATE TABLE "HookSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "lowStockEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "readyToShipEnabled" BOOLEAN NOT NULL DEFAULT true,
    "saleCountdownEnabled" BOOLEAN NOT NULL DEFAULT false,
    "saleEndsAt" DATETIME,
    "saleMessage" TEXT NOT NULL DEFAULT 'Sale ends in',
    "freeShippingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "freeShippingMessage" TEXT NOT NULL DEFAULT 'Free shipping today',
    "soldRecentlyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sellingFastEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sellingFastThreshold" INTEGER NOT NULL DEFAULT 10,
    "recentPurchaseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recentPurchaseDemoMode" BOOLEAN NOT NULL DEFAULT false,
    "viewerCountEnabled" BOOLEAN NOT NULL DEFAULT false,
    "wishlistCountEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "HookSettings_shop_key" ON "HookSettings"("shop");

-- CreateIndex
CREATE INDEX "OrderEvent_shop_productId_occurredAt_idx" ON "OrderEvent"("shop", "productId", "occurredAt");

-- CreateIndex
CREATE INDEX "OrderEvent_shop_occurredAt_idx" ON "OrderEvent"("shop", "occurredAt");
