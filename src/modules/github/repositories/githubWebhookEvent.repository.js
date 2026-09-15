import { eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { githubWebhookEvents } from "../../../db/schema/githubWebhookEvents.schema.js";

class GithubWebhookEventRepository {
  /**
   * Find webhook event record by GitHub delivery GUID.
   */
  async findByDeliveryId(deliveryId, database = db) {
    const [record] = await database
      .select()
      .from(githubWebhookEvents)
      .where(eq(githubWebhookEvents.deliveryId, deliveryId))
      .limit(1);

    return record || null;
  }

  /**
   * Record a new webhook delivery.
   */
  async create(data, database = db) {
    const [record] = await database
      .insert(githubWebhookEvents)
      .values({
        deliveryId: data.deliveryId,
        event: data.event,
        processed: data.processed ?? false,
      })
      .returning();

    return record;
  }

  /**
   * Mark a delivery as processed.
   */
  async markProcessed(deliveryId, database = db) {
    const [record] = await database
      .update(githubWebhookEvents)
      .set({
        processed: true,
        processedAt: new Date(),
      })
      .where(eq(githubWebhookEvents.deliveryId, deliveryId))
      .returning();

    return record || null;
  }
}

export default new GithubWebhookEventRepository();
