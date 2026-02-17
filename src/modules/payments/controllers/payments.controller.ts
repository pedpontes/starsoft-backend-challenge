import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ConfirmPaymentDto } from '../dtos/confirm-payment.dto';
import { SalePaginationRequestDto } from '../dtos/sale-pagination-request.dto';
import { ConfirmPaymentService } from '../services/confirm-payment/confirm-payment.service';
import { LoadPurchaseHistoryService } from '../services/load-purchase-history/load-purchase-history.service';
import { SalePaginationOrderBy } from '../types/sales.pagination';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly confirmPaymentService: ConfirmPaymentService,
    private readonly loadPurchaseHistoryService: LoadPurchaseHistoryService,
  ) {}

  @Post('confirm')
  async confirm(@Body() dto: ConfirmPaymentDto) {
    const sale = await this.confirmPaymentService.confirmPayment(dto);
    return {
      id: sale.id,
      reservationId: sale.reservationId,
      totalAmount: sale.totalAmount,
      createdAt: sale.createdAt,
    };
  }

  @Get('users/:id/sales')
  @ApiOperation({ summary: 'Histórico de compras do usuário (paginado)' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: '3e0c6c21-64fb-4cf9-8fdb-60edc3f35c70',
    description: 'ID do usuário.',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: true,
    example: 1,
    description: 'Número da página (1-based).',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: true,
    example: 10,
    description: 'Quantidade de itens por página.',
  })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    enum: SalePaginationOrderBy,
    example: SalePaginationOrderBy.CreatedAtDesc,
    description: 'Ordenação. Use "-" para desc.',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    description:
      'Filtros. Envie como deep object: filters[sessionId]=...&filters[from]=...',
    style: 'deepObject',
    explode: true,
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', format: 'uuid' },
        from: { type: 'string', format: 'date-time' },
        to: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Histórico de compras paginado.',
    schema: {
      example: {
        userId: '3e0c6c21-64fb-4cf9-8fdb-60edc3f35c70',
        sales: {
          data: [
            {
              id: 'e8a5e0b9-1c57-4d69-a2c0-9e3d3aa0d5f1',
              sessionId: '7c2b0f0a-2e48-4f9d-b5f5-6b8f2a2e7a0f',
              userId: '3e0c6c21-64fb-4cf9-8fdb-60edc3f35c70',
              reservationId: '1c0dcbfd-1f6d-4fd6-8f18-1d2aa5d1d0b7',
              totalAmount: '50.00',
              createdAt: '2026-02-20T19:01:00.000Z',
            },
          ],
          page: 1,
          limit: 10,
          count: { total: 20 },
        },
      },
    },
  })
  async loadUserSales(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() pagination: SalePaginationRequestDto,
  ) {
    const sales = await this.loadPurchaseHistoryService.loadPurchaseHistory(
      id,
      pagination,
    );
    return { userId: id, sales };
  }
}
