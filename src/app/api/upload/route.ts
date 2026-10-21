import { NextResponse, type NextRequest } from "next/server";
import {
  ImageStorageService,
  STORAGE_BUCKETS,
  hasValidImageSignature,
} from "@/lib/services/image-storage-service";
import { OrderService } from "@/lib/services/order-service";
import { getVerifiedUser } from "@/lib/auth-request";
import { verifyReviewToken } from "@/lib/services/review-token-service";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
];

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB maximum image ceiling
export async function POST(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || STORAGE_BUCKETS.AVATARS;
    const requestedEntityId = (formData.get("entityId") as string) || "";
    const subType = (formData.get("subType") as string) || "";
    const token = (formData.get("token") as string) || "";

    const verifiedToken = bucket === STORAGE_BUCKETS.REVIEW_PHOTOS ? verifyReviewToken(token) : { valid: false };
    const isTokenAuthorized = Boolean(verifiedToken.valid && (verifiedToken.orderNumber === requestedEntityId || verifiedToken.orderId === requestedEntityId));

    if (!verified && !isTokenAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in or use your review link to upload." },
        { status: 401 }
      );
    }
    const user = verified?.user;

    if (![STORAGE_BUCKETS.AVATARS, STORAGE_BUCKETS.ORDER_PROOFS, STORAGE_BUCKETS.REVIEW_PHOTOS].includes(bucket as typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS])) {
      return NextResponse.json({ success: false, error: "Invalid upload destination." }, { status: 400 });
    }

    if (bucket === STORAGE_BUCKETS.ORDER_PROOFS && user?.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Order proofs can only be uploaded by operations staff." },
        { status: 403 }
      );
    }

    let entityId = user?.id || `customer-${requestedEntityId}`;
    if (bucket !== STORAGE_BUCKETS.AVATARS) {
      if (!requestedEntityId) {
        return NextResponse.json({ success: false, error: "An order is required for this upload." }, { status: 400 });
      }
      const order = await OrderService.getOrderByNumber(requestedEntityId);
      if (!order) return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
      if (bucket === STORAGE_BUCKETS.REVIEW_PHOTOS) {
        if (!isTokenAuthorized && order.user_id !== user?.id) {
          return NextResponse.json({ success: false, error: "Review photos are only allowed for your completed orders." }, { status: 403 });
        }
        if (order.order_status !== "completed") {
          return NextResponse.json({ success: false, error: "Review photos are only allowed for completed orders." }, { status: 403 });
        }
        const photoIndex = Number(subType);
        if (!Number.isInteger(photoIndex) || photoIndex < 1 || photoIndex > 3) {
          return NextResponse.json({ success: false, error: "Photo number must be between 1 and 3." }, { status: 400 });
        }
      } else if (user?.role !== "admin") {
        return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
      }
      entityId = order.id;
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid image file." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Only JPEG, PNG, and WebP raster images are accepted.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "File size exceeds the 5MB ceiling. Please select a smaller photo or compress it.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const normalizedMime = file.type === "image/jpg" ? "image/jpeg" : file.type;
    if (!hasValidImageSignature(buffer, normalizedMime)) {
      return NextResponse.json({ success: false, error: "The uploaded file is not a valid JPEG, PNG, or WebP image." }, { status: 400 });
    }

    let result;

    if (bucket === STORAGE_BUCKETS.REVIEW_PHOTOS) {
      const photoIdx = parseInt(subType, 10) || 1;
      result = await ImageStorageService.uploadReviewPhoto(
        entityId,
        photoIdx,
        buffer,
        normalizedMime
      );
    } else if (bucket === STORAGE_BUCKETS.ORDER_PROOFS) {
      const proofType = (subType as "pickup" | "dropoff" | "damage") || "pickup";
      result = await ImageStorageService.uploadOrderProof(
        entityId,
        proofType,
        buffer,
        normalizedMime
      );
    } else {
      result = await ImageStorageService.uploadAvatar(
        entityId,
        buffer,
        normalizedMime
      );
    }

    if (!result.success || !result.url) {
      console.error("[upload] Storage upload failed:", result.error);
      return NextResponse.json(
        { success: false, error: "Unable to store the uploaded image." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        url: result.url,
        message: "Asset successfully stored.",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to process image upload.";
    console.error("Image upload API exception:", errorMsg);
    return NextResponse.json(
      { success: false, error: "Failed to process image upload." },
      { status: 500 }
    );
  }
}
