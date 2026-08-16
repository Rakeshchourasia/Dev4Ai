import ticketService from "../services/ticket.service.js";

class TicketController {
  async create(req, res, next) {
    try {
      const ticket = await ticketService.create(req.body);

      return res.status(201).json({
        success: true,
        message: "Ticket created successfully",
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllBySprint(req, res, next) {
    try {
      const { sprintId } = req.params;

      const tickets = await ticketService.getAllBySprint(
        sprintId
      );

      return res.status(200).json({
        success: true,
        message: "Tickets fetched successfully",
        data: tickets,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllBySquad(req, res, next) {
    try {
      const { squadId } = req.params;

      const tickets = await ticketService.getAllBySquad(
        squadId
      );

      return res.status(200).json({
        success: true,
        message: "Tickets fetched successfully",
        data: tickets,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const ticket = await ticketService.getById(
        req.params.id
      );

      return res.status(200).json({
        success: true,
        message: "Ticket fetched successfully",
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const ticket = await ticketService.update(
        req.params.id,
        req.body
      );

      return res.status(200).json({
        success: true,
        message: "Ticket updated successfully",
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await ticketService.delete(
        req.params.id
      );

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TicketController();