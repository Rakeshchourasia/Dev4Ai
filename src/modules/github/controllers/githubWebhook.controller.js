import githubWebhookService from "../services/githubWebhook.service.js";

class GithubWebhookController {
  // ==========================================
  // POST /github/webhooks
  // ==========================================
  async handleWebhook(req, res, next) {
    try {
      const deliveryId = req.headers["x-github-delivery"];
      const event = req.headers["x-github-event"];
      const payload = req.body;

      const result = await githubWebhookService.processWebhook({
        deliveryId,
        event,
        payload,
      });

      return res.status(200).json({
        success: true,
        message: result.message || "Webhook processed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new GithubWebhookController();
