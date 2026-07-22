-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('NOT_APPLIED', 'PHASE1_PENDING', 'PHASE1_APPROVED', 'PHASE2_PENDING', 'PHASE2_APPROVED', 'PHASE3_PENDING', 'ACTIVE', 'REJECTED');

-- CreateEnum
CREATE TYPE "ServiceWorkType" AS ENUM ('UUDET', 'POISTO', 'HUOLTO', 'EI_LISAKKEITA', 'LYHYET', 'KESKIPITKAT', 'PITKAT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "providerStatus" "ProviderStatus" NOT NULL DEFAULT 'NOT_APPLIED',
    "pushToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saloons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT,
    "shortIntro" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saloons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saloon_images" (
    "id" TEXT NOT NULL,
    "saloonId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saloon_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "saloonId" TEXT,
    "name" TEXT NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saloon_services" (
    "saloonId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "availableDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saloon_services_pkey" PRIMARY KEY ("saloonId","serviceId")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workTypes" "ServiceWorkType"[] DEFAULT ARRAY[]::"ServiceWorkType"[],
    "categoryId" TEXT NOT NULL,
    "parentServiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "saloonId" TEXT NOT NULL,
    "bookingTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "paymentMethod" TEXT NOT NULL DEFAULT 'pay_at_venue',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "notes" TEXT,
    "totalAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saloon_reviews" (
    "id" TEXT NOT NULL,
    "saloonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saloon_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "neighbourhood" TEXT,
    "address" TEXT,
    "serviceCategories" TEXT[],
    "legalName" TEXT,
    "dateOfBirth" TEXT,
    "finnishId" TEXT,
    "nationality" TEXT,
    "businessName" TEXT,
    "yTunnus" TEXT,
    "businessType" TEXT,
    "bankAccountName" TEXT,
    "iban" TEXT,
    "qualificationDocs" TEXT[],
    "documentUrls" TEXT[],
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3),
    "stripeConnected" BOOLEAN NOT NULL DEFAULT false,
    "adminNotes" TEXT,
    "rejectedReason" TEXT,
    "currentPhase" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saloon_time_slots" (
    "id" TEXT NOT NULL,
    "saloonId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "breakTimeMinutes" INTEGER NOT NULL DEFAULT 15,
    "maxBookingsPerSlot" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saloon_time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "saloons_userId_idx" ON "saloons"("userId");

-- CreateIndex
CREATE INDEX "saloon_images_saloonId_idx" ON "saloon_images"("saloonId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_saloonId_name_key" ON "categories"("saloonId", "name");

-- CreateIndex
CREATE INDEX "bookings_saloonId_idx" ON "bookings"("saloonId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_bookingTime_idx" ON "bookings"("bookingTime");

-- CreateIndex
CREATE INDEX "bookings_paymentMethod_idx" ON "bookings"("paymentMethod");

-- CreateIndex
CREATE INDEX "saloon_reviews_saloonId_idx" ON "saloon_reviews"("saloonId");

-- CreateIndex
CREATE INDEX "saloon_reviews_userId_idx" ON "saloon_reviews"("userId");

-- CreateIndex
CREATE INDEX "saloon_reviews_bookingId_idx" ON "saloon_reviews"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_applications_userId_key" ON "provider_applications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "saloon_time_slots_saloonId_dayOfWeek_key" ON "saloon_time_slots"("saloonId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "saloons" ADD CONSTRAINT "saloons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saloon_images" ADD CONSTRAINT "saloon_images_saloonId_fkey" FOREIGN KEY ("saloonId") REFERENCES "saloons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_saloonId_fkey" FOREIGN KEY ("saloonId") REFERENCES "saloons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saloon_services" ADD CONSTRAINT "saloon_services_saloonId_fkey" FOREIGN KEY ("saloonId") REFERENCES "saloons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saloon_services" ADD CONSTRAINT "saloon_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_parentServiceId_fkey" FOREIGN KEY ("parentServiceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_saloonId_fkey" FOREIGN KEY ("saloonId") REFERENCES "saloons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saloon_reviews" ADD CONSTRAINT "saloon_reviews_saloonId_fkey" FOREIGN KEY ("saloonId") REFERENCES "saloons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saloon_reviews" ADD CONSTRAINT "saloon_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_applications" ADD CONSTRAINT "provider_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saloon_time_slots" ADD CONSTRAINT "saloon_time_slots_saloonId_fkey" FOREIGN KEY ("saloonId") REFERENCES "saloons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

