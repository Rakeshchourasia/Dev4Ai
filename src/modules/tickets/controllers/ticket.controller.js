import ticketService from "../services/ticket.service.js";

class TicketController {
  // ==========================================
  // CREATE TICKET
  // ==========================================

  async create(req, res, next) {
    try {
      const ticket =
        await ticketService.create(
          req.body,
          req.user
        );

      return res.status(201).json({
        success: true,
        message: "Ticket created successfully",
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GET TICKETS BY SPRINT
  // ==========================================

  async getAllBySprint(
    req,
    res,
    next
  ) {
    try {
      const { sprintId } =
        req.params;

      const result =
        await ticketService.getAllBySprint(
          sprintId,
          req.query,
          req.user
        );

      return res.status(200).json({
        success: true,
        message: "Tickets fetched successfully",
        data: result.tickets,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GET TICKETS BY SQUAD
  // ==========================================

  async getAllBySquad(
    req,
    res,
    next
  ) {
    try {
      const { squadId } =
        req.params;

      const result =
        await ticketService.getAllBySquad(
          squadId,
          req.query,
          req.user
        );

      return res.status(200).json({
        success: true,
        message: "Tickets fetched successfully",
        data: result.tickets,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GET TICKET BY ID
  // ==========================================

  async getById(
    req,
    res,
    next
  ) {
    try {
      const ticket =
        await ticketService.getById(
          req.params.id,
          req.user
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

  // ==========================================
  // UPDATE TICKET
  // ==========================================

  async update(
    req,
    res,
    next
  ) {
    try {
      const ticket =
        await ticketService.update(
          req.params.id,
          req.body,
          req.user
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

  // ==========================================
  // DELETE TICKET
  // ==========================================

  async delete(
    req,
    res,
    next
  ) {
    try {
      const result =
        await ticketService.delete(
          req.params.id,
          req.user
        );

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
  async updateStatus(
  req,
  res,
  next
) {
  try {
    const ticket =
      await ticketService.updateStatus(
        req.params.id,
        req.body.status,
        req.user
      );

    return res.status(200).json({
      success: true,
      message: "Ticket status updated successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}
}

export default new TicketController();