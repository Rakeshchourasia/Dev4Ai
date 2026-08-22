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

async getAllBySprint(sprintId, query) {
  const sprint =
    await sprintRepository.findById(sprintId);

  if (!sprint) {
    throw new AppError(
      "Sprint not found",
      404
    );
  }

  const {
    page,
    limit,
    offset,
  } = getPagination(query);

  const status = query.status;
  const priority = query.priority;

  const tickets =
    await ticketRepository.findAllBySprintId(
      sprintId,
      {
        limit,
        offset,
        status,
        priority,
      }
    );

  const total =
    await ticketRepository.countBySprintId(
      sprintId,
      {
        status,
        priority,
      }
    );

  return {
    tickets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(
        total / limit
      ),
    },
  };
}

async getAllBySquad(req, res, next) {
  try {
    const { squadId } = req.params;

    const result =
      await ticketService.getAllBySquad(
        squadId,
        req.query
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